const express = require('express');
const router = express.Router();
const {
    createPost,
    getAllPosts,
    updatePostVisibility,
    deletePost,
    likePost,
    addComment,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

// Middleware to allow optional authentication
const optionalAuth = (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return protect(req, res, next);
    }
    next();
};

// --- Route Definitions ---

router.route('/')
    .post(protect, createPost)
    .get(optionalAuth, getAllPosts);

router.route('/:id')
    .delete(protect, deletePost);

router.route('/:id/visibility')
    .put(protect, updatePostVisibility);

router.route('/:id/like')
    .put(protect, likePost);

router.route('/:id/comments')
    .post(protect, addComment);

module.exports = router;