import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import JoditEditor from "jodit-react";
import { toast } from "react-toastify";
import "./AddQuestion.css";

const AddQuestion = () => {
  const editor = useRef(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tests, setTests] = useState([]);

  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [test, setTest] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [correctOption, setCorrectOption] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [marks, setMarks] = useState(2);
  const [negativeMarks, setNegativeMarks] = useState(0.66);
  const [isActive, setIsActive] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem("adminToken");

  const joditConfig = {
    readonly: false,
    toolbarSticky: false,
    uploader: {
      insertImageAsBase64URI: false,
      url: "/api/upload",
      filesVariableName: function () {
        return "file";
      },
      prepareData: function (formData) {
        return formData;
      },
      isSuccess: function (resp) {
        return resp.success === true;
      },
      getMessage: function (resp) {
        return resp.message || "Upload failed";
      },
      process: function (resp) {
        return {
          files: [resp.url]
        };
      }
    },
    buttons: [
      "bold",
      "italic",
      "underline",
      "ul",
      "ol",
      "outdent",
      "indent",
      "font",
      "fontsize",
      "brush",
      "paragraph",
      "|",
      "image",
      "video",
      "table",
      "link",
      "|",
      "align",
      "undo",
      "redo",
      "hr",
      "eraser",
      "fullsize"
    ],
  };

  // Fetch courses
  useEffect(() => {
    axios.get("/api/courses", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setCourses(res.data.courses || []));
  }, []);

  // Fetch subjects
  useEffect(() => {
    if (!course) return;
    axios.get(`/api/subjects/${course}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setSubjects(res.data.subjects || []));
  }, [course]);

  // Fetch chapters
  useEffect(() => {
    if (!subject) return;
    axios.get(`/api/chapters/${subject}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setChapters(res.data.chapters || []));
  }, [subject]);

  // Fetch topics
  useEffect(() => {
    if (!chapter) return;
    axios.get(`/api/topics/${chapter}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setTopics(res.data.topics || []));
  }, [chapter]);

  // Fetch tests
  useEffect(() => {
    if (!topic) return;
    axios.get(`/api/tests/${topic}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setTests(res.data.tests || []));
  }, [topic]);

  // Fetch questions for selected test
  useEffect(() => {
    if (!test) return;
    const token = localStorage.getItem("adminToken");

    axios
      .get(`/api/questions/${test}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setQuestions(res.data.questions || []))
      .catch((err) => console.error("❌ Fetch question error:", err));
  }, [test]);

  const handleOptionChange = (optionKey, value) => {
    setOptions(prev => ({
      ...prev,
      [optionKey]: value
    }));
  };

  const validateForm = () => {
    // Check all required fields
    if (!test ||
        !questionText.trim() ||
        !options.A.trim() ||
        !options.B.trim() ||
        !options.C.trim() ||
        !options.D.trim() ||
        !correctOption ||
        !["A", "B", "C", "D"].includes(correctOption)) {
      toast.error("Fill all fields");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setCourse("");
    setSubject("");
    setChapter("");
    setTopic("");
    setTest("");
    setQuestionText("");
    setOptions({ A: "", B: "", C: "", D: "" });
    setCorrectOption("");
    setExplanation("");
    setDifficulty("Medium");
    setMarks(2);
    setNegativeMarks(0.66);
    setIsActive(true);
    setEditingQuestionId(null);
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) return;

    // Validate form
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Prepare exact POST body as specified by user
    const questionData = {
      testId: test,
      questionText: questionText.trim(),
      options: {
        A: options.A.trim(),
        B: options.B.trim(),
        C: options.C.trim(),
        D: options.D.trim()
      },
      correctOption,
      explanation: explanation.trim(),
      difficulty,
      marks: Number(marks),
      negativeMarks: Number(negativeMarks),
      isActive
    };

    try {
      const token = localStorage.getItem("adminToken");

      if (editingQuestionId) {
        await axios.put(`/api/questions/${editingQuestionId}`, questionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Question updated successfully!");
      } else {
        await axios.post(`/api/questions`, questionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Question added successfully!");
      }

      // Refresh questions list
      const res = await axios.get(`/api/questions/${test}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data.questions || []);

      // Reset form
      resetForm();

    } catch (err) {
      console.error("Submit error:", err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to save question");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const token = localStorage.getItem("adminToken");
      await axios.delete(`/api/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuestions((prev) => prev.filter((q) => q._id !== id));
      toast.success("Question deleted successfully!");
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Failed to delete question");
    }
  };

  const handleEdit = (q) => {
    setEditingQuestionId(q._id);
    setQuestionText(q.questionText);
    setOptions(q.options || { A: "", B: "", C: "", D: "" });
    setCorrectOption(q.correctOption);
    setExplanation(q.explanation || "");
    setDifficulty(q.difficulty || "Medium");
    setMarks(q.marks || 2);
    setNegativeMarks(q.negativeMarks || 0.66);
    setIsActive(q.isActive !== undefined ? q.isActive : true);
  };

  return (
    <div className="add-question-container">
      <h2>➕ Add New Question</h2>

      <div className="form-group">
        <label>Course</label>
        <select value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">-- Select Course --</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {course && (
        <div className="form-group">
          <label>Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">-- Select Subject --</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {subject && (
        <div className="form-group">
          <label>Chapter</label>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">-- Select Chapter --</option>
            {chapters.map((ch) => (
              <option key={ch._id} value={ch._id}>{ch.name}</option>
            ))}
          </select>
        </div>
      )}

      {chapter && (
        <div className="form-group">
          <label>Topic</label>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">-- Select Topic --</option>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {topic && (
        <div className="form-group">
          <label>Test</label>
          <select value={test} onChange={(e) => setTest(e.target.value)}>
            <option value="">-- Select Test --</option>
            {tests.map((t) => (
              <option key={t._id} value={t._id}>{t.title}</option>
            ))}
          </select>
        </div>
      )}

      {test && (
        <>
          <div className="form-group">
            <label>Question Text</label>
            <JoditEditor
              ref={editor}
              config={joditConfig}
              value={questionText}
              onChange={setQuestionText}
            />
          </div>

          <div className="form-group">
            <label>Options</label>
            {["A", "B", "C", "D"].map((optionKey) => (
              <div key={optionKey} style={{ marginBottom: "15px" }}>
                <label>Option {optionKey}</label>
                <JoditEditor
                  value={options[optionKey]}
                  config={joditConfig}
                  onChange={(val) => handleOptionChange(optionKey, val)}
                />
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>Correct Option</label>
            <select
              value={correctOption}
              onChange={(e) => setCorrectOption(e.target.value)}
            >
              <option value="">-- Select Correct Option --</option>
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>

          <div className="form-group">
            <label>Explanation (optional)</label>
            <JoditEditor
              ref={editor}
              config={joditConfig}
              value={explanation}
              onChange={setExplanation}
            />
          </div>

          <div className="form-group">
            <label>Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="form-group">
            <label>Marks</label>
            <input
              type="number"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label>Negative Marks</label>
            <input
              type="number"
              value={negativeMarks}
              onChange={(e) => setNegativeMarks(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? "⏳ Saving..." 
              : editingQuestionId 
                ? "✏️ Update Question" 
                : "🚀 Save Question"
            }
          </button>
        </>
      )}

      {questions.length > 0 && (
        <div className="table-wrapper">
          <h3>📝 Questions List</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Correct Option</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={q._id}>
                  <td>{i + 1}</td>
                  <td>{q.questionText?.slice(0, 60)}...</td>
                  <td>{q.correctOption}</td>
                  <td>{q.difficulty}</td>
                  <td>{q.marks}</td>
                  <td>
                    <button onClick={() => handleEdit(q)}>✏️</button>
                    <button onClick={() => handleDelete(q._id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AddQuestion;
