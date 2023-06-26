const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false
  },
  completed: {
      type: Boolean,
      default: false
  },
  supertask: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }
  ],
  root: {
		type: Boolean,
		default: false
  },
  subtasks: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Task',
		}
	],
  scheduled: {
		type: Boolean,
		default: false
  },
  schedule: {
		category: {
			type: String,
			default: 'hourly',
		},
		start: String,
		end: {
      active: {
        type: Boolean,
        default: false
      },
      date: String
    },
		reset: {
      active: {
        type: Boolean,
        default: false
      },
      date: String
    },
  },
  tag: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
});

module.exports = mongoose.model('Task', schema);