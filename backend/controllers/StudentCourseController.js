const Course = require("../models/course/Course");
const Subject = require("../models/course/Subject");
const Chapter = require("../models/course/Chapter");
const Topic = require("../models/course/Topic");
const Test = require("../models/course/Test");
const User = require("../models/UserSchema");

// Helper function to check if student has access to course
const checkCourseAccess = async (userId, courseId) => {
  try {
    // Special case for admin dev user in development
    if (process.env.NODE_ENV === 'development' && userId === 'admin-dev-id') {
      console.log('🔧 Admin dev user detected, granting course access');
      const course = await Course.findById(courseId);
      if (!course || !course.published) {
        return { hasAccess: false, message: "Course not available" };
      }
      return { hasAccess: true, course };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { hasAccess: false, message: "User not found" };
    }

    // Check if user is enrolled and has unlocked the course
    const enrollment = user.enrolledCourses.find(
      (course) => course.courseId.toString() === courseId && course.status === "unlocked"
    );

    if (!enrollment) {
      return { hasAccess: false, message: "Course not unlocked or not enrolled" };
    }

    // Check if course is published
    const course = await Course.findById(courseId);
    if (!course || !course.published) {
      return { hasAccess: false, message: "Course not available" };
    }

    return { hasAccess: true, course };
  } catch (error) {
    console.error("Error checking course access:", error);
    return { hasAccess: false, message: "Access check failed" };
  }
};

// Get course subjects for students
exports.getStudentCourseSubjects = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check course access
    const accessCheck = await checkCourseAccess(userId, courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Get subjects for the course
    const subjects = await Subject.find({ courseId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      subjects,
      course: accessCheck.course
    });
  } catch (error) {
    console.error("Error fetching student course subjects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course subjects"
    });
  }
};

// Get chapters for a subject (with course access check)
exports.getStudentSubjectChapters = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;

    // Get subject and its course
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    // Check course access
    const accessCheck = await checkCourseAccess(userId, subject.courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Get chapters for the subject
    const chapters = await Chapter.find({ subjectId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      chapters,
      subject
    });
  } catch (error) {
    console.error("Error fetching student subject chapters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subject chapters"
    });
  }
};

// Get topics for a chapter (with course access check)
exports.getStudentChapterTopics = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user.id;

    // Get chapter and its course
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Chapter not found"
      });
    }

    // Check course access
    const accessCheck = await checkCourseAccess(userId, chapter.courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Get topics for the chapter
    const topics = await Topic.find({ chapterId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      topics,
      chapter
    });
  } catch (error) {
    console.error("Error fetching student chapter topics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapter topics"
    });
  }
};

// Get tests for a topic (with course access check)
exports.getStudentTopicTests = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user.id;

    // Get topic and its course
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found"
      });
    }

    // Check course access
    const accessCheck = await checkCourseAccess(userId, topic.courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Get tests for the topic
    const tests = await Test.find({ topicId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      tests,
      topic
    });
  } catch (error) {
    console.error("Error fetching student topic tests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch topic tests"
    });
  }
};

// Get complete course structure for students (optimized single call)
exports.getStudentCourseStructure = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check course access
    const accessCheck = await checkCourseAccess(userId, courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Get complete course structure
    const subjects = await Subject.find({ courseId }).sort({ order: 1 });
    const chapters = await Chapter.find({ courseId }).sort({ order: 1 });
    const topics = await Topic.find({ courseId }).sort({ order: 1 });
    const tests = await Test.find({ courseId }).sort({ order: 1 });

    console.log('📚 Course structure data for course:', courseId);
    console.log('📊 Subjects found:', subjects.length);
    console.log('📊 Chapters found:', chapters.length);
    console.log('📊 Topics found:', topics.length);
    console.log('📊 Tests found:', tests.length);

    subjects.forEach((subject, i) => {
      console.log(`📖 Subject ${i}: ${subject.name} (ID: ${subject._id})`);
    });

    chapters.forEach((chapter, i) => {
      console.log(`📘 Chapter ${i}: ${chapter.name} (ID: ${chapter._id}, SubjectID: ${chapter.subjectId})`);
    });

    topics.forEach((topic, i) => {
      console.log(`📝 Topic ${i}: ${topic.name} (ID: ${topic._id}, ChapterID: ${topic.chapterId})`);
    });

    tests.forEach((test, i) => {
      console.log(`🧪 Test ${i}: ${test.title || test.name} (ID: ${test._id}, TopicID: ${test.topicId})`);
    });

    // Organize the structure
    const courseStructure = subjects.map(subject => ({
      ...subject.toObject(),
      chapters: chapters
        .filter(chapter => chapter.subjectId.toString() === subject._id.toString())
        .map(chapter => ({
          ...chapter.toObject(),
          topics: topics
            .filter(topic => topic.chapterId.toString() === chapter._id.toString())
            .map(topic => ({
              ...topic.toObject(),
              tests: tests.filter(test => test.topicId.toString() === topic._id.toString())
            }))
        }))
    }));

    res.status(200).json({
      success: true,
      course: accessCheck.course,
      structure: courseStructure
    });
  } catch (error) {
    console.error("Error fetching student course structure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course structure"
    });
  }
};
