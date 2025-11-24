const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for replies to comments
const replySchema = new Schema(
    {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

// Schema for comments on posts
const commentSchema = new Schema(
    {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        replies: [replySchema],
    },
    { timestamps: true }
);

// Main schema for posts
const postSchema = new Schema(
    {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, trim: true },
        imageUrl: { type: String },
        visibility: {
            type: String,
            enum: ['public', 'private'],
            default: 'public',
        },
        likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        comments: [commentSchema],
    },
    { timestamps: true }
);

// --- THIS IS THE CORRECTED FUNCTION ---.
const autoPopulateDetails = function () {
    this.populate('author', 'firstName lastName profilePicture');
    this.populate({
        path: 'comments',
        populate: [
            {
                path: 'author',
                select: 'firstName lastName profilePicture',
            },
            {
                path: 'replies.author',
                select: 'firstName lastName profilePicture',
            }
        ],
    });
};

postSchema.pre('findOne', autoPopulateDetails);
postSchema.pre('find', autoPopulateDetails);

module.exports = mongoose.model('Post', postSchema);