const SavedTask = require('./models/savedTask')
const Task = require('./models/task')
const User = require('./models/user')
const Tag = require('./models/tag')

const { UserInputError, AuthenticationError } = require('apollo-server')

// token authorization
require('dotenv').config()
const SECRET = process.env.SECRET
const jwt = require('jsonwebtoken')

// password encryption
const bcrypt = require('bcrypt')

// recursive saving 
const saveTask = (task, model, userId, supertaskList = []) => {
    const taskToSave = new model({
        title: task.title,
        description: task.description,
        root: task.root,
        subtasks: [],
        supertask: supertaskList,
        scheduled: task.scheduled,
        schedule: task.schedule,
        tag: '',
        author: userId
    })
    return taskToSave.save()
}
const saveSubtasks = async (fromTask, toTask, toModel, userId) => {
    await fromTask.populate('subtasks')
    for(const subtask of fromTask.subtasks){
        const savedSubtask = await saveTask(subtask, toModel, userId, toTask.supertask.concat(toTask.id))
        toTask.subtasks = toTask.subtasks.concat(savedSubtask.id)
        await saveSubtasks(subtask, savedSubtask, toModel, userId)
    }
    return toTask.save()
}


// GRAPHQL RESOLVERS
const resolvers = {
    Task: {
        subtasks: async (root, args, {currentUser}) => {
            await root.populate('subtasks')
            return root.subtasks
        },
    },
    SavedTask: {
        subtasks: async (root, args, {currentUser}) => {
            await root.populate('subtasks')
            return root.subtasks
        },
    },
    Query: {
        allTasks: async (root, args, {currentUser}) => {
            if (!args.tag) {
                return Task.find({author:currentUser.id})
            }
            return Task.find({author:currentUser.id, tag:args.tag})
        },
        allRootTasks: async (root, args, {currentUser}) => {
            if (!args.tag) {
                return Task.find({author:currentUser.id, root:true})
            }
            return Task.find({author:currentUser.id, tag:args.tag, root:true})
        },
        taskTree: async (root, args, {currentUser}) => {
            const rootTask = await Task.findOne({_id:args.id})
            return rootTask 
        },
        orphanSavedTasks: async (root, args, {currentUser}) => {
            return SavedTask.find({author:currentUser.id, supertask:{ $in: [null, []] }})
        },
        allTags: async (root,args,{currentUser}) => Tag.find({author: currentUser.id}),
        me: (root, args, {currentUser}) => currentUser
    },
    Mutation: {
        createUser: async (root, args) => {
            const saltRounds = 10
            const passwordHash = await bcrypt.hash(args.password, saltRounds)
            const { username, email, name } = args
            const newUser = new User({
                username,
                email,
                name,
                passwordHash,
                tags:[]
            })
            try {
                const savedUser = await newUser.save()
                return savedUser
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        login: async (root, args) => {
            try {
                const user = await User.findOne({ username: args.username })
                const passwordCorrect = user === null
                    ? false
                    : await bcrypt.compare(args.password, user.passwordHash)
                if (!(user && passwordCorrect)) {
                    throw new UserInputError('incorrect username or password')
                }

                const userForToken = {
                    username: user.username,
                    id: user._id,
                }
    
                const token = jwt.sign(userForToken, SECRET)
                return {value: token}
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        newTask: async (root, args, {currentUser}) => {
            // saving to mongodb
            const newTask = new Task({...args, author: currentUser.id})
            try {
                const savedTask = await newTask.save()
                
                // appending to supertask if current task is a subtask
                if (!args.root) {
                    const parentTask = await Task.findOne({ _id: args.supertask[args.supertask.length-1] })
                    parentTask.subtasks = parentTask.subtasks.concat(savedTask._id)
                    await parentTask.save()

                // adding task to ongoing list if task is a root task
                } else {
                    const user = currentUser
                    user.ongoing = user.ongoing.concat(savedTask.id)
                    user.save()
                }

                return savedTask
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            } 
        },
        updateTask: async (root, args, {currentUser}) => {
            const taskToUpdate = await Task.findOne({_id: args.id})
            Object.entries(args).forEach(property => {
                taskToUpdate[property[0]] = property[1]
            })
            try {
                const updatedTask = await taskToUpdate.save()
                return updatedTask
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        saveTask: async (root, args, {currentUser}) => {
            try {
                const taskToSave = await Task.findOne({_id: args.id})
                const savedTask = await saveTask(taskToSave, SavedTask, currentUser.id)
                const finalSavedTask = await saveSubtasks(taskToSave, savedTask, SavedTask, currentUser.id)
                return finalSavedTask
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        deleteSavedTask: async (root, args, {currentUser}) => {
            try {
                await SavedTask.deleteMany({supertask: {
                    $in: [args.id]
                }})
                await SavedTask.deleteOne({_id: args.id})
                return 'Task Deleted'
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        materializeTask: async (root, args, {currentUser}) => {
            try {
                const taskToMaterialize = await SavedTask.findOne({_id: args.id})
                const materializedTask = await saveTask(taskToMaterialize, Task, currentUser.id)
                const finalMaterializedTask = await saveSubtasks(taskToMaterialize, materializedTask, Task, currentUser.id)
                return finalMaterializedTask
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        appendTask: async (root, args, {currentUser}) => {
            try {
                const taskToAppendTo = await Task.findOne({_id: args.taskId})
                const taskToMaterialize = await SavedTask.findOne({_id: args.savedTaskId})
                const materializedTask = await saveTask(taskToMaterialize, Task, currentUser.id, [args.taskId])
                taskToAppendTo.subtasks = taskToAppendTo.subtasks.concat(materializedTask.id)
                await taskToAppendTo.save()
                const finalMaterializedTask = await saveSubtasks(taskToMaterialize, materializedTask, Task, currentUser.id)
                return finalMaterializedTask
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        deleteTask: async (root, args, {currentUser}) => {
            try {
                await Task.deleteMany({supertask: {
                    $in: [args.id]
                }})
                currentUser.ongoing = currentUser.ongoing.filter(ongoingTask => String(ongoingTask) !== args.id)
                await currentUser.save()
                await Task.deleteOne({_id: args.id})
                return 'Task Deleted'
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        createTag: async (root, args, {currentUser}) => {
            const user = currentUser
            const newTag = new Tag({
                ...args,
                author: currentUser._id
            })
            
            try {
                await newTag.save()
                
                user.tags = user.tags.concat(newTag._id)
                await user.save()

                return newTag
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        editTag: async (root, args, {currentUser}) => {
            let tagToUpdate = await Tag.findById(args.id)
            
            tagToUpdate.name = args.name
            tagToUpdate.color = args.color
            tagToUpdate.favorite = args.favorite

            try {
                await tagToUpdate.save()
                return tagToUpdate
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        deleteTag: async (root, args, {currentUser}) => {
            const taggedTasks = await Task.find({tag: args.id})
            currentUser.tags = currentUser.tags.filter( tagId => String(tagId) !== String(args.id) )
            try {
                taggedTasks.map(task => task.tag = null)
                await taggedTasks.forEach(task => task.save())
                await currentUser.save()
                await Tag.deleteOne({ _id: args.id })
                return 'Task Deleted'
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        addOngoing: async (root, args, {currentUser}) => {
            const user = currentUser
            const updatedOngoing = user.ongoing.concat(args.id)
            
            try {
                await User.findOneAndUpdate({ id:currentUser.id }, { ongoing: updatedOngoing })
                return args.id
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        },
        removeOngoing: async (root, args, {currentUser}) => {
            const user = currentUser
            const updatedOngoing = user.ongoing.filter(id => String(id)!==String(args.id))

            try {
                await User.findOneAndUpdate({ id:currentUser.id }, { ongoing: updatedOngoing })
                return 'Task removed from ongoing list'
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
        }
    }
}


module.exports = resolvers