import express from 'express';
import Gallery from '../models/Gelary.js';

const router = express.Router();

// ==================== GET all gallery items ====================
router.get('/gallery', async (req, res) => {
    try {
        const { page = 1, limit = 10, videotype, search } = req.query;

        let query = {};

        // Filter by video type
        if (videotype) {
            query.videotype = { $regex: videotype, $options: 'i' };
        }

        // Search functionality
        if (search) {
            query = {
                ...query,
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { videotype: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const galleryItems = await Gallery.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Gallery.countDocuments(query);

        // Get video type counts for stats
        const typeCounts = await Gallery.aggregate([
            { $group: { _id: '$videotype', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: galleryItems,
            stats: {
                total: await Gallery.countDocuments(),
                typeCounts
            },
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching gallery items',
            error: error.message
        });
    }
});

// ==================== GET single gallery item by ID ====================
router.get('/gallery/:id', async (req, res) => {
    try {
        const galleryItem = await Gallery.findById(req.params.id);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: 'Gallery item not found'
            });
        }

        res.status(200).json({
            success: true,
            data: galleryItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching gallery item',
            error: error.message
        });
    }
});

// ==================== POST (Create) new gallery item ====================
router.post('/gallery', async (req, res) => {
    try {
        const { mediaurl, videotype, title } = req.body;

        // Validate required fields
        if (!mediaurl || !videotype || !title) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: mediaurl, videotype, title'
            });
        }

        const galleryItem = new Gallery({
            mediaurl,
            videotype,
            title
        });

        await galleryItem.save();

        res.status(201).json({
            success: true,
            message: 'Gallery item created successfully',
            data: galleryItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating gallery item',
            error: error.message
        });
    }
});

// ==================== PUT (Update) gallery item ====================
router.put('/gallery/:id', async (req, res) => {
    try {
        const { mediaurl, videotype, title } = req.body;

        const galleryItem = await Gallery.findByIdAndUpdate(
            req.params.id,
            {
                mediaurl,
                videotype,
                title
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: 'Gallery item not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Gallery item updated successfully',
            data: galleryItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating gallery item',
            error: error.message
        });
    }
});

// ==================== DELETE gallery item ====================
router.delete('/gallery/:id', async (req, res) => {
    try {
        const galleryItem = await Gallery.findByIdAndDelete(req.params.id);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: 'Gallery item not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Gallery item deleted successfully',
            data: galleryItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting gallery item',
            error: error.message
        });
    }
});

// ==================== DELETE all gallery items (optional) ====================
router.delete('/gallery', async (req, res) => {
    try {
        await Gallery.deleteMany({});
        res.status(200).json({
            success: true,
            message: 'All gallery items deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting all gallery items',
            error: error.message
        });
    }
});

// ==================== Bulk create gallery items ====================
router.post('/gallery/bulk', async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of gallery items'
            });
        }

        // Validate each item
        for (const item of items) {
            if (!item.mediaurl || !item.videotype || !item.title) {
                return res.status(400).json({
                    success: false,
                    message: 'Each item must have: mediaurl, videotype, title'
                });
            }
        }

        const createdItems = await Gallery.insertMany(items);

        res.status(201).json({
            success: true,
            message: `${createdItems.length} gallery items created successfully`,
            data: createdItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating gallery items',
            error: error.message
        });
    }
});

// ==================== Get gallery items by video type ====================
router.get('/gallery/type/:videotype', async (req, res) => {
    try {
        const { videotype } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = { videotype: { $regex: videotype, $options: 'i' } };

        const items = await Gallery.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Gallery.countDocuments(query);

        res.status(200).json({
            success: true,
            data: items,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching gallery items by type',
            error: error.message
        });
    }
});

// ==================== Search gallery items ====================
router.get('/gallery/search/:query', async (req, res) => {
    try {
        const { query } = req.params;

        const items = await Gallery.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { videotype: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching gallery items',
            error: error.message
        });
    }
});

// ==================== Get gallery stats ====================
router.get('/gallery/stats', async (req, res) => {
    try {
        const total = await Gallery.countDocuments();

        // Get video type counts
        const typeStats = await Gallery.aggregate([
            { $group: { _id: '$videotype', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get recent items
        const recent = await Gallery.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Get daily upload stats (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await Gallery.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                typeStats,
                recent,
                dailyStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching gallery stats',
            error: error.message
        });
    }
});

// ==================== Get gallery items by date range ====================
router.get('/gallery/date-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide startDate and endDate'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const items = await Gallery.find({
            createdAt: {
                $gte: start,
                $lte: end
            }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching gallery items by date range',
            error: error.message
        });
    }
});

// ==================== Get random gallery items ====================
router.get('/gallery/random/:count', async (req, res) => {
    try {
        const { count } = req.params;
        const limit = parseInt(count) || 5;

        const items = await Gallery.aggregate([
            { $sample: { size: limit } }
        ]);

        res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching random gallery items',
            error: error.message
        });
    }
});

export default router;