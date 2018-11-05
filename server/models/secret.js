const mongoose = require('mongoose');
const { Schema } = mongoose;

// Secrets schema
// secrets are messages to which comments can be applied
const SecretSchema = new mongoose.Schema({
    author_id: {
        type: String,
        required: [true, "User must have a name"]
    },
    content: {
        type: String,
        required: [true, "Message must have content"]
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    // comments: [CommentSchema]
}, {timestamps: true});

// mongoose.model('Secret', SecretSchema);  // We are setting this Schema in our Models as 'Secret'
module.exports = mongoose.model('Secret');