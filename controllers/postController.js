const asyncHandler = require('express-async-handler');
const Post = require('../models/postModel');
const User = require('../models/userModel');

// --- POSTS ---

// Create a new post
const createPost = asyncHandler(async (req, res) => {
    const { content, imageUrl, visibility } = req.body;
    if (!content && !imageUrl) {
        res.status(400);
        throw new Error('Post must have content or an image.');
    }
    const post = await Post.create({
        content,
        imageUrl,
        visibility,
        author: req.user.id,
    });

    const createdPost = await Post.findById(post._id);
    res.status(201).json(createdPost);
});

// Get all posts based on visibility
const getAllPosts = asyncHandler(async (req, res) => {
    let query = { visibility: 'public' };
    if (req.user) {
        query = {
            $or: [{ visibility: 'public' }, { author: req.user.id }],
        };
    }
    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.status(200).json(posts);
});


// Update post visibility
const updatePostVisibility = asyncHandler(async (req, res) => {
    const { visibility } = req.body;
    if (!['public', 'private'].includes(visibility)) {
        res.status(400);
        throw new Error('Invalid visibility value.');
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
        res.status(404);
        throw new Error('Post not found');
    }
    // Check if the logged-in user is the author
    if (post.author._id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }
    post.visibility = visibility;
    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
});


//  Delete a post
const deletePost = asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        res.status(404);
        throw new Error('Post not found');
    }
    if (post.author._id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }
    await post.remove();
    res.status(200).json({ id: req.params.id });
});

// Like or unlike a post
const likePost = asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        res.status(404);
        throw new Error('Post not found');
    }
    const isLiked = post.likes.includes(req.user.id);
    if (isLiked) {
        post.likes.pull(req.user.id);
    } else {
        post.likes.push(req.user.id);
    }
    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
});

// --- COMMENTS ---

// Add a comment to a post
const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content) {
        res.status(400);
        throw new Error('Comment content is required');
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
        res.status(404);
        throw new Error('Post not found');
    }
    const newComment = {
        content,
        author: req.user.id,
    };
    post.comments.unshift(newComment);
    const updatedPost = await post.save();

    const populatedPost = await Post.findById(updatedPost._id);
    res.status(201).json(populatedPost);
});

module.exports = {
    createPost,
    getAllPosts,
    updatePostVisibility,
    deletePost,
    likePost,
    addComment,
};