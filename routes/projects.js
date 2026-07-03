import express from 'express';
import Projects from '../models/Projects.js';

const router = express.Router();

// ==================== GET all projects ====================
router.get('/projects', async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        let query = {};

        // Search functionality
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const projects = await Projects.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Projects.countDocuments(query);

        res.status(200).json({
            success: true,
            data: projects,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching projects',
            error: error.message
        });
    }
});

// ==================== GET single project by ID ====================
router.get('/projects/:id', async (req, res) => {
    try {
        const project = await Projects.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching project',
            error: error.message
        });
    }
});

// ==================== POST (Create) new project ====================
router.post('/projects', async (req, res) => {
    try {
        const {
            imageurls,
            title,
            name,
            icon,
            description,
            solutions,
            urllink
        } = req.body;

        // Validate required fields
        if (!imageurls || !title || !name || !icon || !description || !solutions || !urllink) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: imageurls, title, name, icon, description, solutions, urllink'
            });
        }

        // Ensure imageurls is an array
        const imageArray = Array.isArray(imageurls) ? imageurls : [imageurls];

        const project = new Projects({
            imageurls: imageArray,
            title,
            name,
            icon,
            description,
            solutions,
            urllink
        });

        await project.save();

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating project',
            error: error.message
        });
    }
});

// ==================== PUT (Update) project ====================
router.put('/projects/:id', async (req, res) => {
    try {
        const {
            imageurls,
            title,
            name,
            icon,
            description,
            solutions,
            urllink
        } = req.body;

        // Build update object
        const updateData = {};
        if (imageurls) updateData.imageurls = Array.isArray(imageurls) ? imageurls : [imageurls];
        if (title) updateData.title = title;
        if (name) updateData.name = name;
        if (icon) updateData.icon = icon;
        if (description) updateData.description = description;
        if (solutions) updateData.solutions = solutions;
        if (urllink) updateData.urllink = urllink;

        const project = await Projects.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating project',
            error: error.message
        });
    }
});

// ==================== DELETE project ====================
router.delete('/projects/:id', async (req, res) => {
    try {
        const project = await Projects.findByIdAndDelete(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting project',
            error: error.message
        });
    }
});

// ==================== DELETE all projects (optional) ====================
router.delete('/projects', async (req, res) => {
    try {
        await Projects.deleteMany({});
        res.status(200).json({
            success: true,
            message: 'All projects deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting all projects',
            error: error.message
        });
    }
});

// ==================== Bulk create projects ====================
router.post('/projects/bulk', async (req, res) => {
    try {
        const { projects } = req.body;

        if (!projects || !Array.isArray(projects) || projects.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of projects'
            });
        }

        // Validate each project
        for (const project of projects) {
            if (!project.imageurls || !project.title || !project.name ||
                !project.icon || !project.description || !project.solutions ||
                !project.urllink) {
                return res.status(400).json({
                    success: false,
                    message: 'Each project must have: imageurls, title, name, icon, description, solutions, urllink'
                });
            }
            // Ensure imageurls is array
            project.imageurls = Array.isArray(project.imageurls) ? project.imageurls : [project.imageurls];
        }

        const createdProjects = await Projects.insertMany(projects);

        res.status(201).json({
            success: true,
            message: `${createdProjects.length} projects created successfully`,
            data: createdProjects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating projects',
            error: error.message
        });
    }
});

// ==================== Update project images (add/remove) ====================
router.patch('/projects/:id/images', async (req, res) => {
    try {
        const { action, images } = req.body;

        if (!action || !images) {
            return res.status(400).json({
                success: false,
                message: 'Please provide action (add/remove) and images array'
            });
        }

        const project = await Projects.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        if (action === 'add') {
            // Add new images (avoid duplicates)
            const imagesToAdd = Array.isArray(images) ? images : [images];
            project.imageurls = [...new Set([...project.imageurls, ...imagesToAdd])];
        } else if (action === 'remove') {
            // Remove specific images
            const imagesToRemove = Array.isArray(images) ? images : [images];
            project.imageurls = project.imageurls.filter(img => !imagesToRemove.includes(img));
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Use "add" or "remove"'
            });
        }

        await project.save();

        res.status(200).json({
            success: true,
            message: 'Project images updated successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating project images',
            error: error.message
        });
    }
});

// ==================== Get projects by name ====================
router.get('/projects/name/:name', async (req, res) => {
    try {
        const { name } = req.params;

        const projects = await Projects.find({
            name: { $regex: name, $options: 'i' }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching projects by name',
            error: error.message
        });
    }
});

// ==================== Search projects ====================
router.get('/projects/search/:query', async (req, res) => {
    try {
        const { query } = req.params;

        const projects = await Projects.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { solutions: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching projects',
            error: error.message
        });
    }
});

// ==================== Get project stats ====================
router.get('/projects/stats', async (req, res) => {
    try {
        const totalProjects = await Projects.countDocuments();
        const recentProjects = await Projects.find()
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                totalProjects,
                recentProjects
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching project stats',
            error: error.message
        });
    }
});

export default router;