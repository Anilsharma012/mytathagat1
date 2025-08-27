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
      const token = localStorage.getItem('authToken');

      // Use the optimized student course structure endpoint
      const structureRes = await axios.get(`/api/student/course/${courseId}/structure`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!structureRes.data.success) {
        throw new Error(structureRes.data.message || 'Failed to load course structure');
      }

      const { structure, course } = structureRes.data;

      console.log('📚 Raw course structure from backend:', structure);
      console.log('📊 Structure length:', structure?.length);
      structure?.forEach((subject, i) => {
        console.log(`📖 Subject ${i}:`, subject.name, 'Chapters:', subject.chapters?.length);
        subject.chapters?.forEach((chapter, j) => {
          console.log(`  📘 Chapter ${j}:`, chapter.name, 'Topics:', chapter.topics?.length);
          chapter.topics?.forEach((topic, k) => {
            console.log(`    📝 Topic ${k}:`, topic.name, 'Tests:', topic.tests?.length);
          });
        });
      });

      // Transform the structure to match the expected format
      const courseStructure = structure.map(subject => ({
        id: subject._id,
        name: subject.name,
        type: 'subject',
        chapters: subject.chapters.map(chapter => ({
          id: chapter._id,
          name: chapter.name,
          type: 'chapter',
          topics: chapter.topics.map(topic => ({
            id: topic._id,
            name: topic.name,
            type: 'topic',
            tests: topic.tests.map(test => ({
              id: test._id,
              name: test.title || test.name,
              type: 'test',
              duration: test.duration,
              totalMarks: test.totalMarks,
              instructions: test.instructions
            })),
            materials: []
          }))
        })),
        materials: []
      }));

      // Load study materials for this course
      try {
        const materialsRes = await axios.get(`/api/study-materials/student?courseId=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const materials = materialsRes.data.materials || [];

        // Add materials to the first subject or create a general section
        materials.forEach(material => {
          const materialNode = {
            id: material._id,
            name: material.title,
            type: material.type.toLowerCase(), // PDF, Video, Notes
            fileName: material.fileName,
            fileSize: material.fileSize,
            downloadUrl: `/api/study-materials/download/${material._id}`
          };

          // Add to first subject if available
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

      console.log('🎯 Final transformed course structure:', courseStructure);
      console.log('🎯 Total subjects:', courseStructure.length);
      courseStructure.forEach((subject, i) => {
        console.log(`🎯 Final Subject ${i}:`, subject.name);
        console.log(`   Chapters: ${subject.chapters?.length}`);
        console.log(`   Materials: ${subject.materials?.length}`);
        subject.chapters?.forEach((chapter, j) => {
          console.log(`   Chapter ${j}: ${chapter.name} (Topics: ${chapter.topics?.length})`);
          chapter.topics?.forEach((topic, k) => {
            console.log(`     Topic ${k}: ${topic.name} (Tests: ${topic.tests?.length})`);
          });
        });
      });

      setCourseContent(courseStructure);
      setSubjects(structure); // Set the original structure for reference

    } catch (err) {
      console.error('Error loading course structure:', err);
      throw err; // Re-throw to be handled by parent function
    }
  };

  const loadUserProgress = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`/api/progress/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUserProgress(response.data.progress);
      }
    } catch (err) {
      console.error('Error loading user progress:', err);
      setUserProgress({});
    }
  };

  const setInitialLesson = async () => {
    try {
      // Try to get resume lesson from API
      const token = localStorage.getItem('authToken');
      const resumeResponse = await axios.get(`/api/progress/course/${courseId}/resume`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resumeResponse.data.success && resumeResponse.data.resumeLesson) {
        const resumeLesson = resumeResponse.data.resumeLesson;
        const lesson = findLessonById(resumeLesson.lessonId, resumeLesson.lessonType);
        if (lesson) {
          setActiveLesson(lesson);
          return;
        }
      }
    } catch (err) {
      console.log('No resume lesson found, starting with first available lesson');
    }

    // Fallback to first available lesson
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

  const findLessonById = (lessonId, lessonType) => {
    for (const subject of courseContent) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          // Check tests
          const test = topic.tests.find(t => t.id === lessonId && t.type === lessonType);
          if (test) return test;

          // Check materials
          if (topic.materials) {
            const material = topic.materials.find(m => m.id === lessonId && m.type === lessonType);
            if (material) return material;
          }
        }
      }

      // Check subject-level materials
      if (subject.materials) {
        const material = subject.materials.find(m => m.id === lessonId && m.type === lessonType);
        if (material) return material;
      }
    }
    return null;
  };

  const handleLessonSelect = async (lesson) => {
    setActiveLesson(lesson);

    // Track lesson start
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/progress/course/${courseId}/start-lesson`, {
        lessonId: lesson.id,
        lessonType: lesson.type
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error tracking lesson start:', err);
    }
  };

  const updateLessonProgress = async (lessonId, lessonType, progressData) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/progress/course/${courseId}/lesson`, {
        lessonId,
        lessonType,
        ...progressData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reload user progress to update UI
      await loadUserProgress();
    } catch (err) {
      console.error('Error updating lesson progress:', err);
    }
  };

  const getLessonProgress = (lessonId) => {
    if (!userProgress.lessonProgress) return { status: 'not_started', progress: 0 };

    const lesson = userProgress.lessonProgress.find(l => l.lessonId === lessonId);
    return lesson || { status: 'not_started', progress: 0 };
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
                    {topic.tests.map((test) => {
                      const progress = getLessonProgress(test.id);
                      return (
                        <div
                          key={test.id}
                          className={`lesson-item ${activeLesson?.id === test.id ? 'active' : ''} ${progress.status}`}
                          onClick={() => handleLessonSelect(test)}
                        >
                          <div className="lesson-icon">
                            {progress.status === 'completed' ? (
                              <FiCheckCircle className="completed" />
                            ) : progress.status === 'in_progress' ? (
                              <FiPlay className="in-progress" />
                            ) : (
                              <FiClock className="not-started" />
                            )}
                          </div>
                          <div className="lesson-info">
                            <div className="lesson-title">{test.name}</div>
                            <div className="lesson-meta">
                              <FiClock /> {test.duration} min
                              {progress.progress > 0 && (
                                <span className="progress-indicator">
                                  {progress.progress}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Render materials */}
                    {topic.materials && topic.materials.map((material) => {
                      const progress = getLessonProgress(material.id);
                      return (
                        <div
                          key={material.id}
                          className={`lesson-item ${activeLesson?.id === material.id ? 'active' : ''} ${progress.status}`}
                          onClick={() => handleLessonSelect(material)}
                        >
                          <div className="lesson-icon">
                            {progress.status === 'completed' ? (
                              <FiCheckCircle className="completed" />
                            ) : material.type === 'video' ? (
                              <FiPlay className={progress.status === 'in_progress' ? 'in-progress' : 'not-started'} />
                            ) : (
                              <FiDownload className={progress.status === 'in_progress' ? 'in-progress' : 'not-started'} />
                            )}
                          </div>
                          <div className="lesson-info">
                            <div className="lesson-title">{material.name}</div>
                            <div className="lesson-meta">
                              {material.type.toUpperCase()}
                              {progress.progress > 0 && (
                                <span className="progress-indicator">
                                  {progress.progress}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
              <div
                className="progress-fill"
                style={{ width: `${userProgress.overallProgress || 0}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {userProgress.overallProgress || 0}% Complete
            </span>
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
