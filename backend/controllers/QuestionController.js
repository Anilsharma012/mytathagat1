const mongoose = require("mongoose");
const Question = require("../models/test/Question");




// ✅ Create Question
const createQuestion = async (req, res) => {
  try {
    const {
      test,
      questionText,
      direction,
      options,
      correctOptionIndex,
      marks,
      negativeMarks,
      explanation,
      type,
      order
    } = req.body;

    // ✅ Validate required fields
    if (
      !test ||
      !questionText ||
      !options ||
      !Array.isArray(options) ||
      options.length < 2 ||
      correctOptionIndex === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing or invalid: test, questionText, options[2+], correctOptionIndex"
      });
    }

    // ✅ Validate correctOptionIndex
    if (correctOptionIndex >= options.length || correctOptionIndex < 0) {
      return res.status(400).json({
        success: false,
        message: "Correct option index must be within options range"
      });
    }

    const question = new Question({
      test,
      questionText,
      direction,
      options,
      correctOptionIndex,
      marks,
      negativeMarks,
      explanation,
      type,
      order
    });

    await question.save();
    console.log("✅ Question created:", question._id);

    res.status(201).json({ success: true, question });

  } catch (err) {
    console.error("❌ Question creation error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create question", error: err.message });
  }
};

// ✅ Get All Questions for a Test
const getQuestionsByTest = async (req, res) => {
  try {
    const { testId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Invalid test ID" });
    }

    const questions = await Question.find({ test: testId }).sort({ order: 1 });
    res.status(200).json({ success: true, questions });

  } catch (err) {
    console.error("❌ Question fetch error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch questions", error: err.message });
  }
};

// ✅ Update Question
const updateQuestion = async (req, res) => {
  try {
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    res.status(200).json({ success: true, question: updated });

  } catch (err) {
    console.error("❌ Update error:", err.message);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
};

// ✅ Delete Question
const deleteQuestion = async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    res.status(200).json({ success: true, message: "Question deleted" });

  } catch (err) {
    console.error("❌ Delete error:", err.message);
    res.status(500).json({ success: false, message: "Delete failed", error: err.message });
  }
};

// ✅ Get Tests by Topic ID


module.exports = {
  createQuestion,
  getQuestionsByTest,
  updateQuestion,
  deleteQuestion,
  
};
