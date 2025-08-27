const express = require("express");
const router = express.Router();

const adminController = require("../controllers/AdminController");
const { adminAuth } = require("../middleware/authMiddleware"); // Token verify middleware (auth check)

// Temporary route to create admin - use only once then delete
router.post("/create", adminController.createAdmin);

// Login route
router.post("/login", adminController.loginAdmin);

// Password change route - authenticated admin only
router.put("/change-password", adminAuth, adminController.changePassword);


router.get("/get-students", adminAuth, adminController.getStudents);
router.put("/update-student/:id", adminAuth, adminController.updateStudent);
router.delete("/delete-student/:id", adminAuth, adminController.deleteStudent);
router.get("/me", adminAuth, adminController.getProfile);
router.get("/paid-users", adminAuth, adminController.getPaidUsers);

// New payment and course management routes
router.get("/students-with-purchases", adminAuth, adminController.getStudentsWithPurchases);
router.get("/payments", adminAuth, adminController.getAllPayments);
router.get("/course-statistics", adminAuth, adminController.getCourseStatistics);
router.put("/student/:studentId/course/:courseId/status", adminAuth, adminController.updateStudentCourseStatus);
router.get("/receipt/:receiptId/download", adminAuth, adminController.downloadStudentReceipt);


module.exports = router;
