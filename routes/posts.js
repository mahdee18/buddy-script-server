const express = require('express');
const { ObjectId } = require('mongodb');
const { protect } = require('../middleware/authMiddleware');

function createPostRoutes(postsCollection, usersCollection) {
    const router = express.Router();

    // ==========================================================
    // CREATE A POST
    // ==========================================================
    router.post('/', protect(usersCollection), async (req, res) => {
        console.log('--- Received request to CREATE post ---');
        try {
            const { content, imageUrl } = req.body;
            if (!content && !imageUrl) {
                return res.status(400).json({ message: 'Post content or image is required.' });
            }
            const newPost = {
                authorId: req.user._id,
                content,
                imageUrl: imageUrl || '',
                createdAt: new Date(),
                likes: [],
                comments: [],
            };
            const result = await postsCollection.insertOne(newPost);
            const createdPost = await postsCollection.findOne({ _id: result.insertedId });

            const responsePost = { 
                ...createdPost, 
                author: {
                    _id: req.user._id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                    profilePicture: req.user.profilePicture
                }
            };
            
            console.log('--- Post created successfully ---');
            res.status(201).json(responsePost);

        } catch (error) {
            console.error('!!! ERROR CREATING POST:', error);
            res.status(500).json({ message: 'Server error while creating post.' });
        }
    });

    // ==========================================================
    // GET ALL POSTS (With populated author and comment data)
    // ==========================================================
    router.get('/', async (req, res) => {
        console.log('--- Received request to GET all posts ---');
        try {
            const posts = await postsCollection.aggregate([
                { $sort: { createdAt: -1 } },
                { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'author' } },
                { $unwind: '$author' },
                { $lookup: { from: 'users', localField: 'comments.authorId', foreignField: '_id', as: 'commentAuthors'}},
                {
                    $addFields: {
                        comments: {
                            $map: {
                                input: '$comments', as: 'comment', in: {
                                    $mergeObjects: [
                                        '$$comment',
                                        { author: { $arrayElemAt: [ { $filter: { input: '$commentAuthors', as: 'ca', cond: { $eq: ['$$ca._id', '$$comment.authorId'] } } }, 0 ] } }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        'author.password': 0, 'author.email': 0,
                        'commentAuthors': 0, 'comments.author.password': 0, 'comments.author.email': 0
                    }
                }
            ]).toArray();
            console.log(`--- Found ${posts.length} posts ---`);
            res.status(200).json(posts);
        } catch (error) {
            console.error('!!! ERROR FETCHING POSTS:', error);
            res.status(500).json({ message: 'Server error fetching posts.' });
        }
    });

    // ==========================================================
    // LIKE / UNLIKE A POST
    // ==========================================================
    router.put('/:id/like', protect(usersCollection), async (req, res) => {
        console.log(`--- Received request to LIKE post: ${req.params.id} ---`);
        try {
            const post = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }
            const isLiked = post.likes.some(likeId => likeId.equals(req.user._id));
            const updateOperation = isLiked
                ? { $pull: { likes: req.user._id } }
                : { $addToSet: { likes: req.user._id } };

            await postsCollection.updateOne({ _id: new ObjectId(req.params.id) }, updateOperation);
            
            console.log('--- Post like status updated ---');
            res.status(200).json({ message: 'Post like status updated successfully' });
        } catch (error) {
            console.error('!!! ERROR LIKING POST:', error);
            res.status(500).json({ message: 'Server error while liking post.' });
        }
    });

    // ==========================================================
    // ADD A COMMENT TO A POST
    // ==========================================================
    router.post('/:id/comments', protect(usersCollection), async (req, res) => {
        console.log(`--- Received request to ADD COMMENT to post: ${req.params.id} ---`);
        try {
            const { content } = req.body;
            if (!content) {
                return res.status(400).json({ message: 'Comment content cannot be empty' });
            }
            const newComment = {
                _id: new ObjectId(),
                authorId: req.user._id,
                content,
                likes: [],
                createdAt: new Date(),
            };
            await postsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $push: { comments: { $each: [newComment], $position: 0 } } }
            );
            const commentForResponse = { ...newComment, author: req.user };
            console.log('--- Comment added successfully ---');
            res.status(201).json(commentForResponse);
        } catch (error) {
            console.error('!!! ERROR ADDING COMMENT:', error);
            res.status(500).json({ message: 'Server error while adding comment.' });
        }
    });

    // ==========================================================
    // LIKE / UNLIKE A COMMENT
    // ==========================================================
     router.put('/:postId/comments/:commentId/like', protect(usersCollection), async (req, res) => {
        try {
            const { postId, commentId } = req.params;
            const post = await postsCollection.findOne({ _id: new ObjectId(postId), 'comments._id': new ObjectId(commentId) });
            if (!post) {
                return res.status(404).json({ message: 'Post or comment not found' });
            }
            const comment = post.comments.find(c => c._id.equals(new ObjectId(commentId)));
            const isLiked = comment.likes.some(likeId => likeId.equals(req.user._id));
            const updateOperation = isLiked
                ? { $pull: { 'comments.$.likes': req.user._id } }
                : { $addToSet: { 'comments.$.likes': req.user._id } };

            await postsCollection.updateOne({ _id: new ObjectId(postId), 'comments._id': new ObjectId(commentId) }, updateOperation);
            res.status(200).json({ message: 'Comment like status updated successfully.' });
        } catch (error) {
            console.error('Error liking comment:', error);
            res.status(500).json({ message: 'Server error while liking comment.' });
        }
    });

    return router;
}

module.exports = createPostRoutes;