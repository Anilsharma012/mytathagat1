const User = require("../models/UserSchema");
const jwt = require("jsonwebtoken");
const Course =require("../models/course/Course")
const Razorpay = require("razorpay");
const crypto = require("crypto");


const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_JLdFnx7r5NMiBS", // Replace with your key
  key_secret: process.env.RAZORPAY_KEY_SECRET || "wlVOAREeWhLHJQrlDUr0iEn7" // Replace with your secret
});


exports.updateDetails = async (req, res) => {
  try {
    console.log("🔥 Incoming update request");
    console.log("✔️ req.user:", req.user);
    console.log("📦 req.body:", req.body);

    const { name, email, phoneNumber, city, gender, dob, profilePic } = req.body;

    // Development mode: return mock success
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔥 DEV MODE: User details updated for`, req.user);

      const updatedUser = {
        _id: req.user.id || "dev_user_id",
        name,
        email,
        phoneNumber,
        city,
        gender,
        dob,
        profilePic
      };

      res.status(200).json({
        message: "User details updated successfully",
        user: updatedUser,
        redirectTo: "/exam-category",
        devMode: true
      });
      return;
    }

    // Production mode: use database
    const userId = req.user.id;
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name;
    user.email = email;
    user.phoneNumber = phoneNumber;
    user.city = city;
    user.gender = gender;
    user.dob = dob;
    user.profilePic = profilePic;

    await user.save();

    res.json({ message: "User details updated successfully", user, redirectTo: "/exam-category" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.saveCategory = async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    // Development mode: return mock success
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔥 DEV MODE: Category saved - ${category}`);

      res.status(200).json({
        message: "Exam category saved successfully",
        redirectTo: `/exam-selection/${category}`,
        devMode: true
      });
      return;
    }

    // Production mode: use database
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.selectedCategory = category;
    await user.save();

    res.status(200).json({
      message: "Exam category saved successfully",
      redirectTo: `/exam-selection/${category}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveExam = async (req, res) => {
  try {
    const { category, exam } = req.body;

    if (!category || !exam) {
      return res.status(400).json({ message: "Category and Exam are required" });
    }

    // Development mode: return mock success
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔥 DEV MODE: Exam saved - Category: ${category}, Exam: ${exam}`);

      res.status(200).json({
        message: "Exam saved successfully",
        redirectTo: "/student/dashboard",
        devMode: true
      });
      return;
    }

    // Production mode: use database
    const userId = req.user.id;
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.selectedCategory = category;
    user.selectedExam = exam;
    await user.save();

    res.status(200).json({ message: "Exam saved successfully", redirectTo: "/student/dashboard" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.autoLogin = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    let redirectTo = "/user-details";

    if (
      user.name &&
      user.phoneNumber &&
      user.city &&
      user.gender &&
      user.dob &&
      user.selectedCategory &&
      user.selectedExam
    ) {
      redirectTo = "/";
    } else if (user.selectedCategory && !user.selectedExam) {
      redirectTo = `/exam-selection/${user.selectedCategory}`;
    } else if (!user.selectedCategory) {
      redirectTo = "/exam-category";
    }

    res.status(200).json({ exists: true, user, redirectTo });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // If you want to update user model as well:
    // const user = await User.findById(req.user.id);
    // user.profilePic = fileUrl;
    // await user.save();

    res.status(200).json({ success: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
};


exports.enrollInCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const user = await User.findById(userId);

    const alreadyEnrolled = user.enrolledCourses.some(
      (c) => c.courseId.toString() === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: "Already enrolled" });
    }

    user.enrolledCourses.push({
      courseId: courseId,
      status: "locked",
      enrolledAt: new Date(),
    });

    await user.save();
    res.status(200).json({ success: true, message: "Enrolled successfully (locked)" });
  } catch (err) {
    console.error("❌ Enroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.unlockCourseForStudent = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    const user = await User.findById(userId);

    const courseEntry = user.enrolledCourses.find(
      (c) => c.courseId.toString() === courseId
    );

    if (!courseEntry) {
      return res.status(404).json({ success: false, message: "Course not enrolled" });
    }

    if (courseEntry.status === "unlocked") {
      return res.status(400).json({ success: false, message: "Already unlocked" });
    }

    courseEntry.status = "unlocked";
    await user.save();

    res.status(200).json({ success: true, message: "Course unlocked successfully" });
  } catch (err) {
    console.error("Unlock error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getUnlockedCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 getUnlockedCourses called for user:', userId);

    // Development bypass - create demo user if it doesn't exist
    if (process.env.NODE_ENV === 'development' || userId === '507f1f77bcf86cd799439011') {
      console.log('🔧 Development mode - handling demo user');

      let demoUser = await User.findOne({ email: 'demo@test.com' });
      if (!demoUser) {
        demoUser = new User({
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
        console.log('✅ Demo user created with ID:', demoUser._id);
      }

      const unlockedCourses = demoUser.enrolledCourses
        .filter(c => c.status === "unlocked" && c.courseId)
        .map(c => ({
          _id: c._id,
          status: c.status,
          enrolledAt: c.enrolledAt,
          courseId: c.courseId,
        }));

      return res.status(200).json({ success: true, courses: unlockedCourses });
    }

    // Validate userId format - return empty array for invalid IDs instead of 400 error
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`⚠️ Invalid userId format: ${userId}, returning empty courses array`);
      return res.status(200).json({
        success: true,
        courses: []
      });
    }

    const user = await User.findById(userId).populate("enrolledCourses.courseId");

    if (!user) {
      console.log(`⚠️ User not found: ${userId}, returning empty courses array`);
      return res.status(200).json({
        success: true,
        courses: []
      });
    }

    const unlockedCourses = user.enrolledCourses
      .filter(c => c.status === "unlocked" && c.courseId)
      .map(c => ({
        _id: c._id,
        status: c.status,
        enrolledAt: c.enrolledAt,
        courseId: c.courseId, // ✅ Populated course
      }));

    res.status(200).json({ success: true, courses: unlockedCourses });

  } catch (error) {
    console.error('❌ Error in getUnlockedCourses:', error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};





exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    const options = {
      amount: amount, // Amount in paise (3000000 = ₹30,000)
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};


 // Adjust path if needed

// exports.verifyAndUnlockPayment = async (req, res) => {
//  try {
//       console.log("✅ verifyAndUnlockPayment hit with courseId:", req.body.courseId);
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

//     const key_secret = process.env.RAZORPAY_KEY_SECRET || "wlVOAREeWhLHJQrlDUr0iEn7";
//     const generated_signature = crypto
//       .createHmac("sha256", key_secret)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generated_signature !== razorpay_signature) {
//       return res.status(400).json({ success: false, message: "Invalid signature" });
//     }

//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     // Check if already enrolled
//     let courseEntry = user.enrolledCourses.find(c => c.courseId.toString() === courseId);
//     if (!courseEntry) {
//       user.enrolledCourses.push({
//         courseId,
//         status: "unlocked",
//         enrolledAt: new Date()
//       });
//     } else {
//       courseEntry.status = "unlocked";
//     }

//     await user.save();

//     return res.status(200).json({ success: true, message: "Payment verified & course unlocked", user });

//   } catch (err) {
//     console.error("❌ Verify & Unlock error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };












exports.verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing or invalid!" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "test_secret_key_for_development");

    // Development mode: return mock user data
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔥 DEV MODE: Token verified for user`, decoded);

      const mockUser = {
        _id: "dev_user_id",
        email: decoded.email,
        phoneNumber: decoded.phoneNumber,
        name: "Dev User",
        city: "",
        gender: "",
        dob: "",
        profilePic: "",
        selectedCategory: "",
        selectedExam: ""
      };

      res.status(200).json({
        message: "Token verified successfully",
        user: mockUser,
        redirectTo: "/user-details",
        devMode: true
      });
      return;
    }

    // Production mode: use database
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found!" });

    let redirectTo = "/user-details";

    if (
      user.name &&
      user.city &&
      user.gender &&
      user.dob &&
      user.selectedCategory &&
      user.selectedExam
    ) {
      redirectTo = "/";
    } else if (user.selectedCategory && !user.selectedExam) {
      redirectTo = `/exam-selection/${user.selectedCategory}`;
    } else if (!user.selectedCategory) {
      redirectTo = "/exam-category";
    }

    res.status(200).json({ user, redirectTo });
  } catch (err) {
    res.status(401).json({ message: "Token expired or invalid!" });
  }
};



// exports.verifyAndUnlockPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
//     console.log("Received courseId:", courseId);

//     const key_secret = process.env.RAZORPAY_KEY_SECRET || "wlVOAREeWhLHJQrlDUr0iEn7";
//     const generated_signature = crypto
//       .createHmac("sha256", key_secret)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generated_signature !== razorpay_signature) {
//       return res.status(400).json({ success: false, message: "Invalid signature" });
//     }

//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     console.log("User enrolledCourses:", user.enrolledCourses);

//     let courseEntry = user.enrolledCourses.find(
//       c => c.courseId && c.courseId.toString() === courseId
//     );

//     if (!courseEntry) {
//       user.enrolledCourses.push({
//         courseId,
//         status: "unlocked",
//         enrolledAt: new Date()
//       });
//       console.log(`✅ New course entry added for user ${user._id}, course ${courseId}`);
//     } else {
//       courseEntry.status = "unlocked";
//         console.log(`✅ Existing course unlocked for user ${user._id}, course ${courseId}`);
//     }

//     await user.save();
//     res.status(200).json({ success: true, message: "Payment verified & course unlocked", enrolledCourses: user.enrolledCourses });
//     console.log(`✅ User saved with unlocked courses:`, user.enrolledCourses);

//   } catch (err) {
//     console.error("❌ Verify & Unlock error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };








exports.verifyAndUnlockPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
    console.log("✅ verifyAndUnlockPayment hit with courseId:", courseId);

    // Validate required fields
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required"
      });
    }

    // For production mode, validate payment fields
    if (process.env.NODE_ENV !== 'development') {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification fields are required"
        });
      }
    }

    // Development bypass - skip signature verification, use actual user from token
    if (process.env.NODE_ENV === 'development' || (razorpay_order_id && razorpay_order_id.startsWith('dev_'))) {
      console.log('🔧 Development mode - skipping payment verification');
      console.log('🔍 Using user from token:', req.user);

      // Find user by ID from token, or use/create demo user as fallback
      let user = await User.findById(req.user.id);

      if (!user) {
        console.log('⚠️ User not found by token ID, using demo user fallback');

        // Use a consistent demo user to avoid phoneNumber conflicts
        const demoEmail = 'demo@test.com';
        user = await User.findOneAndUpdate(
          { email: demoEmail },
          {
            $setOnInsert: {
              email: demoEmail,
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
            }
          },
          { upsert: true, new: true }
        );

        console.log('✅ Using demo user:', user._id);
      }

      // Add course to enrolled courses
      const existingCourse = user.enrolledCourses.find(c => c.courseId && c.courseId.toString() === courseId);

      if (!existingCourse) {
        user.enrolledCourses.push({
          courseId,
          status: "unlocked",
          enrolledAt: new Date()
        });
        await user.save();
        console.log('✅ Course unlocked for user:', user._id);
      } else {
        console.log('ℹ️ Course already unlocked for user');
      }

      return res.status(200).json({
        success: true,
        message: "Course unlocked successfully",
        enrolledCourses: user.enrolledCourses
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || "wlVOAREeWhLHJQrlDUr0iEn7";
    const generated_signature = crypto
      .createHmac("sha256", key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let courseEntry = user.enrolledCourses.find(c => c.courseId && c.courseId.toString() === courseId);

    if (!courseEntry) {
      user.enrolledCourses.push({
        courseId,
        status: "unlocked",
        enrolledAt: new Date()
      });
      console.log(`✅ New course entry added for user ${user._id}, course ${courseId}`);
    } else {
      courseEntry.status = "unlocked";
      console.log(`✅ Existing course unlocked for user ${user._id}, course ${courseId}`);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Payment verified & course unlocked",
      enrolledCourses: user.enrolledCourses
    });

  } catch (err) {
    console.error("❌ Verify & Unlock error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
