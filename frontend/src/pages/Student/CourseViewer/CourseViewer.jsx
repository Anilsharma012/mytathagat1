import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPlay, FiLock, FiDownload, FiCheckCircle, FiClock, FiBookOpen, FiArrowLeft } from 'react-icons/fi';
import axios from '../../../utils/axiosConfig';
import './CourseViewer.css';

const CourseViewer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [courseContent, setCourseContent] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Check if user has access to course
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      
      // Check user enrollment and access
      const accessCheck = await checkCourseAccess();
      if (!accessCheck) {
        setError('You do not have access to this course');
        setLoading(false);
        return;
      }
      
      // Load course basic info
      await loadCourseInfo();
      
      // Load course structure (subjects → chapters → topics → tests)
      await loadCourseStructure();
      
      // Load user progress
      await loadUserProgress();
      
      // Set initial active lesson (resume or first unlocked)
      await setInitialLesson();
      
    } catch (err) {
      console.error('Error loading course data:', err);
      setError('Failed to load course content');
    } finally {
      setLoading(false);
    }
  };

  const checkCourseAccess = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/user/student/my-courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const unlockedCourse = response.data.courses?.find(
        c => c.courseId._id === courseId && c.status === 'unlocked'
      );
      
      setHasAccess(!!unlockedCourse);
      return !!unlockedCourse;
    } catch (err) {
      console.error('Error checking course access:', err);
      return false;
    }
  };

  const loadCourseInfo = async () => {
    try {
      const response = await axios.get(`/api/courses/student/published-courses/${courseId}`);
      setCourse(response.data.course);
    } catch (err) {
      console.error('Error loading course info:', err);
    }
  };

  const loadCourseStructure = async () => {
    try {
      // Load subjects for this course
      const subjectsRes = await axios.get(`/api/subjects/${courseId}`);
      const subjectsData = subjectsRes.data.subjects || [];
      
      // For each subject, load chapters, topics, tests, and study materials
      const courseStructure = [];
      
      for (const subject of subjectsData) {
        const subjectNode = {
          id: subject._id,
          name: subject.name,
          type: 'subject',
          chapters: []
        };
        
        // Load chapters for this subject
        try {
          const chaptersRes = await axios.get(`/api/chapters/${subject._id}`);
          const chapters = chaptersRes.data.chapters || [];
          
          for (const chapter of chapters) {
            const chapterNode = {
              id: chapter._id,
              name: chapter.name,
              type: 'chapter',
              topics: []
            };
            
            // Load topics for this chapter
            try {
              const topicsRes = await axios.get(`/api/topics/${chapter._id}`);
              const topics = topicsRes.data.topics || [];
              
              for (const topic of topics) {
                const topicNode = {
                  id: topic._id,
                  name: topic.name,
                  type: 'topic',
                  tests: [],
                  materials: []
                };
                
                // Load tests for this topic
                try {
                  const testsRes = await axios.get(`/api/tests/${topic._id}`);
                  const tests = testsRes.data.tests || [];
                  
                  for (const test of tests) {
                    topicNode.tests.push({
                      id: test._id,
                      name: test.title,
                      type: 'test',
                      duration: test.duration,
                      totalMarks: test.totalMarks,
                      instructions: test.instructions
                    });
                  }
                } catch (testErr) {
                  console.log(`No tests found for topic ${topic.name}`);
                }
                
                chapterNode.topics.push(topicNode);
              }
            } catch (topicErr) {
              console.log(`No topics found for chapter ${chapter.name}`);
            }
            
            subjectNode.chapters.push(chapterNode);
          }
        } catch (chapterErr) {
          console.log(`No chapters found for subject ${subject.name}`);
        }
        
        courseStructure.push(subjectNode);
      }
      
      // Also load study materials for this course
      try {
        const materialsRes = await axios.get(`/api/study-materials/student?courseId=${courseId}`);
        const materials = materialsRes.data.materials || [];
        
        // Organize materials by subject/chapter if possible, or add to general section
        materials.forEach(material => {
          const materialNode = {
            id: material._id,
            name: material.title,
            type: material.type.toLowerCase(), // PDF, Video, Notes
            fileName: material.fileName,
            fileSize: material.fileSize,
            downloadUrl: `/api/study-materials/download/${material._id}`
          };
          
          // For now, add materials to first subject or create a general section
          if (courseStructure.length > 0) {
            if (!courseStructure[0].materials) {
              courseStructure[0].materials = [];
            }
            courseStructure[0].materials.push(materialNode);
          }
        });
      } catch (materialErr) {
        console.log('No study materials found for this course');
      }
      
      setCourseContent(courseStructure);
      setSubjects(subjectsData);
      
    } catch (err) {
      console.error('Error loading course structure:', err);
    }
  };

  const loadUserProgress = async () => {
    // TODO: Implement user progress tracking
    // For now, set empty progress
    setUserProgress({});
  };

  const setInitialLesson = async () => {
    // TODO: Implement resume functionality
    // For now, set first available lesson
    if (courseContent.length > 0) {
      const firstLesson = findFirstAvailableLesson(courseContent);
      if (firstLesson) {
        setActiveLesson(firstLesson);
      }
    }
  };

  const findFirstAvailableLesson = (content) => {
    for (const subject of content) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          if (topic.tests.length > 0) {
            return topic.tests[0];
          }
          if (topic.materials && topic.materials.length > 0) {
            return topic.materials[0];
          }
        }
      }
      if (subject.materials && subject.materials.length > 0) {
        return subject.materials[0];
      }
    }
    return null;
  };

  const handleLessonSelect = (lesson) => {
    setActiveLesson(lesson);
  };

  const renderSidebar = () => (
    <div className="course-sidebar">
      <div className="sidebar-header">
        <button className="back-btn" onClick={() => navigate('/student/dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
      </div>
      
      <div className="course-modules">
        {courseContent.map((subject) => (
          <div key={subject.id} className="module-section">
            <div className="module-header">
              <FiBookOpen />
              <span>{subject.name}</span>
            </div>
            
            {subject.chapters.map((chapter) => (
              <div key={chapter.id} className="chapter-section">
                <div className="chapter-title">{chapter.name}</div>
                
                {chapter.topics.map((topic) => (
                  <div key={topic.id} className="topic-section">
                    <div className="topic-title">{topic.name}</div>
                    
                    {/* Render tests */}
                    {topic.tests.map((test) => (
                      <div
                        key={test.id}
                        className={`lesson-item ${activeLesson?.id === test.id ? 'active' : ''}`}
                        onClick={() => handleLessonSelect(test)}
                      >
                        <div className="lesson-icon">
                          <FiCheckCircle />
                        </div>
                        <div className="lesson-info">
                          <div className="lesson-title">{test.name}</div>
                          <div className="lesson-meta">
                            <FiClock /> {test.duration} min
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Render materials */}
                    {topic.materials && topic.materials.map((material) => (
                      <div
                        key={material.id}
                        className={`lesson-item ${activeLesson?.id === material.id ? 'active' : ''}`}
                        onClick={() => handleLessonSelect(material)}
                      >
                        <div className="lesson-icon">
                          {material.type === 'video' ? <FiPlay /> : <FiDownload />}
                        </div>
                        <div className="lesson-info">
                          <div className="lesson-title">{material.name}</div>
                          <div className="lesson-meta">{material.type.toUpperCase()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Subject-level materials */}
            {subject.materials && subject.materials.map((material) => (
              <div
                key={material.id}
                className={`lesson-item ${activeLesson?.id === material.id ? 'active' : ''}`}
                onClick={() => handleLessonSelect(material)}
              >
                <div className="lesson-icon">
                  {material.type === 'video' ? <FiPlay /> : <FiDownload />}
                </div>
                <div className="lesson-info">
                  <div className="lesson-title">{material.name}</div>
                  <div className="lesson-meta">{material.type.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMainContent = () => (
    <div className="course-main-content">
      {activeLesson ? (
        <div className="lesson-player">
          {activeLesson.type === 'test' ? (
            <div className="test-content">
              <div className="test-header">
                <h2>{activeLesson.name}</h2>
                <div className="test-meta">
                  <span><FiClock /> {activeLesson.duration} minutes</span>
                  <span>Total Marks: {activeLesson.totalMarks}</span>
                </div>
              </div>
              <div className="test-instructions">
                <h3>Instructions:</h3>
                <p>{activeLesson.instructions || 'No specific instructions provided.'}</p>
              </div>
              <div className="test-actions">
                <button className="start-test-btn primary">
                  <FiPlay /> Start Test
                </button>
              </div>
            </div>
          ) : activeLesson.type === 'video' ? (
            <div className="video-content">
              <div className="video-header">
                <h2>{activeLesson.name}</h2>
              </div>
              <div className="video-placeholder">
                <FiPlay size={64} />
                <p>Video player will be implemented here</p>
                <p>File: {activeLesson.fileName}</p>
              </div>
            </div>
          ) : (
            <div className="document-content">
              <div className="document-header">
                <h2>{activeLesson.name}</h2>
                <div className="document-actions">
                  <a 
                    href={activeLesson.downloadUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="download-btn"
                  >
                    <FiDownload /> Download {activeLesson.type.toUpperCase()}
                  </a>
                </div>
              </div>
              <div className="document-preview">
                <p>Document preview will be implemented here</p>
                <p>File: {activeLesson.fileName}</p>
                <p>Size: {(activeLesson.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-lesson-selected">
          <FiBookOpen size={64} />
          <h3>Select a lesson to begin</h3>
          <p>Choose from the modules on the left to start learning</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="course-viewer loading">
        <div className="loading-spinner">Loading course content...</div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="course-viewer error">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>{error || 'You do not have access to this course'}</p>
          <button onClick={() => navigate('/student/dashboard')} className="back-btn">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-viewer">
      {/* Header */}
      <div className="course-header">
        <div className="course-title">
          <h1>{course?.name || 'Course Content'}</h1>
          <div className="course-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '45%' }}></div>
            </div>
            <span className="progress-text">45% Complete</span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="course-layout">
        {renderSidebar()}
        {renderMainContent()}
      </div>
    </div>
  );
};

export default CourseViewer;
