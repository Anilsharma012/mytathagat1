const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    default: "",
  },
  options: {
    type: [String],
    required: true,
    validate: [(val) => val.length >= 2, "At least 2 options required"],
  },
  correctOptionIndex: {
    type: Number,
    required: true, // 0 for A, 1 for B...
  },
  marks: {
    type: Number,
    default: 3,
  },
  negativeMarks: {
    type: Number,
    default: 1,
  },
  explanation: {
    type: String,
    default: "",
  },
  type: { type: String, enum: ["mcq", "numeric"], lowercase: true, default: "mcq" },

  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.models.Question || mongoose.model("Question", questionSchema);
