import express from 'express';
import Higher from '../models/Higher.js';

const router = express.Router();

// ==================== GET all service orders ====================
router.get('/higher', async (req, res) => {
    try {
        const { page = 1, limit = 10, service, search } = req.query;

        let query = {};

        // Filter by service
        if (service) {
            query.service = { $regex: service, $options: 'i' };
        }

        // Search functionality
        if (search) {
            query = {
                ...query,
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { company: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const orders = await Higher.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Higher.countDocuments(query);

        // Get service counts for stats
        const serviceCounts = await Higher.aggregate([
            { $group: { _id: '$service', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            stats: {
                total: await Higher.countDocuments(),
                serviceCounts
            },
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching service orders',
            error: error.message
        });
    }
});

// ==================== GET single service order by ID ====================
router.get('/higher/:id', async (req, res) => {
    try {
        const order = await Higher.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Service order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching service order',
            error: error.message
        });
    }
});

// ==================== POST (Create) new service order ====================
router.post('/higher', async (req, res) => {
    try {
        const {
            service,
            name,
            company,
            email,
            phone,
            details
        } = req.body;

        // Validate required fields
        if (!service || !name || !company || !email || !phone || !details) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: service, name, company, email, phone, details'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Validate phone format (basic)
        if (phone.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid phone number'
            });
        }

        const order = new Higher({
            service,
            name,
            company,
            email,
            phone,
            details
        });

        await order.save();

        res.status(201).json({
            success: true,
            message: 'Service order created successfully',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating service order',
            error: error.message
        });
    }
});

// ==================== PUT (Update) service order ====================
router.put('/higher/:id', async (req, res) => {
    try {
        const {
            service,
            name,
            company,
            email,
            phone,
            details
        } = req.body;

        // Validate email if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address'
                });
            }
        }

        // Validate phone if provided
        if (phone && phone.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid phone number'
            });
        }

        const order = await Higher.findByIdAndUpdate(
            req.params.id,
            {
                service,
                name,
                company,
                email,
                phone,
                details
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Service order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Service order updated successfully',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating service order',
            error: error.message
        });
    }
});

// ==================== DELETE service order ====================
router.delete('/higher/:id', async (req, res) => {
    try {
        const order = await Higher.findByIdAndDelete(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Service order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Service order deleted successfully',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting service order',
            error: error.message
        });
    }
});

// ==================== DELETE all service orders (optional) ====================
router.delete('/higher', async (req, res) => {
    try {
        await Higher.deleteMany({});
        res.status(200).json({
            success: true,
            message: 'All service orders deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting all service orders',
            error: error.message
        });
    }
});

// ==================== Bulk create service orders ====================
router.post('/higher/bulk', async (req, res) => {
    try {
        const { orders } = req.body;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of service orders'
            });
        }

        // Validate each order
        for (const order of orders) {
            if (!order.service || !order.name || !order.company ||
                !order.email || !order.phone || !order.details) {
                return res.status(400).json({
                    success: false,
                    message: 'Each order must have: service, name, company, email, phone, details'
                });
            }
        }

        const createdOrders = await Higher.insertMany(orders);

        res.status(201).json({
            success: true,
            message: `${createdOrders.length} service orders created successfully`,
            data: createdOrders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating service orders',
            error: error.message
        });
    }
});

// ==================== Get orders by service ====================
router.get('/higher/service/:service', async (req, res) => {
    try {
        const { service } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = { service: { $regex: service, $options: 'i' } };

        const orders = await Higher.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Higher.countDocuments(query);

        res.status(200).json({
            success: true,
            data: orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders by service',
            error: error.message
        });
    }
});

// ==================== Search service orders ====================
router.get('/higher/search/:query', async (req, res) => {
    try {
        const { query } = req.params;

        const orders = await Higher.find({
            $or: [
                { service: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { company: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
                { details: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching service orders',
            error: error.message
        });
    }
});

// ==================== Get service order stats ====================
router.get('/higher/stats', async (req, res) => {
    try {
        const total = await Higher.countDocuments();

        // Get unique services with counts
        const serviceStats = await Higher.aggregate([
            { $group: { _id: '$service', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get recent orders
        const recent = await Higher.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Get daily stats (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await Higher.aggregate([
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
                serviceStats,
                recent,
                dailyStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching service order stats',
            error: error.message
        });
    }
});

// ==================== Get orders by email ====================
router.get('/higher/email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const orders = await Higher.find({
            email: { $regex: email, $options: 'i' }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders by email',
            error: error.message
        });
    }
});

// ==================== Get orders by company ====================
router.get('/higher/company/:company', async (req, res) => {
    try {
        const { company } = req.params;

        const orders = await Higher.find({
            company: { $regex: company, $options: 'i' }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders by company',
            error: error.message
        });
    }
});

// ==================== Get orders by date range ====================
router.get('/higher/date-range', async (req, res) => {
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

        const orders = await Higher.find({
            createdAt: {
                $gte: start,
                $lte: end
            }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders by date range',
            error: error.message
        });
    }
});

export default router;