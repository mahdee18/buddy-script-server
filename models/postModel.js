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

// This ensures that when we fetch a post, the author details are populated
const autoPopulateAuthor = function (next) {
    this.populate('author', 'firstName lastName profilePicture');
    this.populate({
        path: 'comments',
        populate: {
            path: 'author',
            select: 'firstName lastName profilePicture',
        },
    });
    next();
};

postSchema.pre('findOne', autoPopulateAuthor);
postSchema.pre('find', autoPopulateAuthor);

module.exports = mongoose.model('Post', postSchema);