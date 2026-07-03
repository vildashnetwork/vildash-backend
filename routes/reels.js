import express from 'express';
import Reel from '../models/Reel.js';

const router = express.Router();

// ==================== GET all reels ====================
router.get('/reels', async (req, res) => {
    try {
        const { page = 1, limit = 10, hashtag, creator } = req.query;

        const query = { isPublished: true, isPrivate: false };

        if (hashtag) {
            query.hashtags = hashtag;
        }

        if (creator) {
            query.creator = creator;
        }

        const reels = await Reel.find(query)
            .populate('creator', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: reels,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching reels',
            error: error.message
        });
    }
});

// ==================== GET single reel by ID ====================
router.get('/reels/:id', async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id)
            .populate('creator', 'name email')
            .populate('likes', 'name email')
            .populate('comments.user', 'name email')
            .populate('comments.likes', 'name email')
            .populate('comments.replies.user', 'name email')
            .populate('comments.replies.likes', 'name email');

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            data: reel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching reel',
            error: error.message
        });
    }
});

// ==================== POST (Create) new reel ====================
router.post('/reels', async (req, res) => {
    try {
        const {
            videoUrl,
            thumbnail,
            creator,
            creatorName,
            creatorAvatar,
            caption,
            hashtags,
            music,
            duration,
            isPublished,
            isPrivate
        } = req.body;

        // Validate required fields
        if (!videoUrl || !creator || !creatorName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide: videoUrl, creator, creatorName'
            });
        }

        const reel = new Reel({
            videoUrl,
            thumbnail: thumbnail || '',
            creator,
            creatorName,
            creatorAvatar: creatorAvatar || '',
            caption: caption || '',
            hashtags: hashtags || [],
            music: music || '',
            duration: duration || 0,
            isPublished: isPublished !== undefined ? isPublished : true,
            isPrivate: isPrivate !== undefined ? isPrivate : false
        });

        await reel.save();

        res.status(201).json({
            success: true,
            message: 'Reel created successfully',
            data: reel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating reel',
            error: error.message
        });
    }
});

// ==================== PUT (Update) reel ====================
router.put('/reels/:id', async (req, res) => {
    try {
        const {
            videoUrl,
            thumbnail,
            caption,
            hashtags,
            music,
            duration,
            isPublished,
            isPrivate
        } = req.body;

        const reel = await Reel.findByIdAndUpdate(
            req.params.id,
            {
                videoUrl,
                thumbnail,
                caption,
                hashtags,
                music,
                duration,
                isPublished,
                isPrivate
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reel updated successfully',
            data: reel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating reel',
            error: error.message
        });
    }
});

// ==================== DELETE reel ====================
router.delete('/reels/:id', async (req, res) => {
    try {
        const reel = await Reel.findByIdAndDelete(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reel deleted successfully',
            data: reel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting reel',
            error: error.message
        });
    }
});

// ==================== LIKE / UNLIKE reel ====================
router.post('/reels/:id/like', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId'
            });
        }

        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        await reel.toggleLike(userId);

        res.status(200).json({
            success: true,
            message: 'Like toggled successfully',
            data: {
                likeCount: reel.likeCount,
                isLiked: reel.likes.includes(userId)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error toggling like',
            error: error.message
        });
    }
});

// ==================== GET reel likes ====================
router.get('/reels/:id/likes', async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id)
            .populate('likes', 'name email avatar');

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            data: reel.likes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching likes',
            error: error.message
        });
    }
});

// ==================== ADD COMMENT ====================
router.post('/reels/:id/comments', async (req, res) => {
    try {
        const { userId, userName, userAvatar, text } = req.body;

        if (!userId || !userName || !text) {
            return res.status(400).json({
                success: false,
                message: 'Please provide: userId, userName, text'
            });
        }

        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        const commentData = {
            user: userId,
            userName,
            userAvatar: userAvatar || '',
            text,
            likes: [],
            likeCount: 0,
            replies: []
        };

        await reel.addComment(commentData);

        // Get the newly added comment
        const newComment = reel.comments[reel.comments.length - 1];

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: newComment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding comment',
            error: error.message
        });
    }
});

// ==================== DELETE COMMENT ====================
router.delete('/reels/:id/comments/:commentId', async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        await reel.removeComment(req.params.commentId);

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting comment',
            error: error.message
        });
    }
});

// ==================== LIKE / UNLIKE COMMENT ====================
router.post('/reels/:id/comments/:commentId/like', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId'
            });
        }

        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        const comment = reel.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const likeIndex = comment.likes.indexOf(userId);
        if (likeIndex === -1) {
            comment.likes.push(userId);
            comment.likeCount += 1;
        } else {
            comment.likes.splice(likeIndex, 1);
            comment.likeCount -= 1;
        }

        await reel.save();

        res.status(200).json({
            success: true,
            message: 'Comment like toggled successfully',
            data: {
                likeCount: comment.likeCount,
                isLiked: comment.likes.includes(userId)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error toggling comment like',
            error: error.message
        });
    }
});

// ==================== ADD REPLY TO COMMENT ====================
router.post('/reels/:id/comments/:commentId/replies', async (req, res) => {
    try {
        const { userId, userName, userAvatar, text } = req.body;

        if (!userId || !userName || !text) {
            return res.status(400).json({
                success: false,
                message: 'Please provide: userId, userName, text'
            });
        }

        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        const comment = reel.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const replyData = {
            user: userId,
            userName,
            userAvatar: userAvatar || '',
            text,
            likes: [],
            likeCount: 0
        };

        comment.replies.push(replyData);
        await reel.save();

        const newReply = comment.replies[comment.replies.length - 1];

        res.status(201).json({
            success: true,
            message: 'Reply added successfully',
            data: newReply
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding reply',
            error: error.message
        });
    }
});

// ==================== LIKE / UNLIKE REPLY ====================
router.post('/reels/:id/comments/:commentId/replies/:replyId/like', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId'
            });
        }

        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        const comment = reel.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const reply = comment.replies.id(req.params.replyId);

        if (!reply) {
            return res.status(404).json({
                success: false,
                message: 'Reply not found'
            });
        }

        const likeIndex = reply.likes.indexOf(userId);
        if (likeIndex === -1) {
            reply.likes.push(userId);
            reply.likeCount += 1;
        } else {
            reply.likes.splice(likeIndex, 1);
            reply.likeCount -= 1;
        }

        await reel.save();

        res.status(200).json({
            success: true,
            message: 'Reply like toggled successfully',
            data: {
                likeCount: reply.likeCount,
                isLiked: reply.likes.includes(userId)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error toggling reply like',
            error: error.message
        });
    }
});

// ==================== SHARE reel ====================
router.post('/reels/:id/share', async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        reel.shares += 1;
        await reel.save();

        res.status(200).json({
            success: true,
            message: 'Reel shared successfully',
            data: {
                shares: reel.shares
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sharing reel',
            error: error.message
        });
    }
});

// ==================== ADD VIEW ====================
router.post('/reels/:id/view', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId'
            });
        }

        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        await reel.addView(userId);

        res.status(200).json({
            success: true,
            message: 'View recorded successfully',
            data: {
                viewCount: reel.viewCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error recording view',
            error: error.message
        });
    }
});

// ==================== GET REELS BY HASHTAG ====================
router.get('/reels/hashtag/:tag', async (req, res) => {
    try {
        const { tag } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = {
            hashtags: tag,
            isPublished: true,
            isPrivate: false
        };

        const reels = await Reel.find(query)
            .populate('creator', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: reels,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching reels by hashtag',
            error: error.message
        });
    }
});

// ==================== GET TRENDING REELS ====================
router.get('/reels/trending', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const reels = await Reel.find({ isPublished: true, isPrivate: false })
            .populate('creator', 'name email')
            .sort({ viewCount: -1, likeCount: -1 })
            .limit(limit * 1);

        res.status(200).json({
            success: true,
            data: reels
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching trending reels',
            error: error.message
        });
    }
});

// ==================== GET REELS BY CREATOR ====================
router.get('/reels/creator/:creatorId', async (req, res) => {
    try {
        const { creatorId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = { creator: creatorId, isPublished: true };

        const reels = await Reel.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: reels,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching creator reels',
            error: error.message
        });
    }
});

export default router;