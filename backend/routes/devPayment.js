const express = require('express');
const router = express.Router();
const User = require('../models/UserSchema');

// Development payment unlock - no auth required
router.post('/unlock-course-payment', async (req, res) => {
  try {
    console.log('🔧 Development payment unlock requested');
    
    const { courseId } = req.body;
    
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID required'
      });
    }

    // Find or create demo user with fixed ID
    const demoUserId = '507f1f77bcf86cd799439011';
    let demoUser = await User.findById(demoUserId);
    
    if (!demoUser) {
      demoUser = new User({
        _id: demoUserId,
        email: 'demo@test.com',
        phoneNumber: '9999999999',
        name: 'Demo Student',
        isEmailVerified: true,
        isPhoneVerified: true,
        city: 'Demo City',
        gender: 'Male',
        dob: new Date('1995-01-01'),
        selectedCategory: 'CAT',
        selectedExam: 'CAT 2025',
        enrolledCourses: []
      });
      await demoUser.save();
      console.log('✅ Demo user created');
    }

    // Check if course is already unlocked
    const existingCourse = demoUser.enrolledCourses.find(
      c => c.courseId && c.courseId.toString() === courseId
    );
    
    if (existingCourse) {
      return res.status(200).json({
        success: true,
        message: 'Course already unlocked',
        alreadyUnlocked: true,
        enrolledCourses: demoUser.enrolledCourses
      });
    }

    // Add course to enrolled courses
    demoUser.enrolledCourses.push({
      courseId,
      status: 'unlocked',
      enrolledAt: new Date()
    });
    
    await demoUser.save();
    console.log('✅ Course unlocked for demo user:', courseId);

    res.status(200).json({
      success: true,
      message: 'Course unlocked successfully',
      courseId,
      userId: demoUser._id,
      enrolledCourses: demoUser.enrolledCourses
    });

  } catch (error) {
    console.error('❌ Dev payment unlock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get demo user courses - no auth required
router.get('/my-courses', async (req, res) => {
  try {
    console.log('🔧 Development my-courses requested');
    
    const demoUserId = '507f1f77bcf86cd799439011';
    const demoUser = await User.findById(demoUserId).populate('enrolledCourses.courseId');
    
    if (!demoUser) {
      return res.status(200).json({
        success: true,
        courses: []
      });
    }

    const unlockedCourses = demoUser.enrolledCourses
      .filter(c => c.status === "unlocked" && c.courseId)
      .map(c => ({
        _id: c._id,
        status: c.status,
        enrolledAt: c.enrolledAt,
        courseId: c.courseId,
      }));

    res.status(200).json({ 
      success: true, 
      courses: unlockedCourses 
    });

  } catch (error) {
    console.error('❌ Dev my-courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
