const mongoose = require('mongoose');
const { Schema } = mongoose;

// Comment schema
// comments will be attached to individual secrets/messages
const CommentSchema = new mongoose.Schema({
    author_id: {
        type: String,
        required: [true, "User must have a name"]
    },
    content: {
        type: String,
        required: [true, "Comment must have content"]
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    secrets: {
        type: Schema.Types.ObjectId,
        ref: 'Secret'
    },
}, {timestamps: true});

mongoose.model('Comment', CommentSchema);  // We are setting this Schema in our Models as 'Comment'
module.exports = mongoose.model('Comment');