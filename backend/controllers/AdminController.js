const Admin = require("../models/Admin");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const Course = require("../models/course/Course");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/UserSchema");

const JWT_SECRET = process.env.JWT_SECRET || "secret_admin_key";

// Create admin (temporary use)
exports.createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // No manual hashing - let the pre-save middleware handle it
    const admin = new Admin({ email, password });
    await admin.save();

    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



exports.changePassword = async (req, res) => {
  try {
    const adminId = req.user.id; // ye middleware se aayega, token decode karke
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Please fill all fields." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match." });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    admin.password = newPassword;  // pre-save middleware se hash ho jayega
    await admin.save();

    res.json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};


exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select(
      "name email phoneNumber selectedCategory selectedExam createdAt"
    );
    res.status(200).json({ students });
  } catch (error) {
    console.log("❌ Error in getStudents:", error); // 🟡 Add this to debug
    res.status(500).json({ message: "Server error", error });
  }
};


exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    let student = await User.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found!" });

    student = await User.findByIdAndUpdate(id, updatedData, { new: true });

    res.status(200).json({ message: "Student updated successfully!", student });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    let student = await User.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found!" });

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: "Student deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get current admin details
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json({ admin });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getPaidUsers = async (req, res) => {
  try {
    const users = await User.find({
      "enrolledCourses.status": "unlocked"
    })
      .select("name email phoneNumber enrolledCourses")
      .populate("enrolledCourses.courseId");

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("❌ Error in getPaidUsers:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Get all students with their course purchases
exports.getStudentsWithPurchases = async (req, res) => {
  try {
    const students = await User.find({}, "name email phoneNumber selectedCategory selectedExam createdAt enrolledCourses")
      .populate('enrolledCourses.courseId', 'name price description')
      .sort({ createdAt: -1 });

    // Get payment details for each student
    const studentsWithPayments = await Promise.all(
      students.map(async (student) => {
        const payments = await Payment.find({ userId: student._id })
          .populate('courseId', 'name price description')
          .sort({ createdAt: -1 });

        return {
          ...student.toObject(),
          payments: payments,
          totalSpent: payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0)
        };
      })
    );

    res.status(200).json({
      success: true,
      students: studentsWithPayments,
      count: studentsWithPayments.length
    });
  } catch (error) {
    console.error("❌ Error in getStudentsWithPurchases:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get all payments/purchases
exports.getAllPayments = async (req, res) => {
  try {
    const { status, courseId, startDate, endDate } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (courseId) filter.courseId = courseId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('userId', 'name email phoneNumber')
      .populate('courseId', 'name price description')
      .sort({ createdAt: -1 });

    const summary = {
      totalPayments: payments.length,
      successfulPayments: payments.filter(p => p.status === 'paid').length,
      totalRevenue: payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      pendingPayments: payments.filter(p => p.status === 'created').length,
      failedPayments: payments.filter(p => p.status === 'failed').length,
    };

    res.status(200).json({
      success: true,
      payments: payments,
      summary: summary
    });
  } catch (error) {
    console.error("❌ Error in getAllPayments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get course-wise purchase statistics
exports.getCourseStatistics = async (req, res) => {
  try {
    const courses = await Course.find({}, 'name price description published');

    const courseStats = await Promise.all(
      courses.map(async (course) => {
        const payments = await Payment.find({
          courseId: course._id,
          status: 'paid'
        });

        const enrolledStudents = await User.find({
          'enrolledCourses.courseId': course._id,
          'enrolledCourses.status': 'unlocked'
        }).countDocuments();

        return {
          course: course,
          totalEnrollments: enrolledStudents,
          totalPayments: payments.length,
          totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
          averagePayment: payments.length > 0
            ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
            : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      courseStatistics: courseStats
    });
  } catch (error) {
    console.error("❌ Error in getCourseStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Update student course status
exports.updateStudentCourseStatus = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const { status } = req.body; // locked or unlocked

    if (!['locked', 'unlocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'locked' or 'unlocked'"
      });
    }

    const user = await User.findById(studentId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const courseEntry = user.enrolledCourses.find(
      c => c.courseId.toString() === courseId
    );

    if (!courseEntry) {
      // Add new enrollment if it doesn't exist
      user.enrolledCourses.push({
        courseId: courseId,
        status: status,
        enrolledAt: new Date()
      });
    } else {
      // Update existing enrollment
      courseEntry.status = status;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Course status updated to ${status}`,
      user: user
    });
  } catch (error) {
    console.error("❌ Error in updateStudentCourseStatus:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Download receipt for admin
exports.downloadStudentReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { format = 'json' } = req.query; // json, html, or text

    const receipt = await Receipt.findById(receiptId)
      .populate('paymentId')
      .populate('userId', 'name email phoneNumber')
      .populate('courseId', 'name description price');

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found"
      });
    }

    // Mark as downloaded
    await receipt.markAsDownloaded();

    // Get receipt data
    const receiptData = receipt.getReceiptData();

    if (format === 'html') {
      const { generateReceiptHTML } = require('../utils/receiptGenerator');
      const html = generateReceiptHTML(receiptData);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="receipt-${receipt.receiptNumber}.html"`);
      return res.send(html);
    }

    if (format === 'text') {
      const { generateReceiptText } = require('../utils/receiptGenerator');
      const text = generateReceiptText(receiptData);

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receiptNumber}.txt"`);
      return res.send(text);
    }

    // Default JSON response
    res.status(200).json({
      success: true,
      receipt: receiptData,
      student: {
        name: receipt.userId.name,
        email: receipt.userId.email,
        phone: receipt.userId.phoneNumber
      },
      formats: {
        html: `/api/admin/receipt/${receiptId}/download?format=html`,
        text: `/api/admin/receipt/${receiptId}/download?format=text`
      }
    });
  } catch (error) {
    console.error("❌ Error in downloadStudentReceipt:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
