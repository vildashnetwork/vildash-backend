import express from 'express';
import Projects from '../models/Projects.js';

const router = express.Router();

// ==================== GET all projects ====================
router.get('/projects', async (req, res) => {
    try {
        const { page = 1, limit = 10, search, visibility } = req.query;

        let query = {};

        // Filter by visibility
        if (visibility !== undefined) {
            query.visibility = visibility === 'true';
        }

        // Search functionality
        if (search) {
            query = {
                ...query,
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { technologies: { $regex: search, $options: 'i' } }
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

// ==================== GET visible projects (for public view) ====================
router.get('/projects/visible', async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        let query = { visibility: true };

        // Search functionality
        if (search) {
            query = {
                ...query,
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
            message: 'Error fetching visible projects',
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
            urllink,
            technologies,
            visibility
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

        // Ensure technologies is an array
        const techArray = Array.isArray(technologies) ? technologies : (technologies ? [technologies] : []);

        const project = new Projects({
            imageurls: imageArray,
            title,
            name,
            icon,
            description,
            solutions,
            urllink,
            technologies: techArray,
            visibility: visibility !== undefined ? visibility : false
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
            urllink,
            technologies,
            visibility
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
        if (technologies) updateData.technologies = Array.isArray(technologies) ? technologies : [technologies];
        if (visibility !== undefined) updateData.visibility = visibility;

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

// ==================== PATCH update project visibility ====================
router.patch('/projects/:id/visibility', async (req, res) => {
    try {
        const { visibility } = req.body;

        if (visibility === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide visibility (true/false)'
            });
        }

        const project = await Projects.findByIdAndUpdate(
            req.params.id,
            { visibility },
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
            message: `Project visibility updated to ${visibility}`,
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating project visibility',
            error: error.message
        });
    }
});

// ==================== PATCH update project technologies ====================
router.patch('/projects/:id/technologies', async (req, res) => {
    try {
        const { technologies } = req.body;

        if (!technologies) {
            return res.status(400).json({
                success: false,
                message: 'Please provide technologies array'
            });
        }

        const techArray = Array.isArray(technologies) ? technologies : [technologies];

        const project = await Projects.findByIdAndUpdate(
            req.params.id,
            { technologies: techArray },
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
            message: 'Project technologies updated successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating project technologies',
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
            // Ensure technologies is array
            project.technologies = Array.isArray(project.technologies) ? project.technologies : (project.technologies ? [project.technologies] : []);
            // Set visibility default if not provided
            if (project.visibility === undefined) project.visibility = false;
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
            const imagesToAdd = Array.isArray(images) ? images : [images];
            project.imageurls = [...new Set([...project.imageurls, ...imagesToAdd])];
        } else if (action === 'remove') {
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

// ==================== Add technology to project ====================
router.patch('/projects/:id/technologies/add', async (req, res) => {
    try {
        const { technology } = req.body;

        if (!technology) {
            return res.status(400).json({
                success: false,
                message: 'Please provide technology to add'
            });
        }

        const project = await Projects.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        if (!project.technologies.includes(technology)) {
            project.technologies.push(technology);
            await project.save();
        }

        res.status(200).json({
            success: true,
            message: 'Technology added successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding technology',
            error: error.message
        });
    }
});

// ==================== Remove technology from project ====================
router.patch('/projects/:id/technologies/remove', async (req, res) => {
    try {
        const { technology } = req.body;

        if (!technology) {
            return res.status(400).json({
                success: false,
                message: 'Please provide technology to remove'
            });
        }

        const project = await Projects.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        project.technologies = project.technologies.filter(tech => tech !== technology);
        await project.save();

        res.status(200).json({
            success: true,
            message: 'Technology removed successfully',
            data: project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing technology',
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

// ==================== Get projects by technology ====================
router.get('/projects/technology/:tech', async (req, res) => {
    try {
        const { tech } = req.params;

        const projects = await Projects.find({
            technologies: { $regex: tech, $options: 'i' }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching projects by technology',
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
                { solutions: { $regex: query, $options: 'i' } },
                { technologies: { $regex: query, $options: 'i' } }
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
        const visibleProjects = await Projects.countDocuments({ visibility: true });
        const hiddenProjects = await Projects.countDocuments({ visibility: false });

        const recentProjects = await Projects.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Get technology usage stats
        const techStats = await Projects.aggregate([
            { $unwind: '$technologies' },
            { $group: { _id: '$technologies', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalProjects,
                visibleProjects,
                hiddenProjects,
                recentProjects,
                technologyStats: techStats
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