const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    published: {
  type: Boolean,
  default: false,
},
    
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ NEW: Lock/unlock support (default locked)
    locked: {
      type: Boolean,
      default: true,
    },

    // ✅ NEW: Created by admin or subadmin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "Admin" based on your schema
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
