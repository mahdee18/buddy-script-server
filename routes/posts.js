const express = require('express');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); 
const { protect } = require('../middleware/authMiddleware');

function createPostRoutes(postsCollection, usersCollection) {
    const router = express.Router();

    router.post('/', protect(usersCollection), async (req, res) => {
        try {
            const { content, imageUrl } = req.body;
            if (!content && !imageUrl) { return res.status(400).json({ message: 'Post content or image is required.' }); }

            const newPost = { authorId: req.user._id, content, imageUrl: imageUrl || '', createdAt: new Date(), likes: [], comments: [], visibility: 'public' };
            const result = await postsCollection.insertOne(newPost);
            const createdPost = await postsCollection.findOne({ _id: result.insertedId });
            const responsePost = { ...createdPost, author: { _id: req.user._id, firstName: req.user.firstName, lastName: req.user.lastName, profilePicture: req.user.profilePicture } };
            res.status(201).json(responsePost);
        } catch (error) {
            console.error("!!! ERROR CREATING POST:", error);
            res.status(500).json({ message: 'Server error while creating post.' });
        }
    });

    router.get('/', async (req, res) => {
        try {
            let userId = null;
             if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = new ObjectId(decoded.id);
                } catch (e) {
                     userId = null;
                }
            }

            const query = userId 
                ? { $or: [{ visibility: 'public' }, { authorId: userId }] }
                : { visibility: 'public' };

            const posts = await postsCollection.aggregate([
                { $match: query }, 
                { $sort: { createdAt: -1 } },
                { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'author' } },
                { $unwind: '$author' },
                { $lookup: { from: 'users', localField: 'comments.authorId', foreignField: '_id', as: 'commentAuthors' }},
                { $lookup: { from: 'users', localField: 'comments.replies.authorId', foreignField: '_id', as: 'replyAuthors' }},
                { $addFields: { comments: { $map: { input: '$comments', as: 'comment', in: { $mergeObjects: [ '$$comment', { author: { $arrayElemAt: [ { $filter: { input: '$commentAuthors', as: 'ca', cond: { $eq: ['$$ca._id', '$$comment.authorId'] } } }, 0 ] } }, { replies: { $map: { input: '$$comment.replies', as: 'reply', in: { $mergeObjects: [ '$$reply', { author: { $arrayElemAt: [ { $filter: { input: '$replyAuthors', as: 'ra', cond: { $eq: ['$$ra._id', '$$reply.authorId'] } } }, 0 ] } } ] } } } } ] } } } } },
                { $project: { 'author.password': 0, 'commentAuthors': 0, 'replyAuthors': 0, 'comments.author.password': 0, 'comments.replies.author.password': 0 } }
            ]).toArray();
            res.status(200).json(posts);
        } catch (error) {
            console.error("!!! ERROR FETCHING POSTS:", error);
            res.status(500).json({ message: 'Server error fetching posts.' });
        }
    });
    
    router.put('/:id/visibility', protect(usersCollection), async (req, res) => {
        try {
            const { visibility } = req.body;
            if (!['public', 'private'].includes(visibility)) {
                return res.status(400).json({ message: 'Invalid visibility value.' });
            }
            const postId = new ObjectId(req.params.id);
            const post = await postsCollection.findOne({ _id: postId });
            if (!post) { return res.status(404).json({ message: 'Post not found' }); }
            if (post.authorId.toString() !== req.user._id.toString()) { return res.status(401).json({ message: 'User not authorized' }); }
            
            await postsCollection.updateOne({ _id: postId }, { $set: { visibility } });
            res.status(200).json({ message: 'Post visibility updated successfully' });
        } catch (error) {
            console.error("!!! ERROR UPDATING VISIBILITY:", error);
            res.status(500).json({ message: 'Server error while updating visibility.' });
        }
    });

    router.delete('/:id', protect(usersCollection), async (req, res) => {
        try {
            const postId = new ObjectId(req.params.id);
            const post = await postsCollection.findOne({ _id: postId });
            if (!post) { return res.status(404).json({ message: 'Post not found' }); }
            if (post.authorId.toString() !== req.user._id.toString()) { return res.status(401).json({ message: 'User not authorized' }); }
            await postsCollection.deleteOne({ _id: postId });
            res.status(200).json({ message: 'Post deleted successfully' });
        } catch (error) { res.status(500).json({ message: 'Server error while deleting post.' }); }
    });

    router.put('/:id/like', protect(usersCollection), async (req, res) => {
        try {
            const post = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
            if (!post) return res.status(404).json({ message: 'Post not found' });
            const isLiked = post.likes.some(likeId => likeId.equals(req.user._id));
            const updateOperation = isLiked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } };
            await postsCollection.updateOne({ _id: new ObjectId(req.params.id) }, updateOperation);
            // Return the full updated post for instant UI update
            const updatedPost = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
            res.status(200).json(updatedPost);
        } catch (error) { res.status(500).json({ message: 'Server error while liking post.' }); }
    });

    router.post('/:id/comments', protect(usersCollection), async (req, res) => {
        try {
            const { content } = req.body;
            if (!content) return res.status(400).json({ message: 'Comment content cannot be empty' });
            const newComment = { _id: new ObjectId(), authorId: req.user._id, content, likes: [], replies: [], createdAt: new Date() };
            await postsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $push: { comments: { $each: [newComment], $position: 0 } } });
            // Return the full updated post
            const updatedPost = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
            res.status(201).json(updatedPost);
        } catch (error) { res.status(500).json({ message: 'Server error while adding comment.' }); }
    });
    
    router.put('/:postId/comments/:commentId/like', protect(usersCollection), async (req, res) => {
        try {
            const { postId, commentId } = req.params;
            const post = await postsCollection.findOne({ _id: new ObjectId(postId), 'comments._id': new ObjectId(commentId) });
            if (!post) return res.status(404).json({ message: 'Post or comment not found' });
            const comment = post.comments.find(c => c._id.equals(new ObjectId(commentId)));
            const isLiked = comment.likes.some(likeId => likeId.equals(req.user._id));
            const updateOperation = isLiked ? { $pull: { 'comments.$.likes': req.user._id } } : { $addToSet: { 'comments.$.likes': req.user._id } };
            await postsCollection.updateOne({ _id: new ObjectId(postId), 'comments._id': new ObjectId(commentId) }, updateOperation);
            const updatedPost = await postsCollection.findOne({ _id: new ObjectId(postId) });
            res.status(200).json(updatedPost);
        } catch (error) { res.status(500).json({ message: 'Server error while liking comment.' }); }
    });

    router.post('/:postId/comments/:commentId/reply', protect(usersCollection), async (req, res) => {
        try {
            const { postId, commentId } = req.params;
            const { content } = req.body;
            if (!content) return res.status(400).json({ message: 'Reply content cannot be empty' });
            const newReply = { _id: new ObjectId(), authorId: req.user._id, content, likes: [], createdAt: new Date() };
            await postsCollection.updateOne({ _id: new ObjectId(postId), 'comments._id': new ObjectId(commentId) }, { $push: { 'comments.$.replies': newReply } });
            const updatedPost = await postsCollection.findOne({ _id: new ObjectId(postId) });
            res.status(201).json(updatedPost);
        } catch (error) { res.status(500).json({ message: 'Server error while adding reply.' }); }
    });

    // ... (other routes like reply liking and getting likers would go here)
    
    return router;
}

module.exports = createPostRoutes;