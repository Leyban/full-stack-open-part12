const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    name: String,
    color: String,
    favorite: Boolean,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
})

module.exports = mongoose.model('Tag', schema);