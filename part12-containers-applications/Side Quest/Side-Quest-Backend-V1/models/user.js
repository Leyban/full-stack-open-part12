const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 4,
  },
  email: {
    type: String,
  },
  name: {
		type: String,
		required: true,
		minlength: 4
  },
  passwordHash: {
		type: String,
		required: true,
  },
  ongoing: [
    {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Task',
    }
  ],
  tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
		    ref: 'Tag',
      }
  ]
});

module.exports = mongoose.model('User', schema);