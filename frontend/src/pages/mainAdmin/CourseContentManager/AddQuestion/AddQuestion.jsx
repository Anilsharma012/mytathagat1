import React, { useEffect, useState, useRef  } from "react";
import axios from "axios";
import JoditEditor from "jodit-react";
 // 👈 This fixes "editor is not defined"


import "./AddQuestion.css"


const AddQuestion = () => {
const editor = useRef(null)
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
const [direction, setDirection] = useState("");
const [options, setOptions] = useState(["", "", "", ""]);

const [optionText, setOptionText] = useState("");
const [correctOptionIndex, setCorrectOptionIndex] = useState("");
const [marks, setMarks] = useState("");
const [negativeMarks, setNegativeMarks] = useState("");
const [explanation, setExplanation] = useState("");
const [questions, setQuestions] = useState([]);
const [editingQuestionId, setEditingQuestionId] = useState(null);
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

  const handleOptionChange = (index, value) => {
  const updatedOptions = [...options];
  updatedOptions[index] = value;
  setOptions(updatedOptions);
};

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



const handleSubmit = async () => {
  const trimmedOptions = options.map(opt => (typeof opt === "string" ? opt.trim() : ""));

  if (
    !test ||
    !questionText ||
    trimmedOptions.length < 2 ||
    trimmedOptions.some(opt => opt === "") ||
    correctOptionIndex === "" ||
    correctOptionIndex === null ||
    isNaN(correctOptionIndex)
  ) {
    return alert("❌ Please fill all required fields properly.");
  }

  const payload = {
    test,
    questionText,
    direction,
    options: trimmedOptions,
    correctOptionIndex: Number(correctOptionIndex),
    marks,
    negativeMarks,
    explanation,
    type: "mcq",
    order: 1,
  };

  try {
    const token = localStorage.getItem("adminToken");

    if (editingQuestionId) {
      await axios.put(`/api/questions/${editingQuestionId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Question updated!");
    } else {
      await axios.post(`/api/questions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Question added!");
    }

    const res = await axios.get(`/api/questions/${test}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setQuestions(res.data.questions || []);

    setEditingQuestionId(null);
    setQuestionText("");
    setDirection("");
    setOptions(["", "", "", ""]);
    setCorrectOptionIndex("");
    setMarks("");
    setNegativeMarks("");
    setExplanation("");
  } catch (err) {
    console.error("Submit error:", err.message);
    alert("❌ Failed to save question");
  }
};



const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this question?")) return;
  try {
    const token = localStorage.getItem("adminToken");
    await axios.delete(`/api/questions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Refresh list
    setQuestions((prev) => prev.filter((q) => q._id !== id));
    alert("✅ Deleted successfully!");
  } catch (err) {
    console.error("Delete failed", err);
    alert("❌ Delete failed");
  }
};

const handleEdit = (q) => {
  setEditingQuestionId(q._id);
  setQuestionText(q.questionText);
  setDirection(q.direction || "");
  setOptions(q.options);
  setCorrectOptionIndex(q.correctOptionIndex);
  setMarks(q.marks || "");
  setNegativeMarks(q.negativeMarks || "");
  setExplanation(q.explanation || "");
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
      <label>Direction / Paragraph (optional)</label>
      <JoditEditor
  ref={editor}
   config={joditConfig}
  value={explanation}
  onChange={setExplanation}
/>

    </div>

<div className="form-group">
  <label>Options</label>
  {options.map((opt, idx) => (
    <div key={idx} style={{ marginBottom: "15px" }}>
      <label>Option {idx + 1}</label>
      <JoditEditor
        value={opt}
         config={joditConfig}
        onChange={(val) => handleOptionChange(idx, val)}
      />
    </div>
  ))}
</div>


 <div className="form-group">
  <label>Correct Option</label>
  <select
    value={correctOptionIndex}
    onChange={(e) => setCorrectOptionIndex(parseInt(e.target.value))}
  >
    <option value="">-- Select Correct Option --</option>
    {options.map((_, idx) => (
      <option key={idx} value={idx}>
        Option {idx + 1}
      </option>
    ))}
  </select>
</div>


    <div className="form-group">
      <label>Marks</label>
      <input
        type="number"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
      />
    </div>

    <div className="form-group">
      <label>Negative Marks</label>
      <input
        type="number"
        value={negativeMarks}
        onChange={(e) => setNegativeMarks(e.target.value)}
      />
    </div>

    {/* <div className="form-group">
      <label>Explanation (optional)</label>
      <textarea
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        placeholder="Explain the answer (if needed)..."
      ></textarea>
    </div> */}

    <button className="submit-btn" onClick={handleSubmit}>
  {editingQuestionId ? "✏️ Update Question" : "🚀 Save Question"}
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
          <th>Correct</th>
          <th>Marks</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q, i) => (
          <tr key={q._id}>
            <td>{i + 1}</td>
            <td>{q.questionText.slice(0, 60)}...</td>
            <td>{q.options[q.correctOptionIndex]}</td>
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
