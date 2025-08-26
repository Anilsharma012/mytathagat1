const Admin = require("../models/Admin");
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

    const hashedPassword = await bcrypt.hash(password, 10); // ✅ Hash here

    const admin = new Admin({ email, password: hashedPassword }); // ✅ Save hashed
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
