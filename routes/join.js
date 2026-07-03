import express from 'express';
import Join from '../models/Join.js';

const router = express.Router();

// ==================== GET all applicants ====================
router.get('/join', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        let query = {};

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Search functionality
        if (search) {
            query = {
                ...query,
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const applicants = await Join.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Join.countDocuments(query);

        // Get status counts for stats
        const statusCounts = await Join.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const stats = {
            total: await Join.countDocuments(),
            pending: await Join.countDocuments({ status: 'pending' }),
            accepted: await Join.countDocuments({ status: 'accepted' }),
            rejected: await Join.countDocuments({ status: 'rejected' })
        };

        res.status(200).json({
            success: true,
            data: applicants,
            stats,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applicants',
            error: error.message
        });
    }
});

// ==================== GET single applicant by ID ====================
router.get('/join/:id', async (req, res) => {
    try {
        const applicant = await Join.findById(req.params.id);

        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: 'Applicant not found'
            });
        }

        res.status(200).json({
            success: true,
            data: applicant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applicant',
            error: error.message
        });
    }
});

// ==================== POST (Create) new applicant ====================
router.post('/join', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            biolink,
            docslink,
            letter,
            status
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !docslink || !letter) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: firstName, lastName, email, docslink, letter'
            });
        }

        // Check if applicant already exists with same email
        const existingApplicant = await Join.findOne({ email });
        if (existingApplicant) {
            return res.status(400).json({
                success: false,
                message: 'An applicant with this email already exists'
            });
        }

        const applicant = new Join({
            firstName,
            lastName,
            email,
            biolink: biolink || '',
            docslink,
            letter,
            status: status || 'pending'
        });

        await applicant.save();

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: applicant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating application',
            error: error.message
        });
    }
});

// ==================== PUT (Update) applicant ====================
router.put('/join/:id', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            biolink,
            docslink,
            letter,
            status
        } = req.body;

        // Check if email already exists for another applicant
        if (email) {
            const existingApplicant = await Join.findOne({
                email,
                _id: { $ne: req.params.id }
            });
            if (existingApplicant) {
                return res.status(400).json({
                    success: false,
                    message: 'Another applicant with this email already exists'
                });
            }
        }

        const applicant = await Join.findByIdAndUpdate(
            req.params.id,
            {
                firstName,
                lastName,
                email,
                biolink,
                docslink,
                letter,
                status
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: 'Applicant not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: applicant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating application',
            error: error.message
        });
    }
});

// ==================== PATCH update applicant status ====================
router.patch('/join/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Please provide status'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'rejected', 'accepted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, rejected, or accepted'
            });
        }

        const applicant = await Join.findByIdAndUpdate(
            req.params.id,
            { status },
            {
                new: true,
                runValidators: true
            }
        );

        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: 'Applicant not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Application status updated to ${status}`,
            data: applicant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating application status',
            error: error.message
        });
    }
});

// ==================== DELETE applicant ====================
router.delete('/join/:id', async (req, res) => {
    try {
        const applicant = await Join.findByIdAndDelete(req.params.id);

        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: 'Applicant not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Application deleted successfully',
            data: applicant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting application',
            error: error.message
        });
    }
});

// ==================== DELETE all applicants (optional) ====================
router.delete('/join', async (req, res) => {
    try {
        await Join.deleteMany({});
        res.status(200).json({
            success: true,
            message: 'All applications deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting all applications',
            error: error.message
        });
    }
});

// ==================== Bulk create applicants ====================
router.post('/join/bulk', async (req, res) => {
    try {
        const { applicants } = req.body;

        if (!applicants || !Array.isArray(applicants) || applicants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of applicants'
            });
        }

        // Validate each applicant
        for (const applicant of applicants) {
            if (!applicant.firstName || !applicant.lastName || !applicant.email ||
                !applicant.docslink || !applicant.letter) {
                return res.status(400).json({
                    success: false,
                    message: 'Each applicant must have: firstName, lastName, email, docslink, letter'
                });
            }
        }

        const createdApplicants = await Join.insertMany(applicants);

        res.status(201).json({
            success: true,
            message: `${createdApplicants.length} applications created successfully`,
            data: createdApplicants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating applications',
            error: error.message
        });
    }
});

// ==================== Get applicants by status ====================
router.get('/join/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Validate status
        const validStatuses = ['pending', 'rejected', 'accepted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, rejected, or accepted'
            });
        }

        const query = { status };

        const applicants = await Join.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Join.countDocuments(query);

        res.status(200).json({
            success: true,
            data: applicants,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applicants by status',
            error: error.message
        });
    }
});

// ==================== Search applicants ====================
router.get('/join/search/:query', async (req, res) => {
    try {
        const { query } = req.params;

        const applicants = await Join.find({
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: applicants.length,
            data: applicants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching applicants',
            error: error.message
        });
    }
});

// ==================== Get applicant stats ====================
router.get('/join/stats', async (req, res) => {
    try {
        const total = await Join.countDocuments();
        const pending = await Join.countDocuments({ status: 'pending' });
        const accepted = await Join.countDocuments({ status: 'accepted' });
        const rejected = await Join.countDocuments({ status: 'rejected' });

        // Get recent applications
        const recent = await Join.find()
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                accepted,
                rejected,
                recent
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applicant stats',
            error: error.message
        });
    }
});

// ==================== Check if email exists ====================
router.get('/join/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const applicant = await Join.findOne({ email });

        res.status(200).json({
            success: true,
            exists: !!applicant,
            data: applicant || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking email',
            error: error.message
        });
    }
});

export default router;