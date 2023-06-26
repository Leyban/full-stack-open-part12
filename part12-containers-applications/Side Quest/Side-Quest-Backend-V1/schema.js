const { gql } = require('apollo-server')

const typeDefs = gql`
    type Tag {
        name: String!
        color: String!
        favorite: Boolean!
        id: ID!
    }

    type User {
        username: String!
        name: String!
        email: String!
        id: ID!
        tags: [ID!]
        ongoing: [ID!]
    }
    
    type Token {
        value: String!
    }

    type Deadline {
        active: Boolean
        date: String
    }

    type Schedule {
        category: String!
        start: String
        end: Deadline
        reset: Deadline
    }

    type Task {
        id:ID!
        title: String!
        description: String
        completed: Boolean!
        supertask: [ID!]
        root: Boolean!
        subtasks: [Task!]
        scheduled: Boolean!
        schedule: Schedule!
        tag: ID
    }

    type SavedTask {
        id: ID
        title: String!
        description: String!
        completed: Boolean!
        supertask: [ID!]
        root: Boolean!
        subtasks: [SavedTask!]
        scheduled: Boolean!
        schedule: Schedule!
        tag: ID
    }

    input DeadlineInput {
        active: Boolean
        date: String
    }

    input ScheduleInput {
        category: String!
        start: String
        end: DeadlineInput
        reset: DeadlineInput
    }

    type Query {
        allTasks(tag: String): [Task!]
        allRootTasks(tag: String): [Task!]
        taskTree(id: ID): Task
        orphanSavedTasks: [SavedTask!]
        savedTaskTree: SavedTask
        allTags: [Tag!]
        me: User
    }

    type Mutation {
        createUser(username: String!, password: String!, name: String!, email: String!): User
        login(username: String!, password: String!): Token
        newTask(
                id: ID
                root: Boolean, 
                supertask: [ID],
                title: String!, 
                description: String,
                scheduled: Boolean!,
                schedule: ScheduleInput,
                tag: ID
            ): Task
        updateTask(
                id: ID!,
                completed: Boolean,
                title: String,
                description: String,
                scheduled: Boolean,
                schedule: ScheduleInput,
                tag: ID
            ): Task
        saveTask(id:ID!): SavedTask
        deleteSavedTask(id:ID!): String
        materializeTask(id:ID!): Task
        appendTask(savedTaskId:ID!, taskId:ID!): Task
        deleteTask(id:ID!): String
        createTag(name:String!, color:String!, favorite:Boolean, author:ID): Tag!
        editTag(name:String, color:String, favorite:Boolean, id:ID): Tag!
        deleteTag(id:ID!): String
        addOngoing(id:String!): String
        removeOngoing(id:String!): String
    }

    type Subscription {
        taskEdited: Task!
    }
`

module.exports = typeDefs
