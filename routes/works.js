import express from 'express';
import Works from '../models/Works.js';

const router = express.Router();

// ==================== GET all works ====================
router.get('/works', async (req, res) => {
  try {
    const works = await Works.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: works.length,
      data: works
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching works',
      error: error.message
    });
  }
});

// ==================== GET single work by ID ====================
router.get('/works/:id', async (req, res) => {
  try {
    const work = await Works.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: work
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching work',
      error: error.message
    });
  }
});

// ==================== POST (Create) new work ====================
router.post('/works', async (req, res) => {
  try {
    const { name, title, imageurl, link } = req.body;
    
    // Validate required fields
    if (!name || !title || !imageurl || !link) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, title, imageurl, link'
      });
    }
    
    // Ensure imageurl is an array
    const imageArray = Array.isArray(imageurl) ? imageurl : [imageurl];
    
    const work = new Works({
      name,
      title,
      imageurl: imageArray,
      link
    });
    
    await work.save();
    
    res.status(201).json({
      success: true,
      message: 'Work created successfully',
      data: work
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating work',
      error: error.message
    });
  }
});

// ==================== PUT (Update) work by ID ====================
router.put('/works/:id', async (req, res) => {
  try {
    const { name, title, imageurl, link } = req.body;
    
    // Find and update
    const work = await Works.findByIdAndUpdate(
      req.params.id,
      {
        name,
        title,
        imageurl: Array.isArray(imageurl) ? imageurl : [imageurl],
        link
      },
      {
        new: true, // Return updated document
        runValidators: true // Run schema validation
      }
    );
    
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Work updated successfully',
      data: work
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating work',
      error: error.message
    });
  }
});

// ==================== DELETE work by ID ====================
router.delete('/works/:id', async (req, res) => {
  try {
    const work = await Works.findByIdAndDelete(req.params.id);
    
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Work deleted successfully',
      data: work
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting work',
      error: error.message
    });
  }
});

// ==================== DELETE all works (optional) ====================
router.delete('/works', async (req, res) => {
  try {
    await Works.deleteMany({});
    res.status(200).json({
      success: true,
      message: 'All works deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting all works',
      error: error.message
    });
  }
});

export default router;