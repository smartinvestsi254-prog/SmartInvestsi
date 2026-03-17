/**
 * Banking Academy API for SmartInvest
 * Handles educational content, courses, and learning paths
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface Course {
  id: string;
  title: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'premium';
  duration: number; // in minutes
  modules: Module[];
  prerequisites: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Module {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  quiz?: Quiz;
  order: number;
  duration: number;
}

interface Quiz {
  questions: Question[];
  passingScore: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface UserProgress {
  userId: string;
  courseId: string;
  completedModules: string[];
  quizScores: { [moduleId: string]: number };
  startedAt: string;
  completedAt?: string;
  certificateEarned: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: string[]; // course IDs in order
  estimatedDuration: number;
  targetAudience: string;
  outcomes: string[];
}

// Mock data - replace with real content management system
const mockCourses: Course[] = [
  {
    id: 'investing-basics',
    title: 'Investing Basics',
    description: 'Learn the fundamentals of investing and portfolio management',
    category: 'beginner',
    duration: 120,
    modules: [
      {
        id: 'what-is-investing',
        title: 'What is Investing?',
        content: 'Understanding the basics of investment and why it matters...',
        order: 1,
        duration: 15
      },
      {
        id: 'asset-classes',
        title: 'Asset Classes',
        content: 'Stocks, bonds, ETFs, and other investment vehicles...',
        order: 2,
        duration: 20,
        quiz: {
          questions: [
            {
              id: 'q1',
              question: 'What is diversification?',
              options: ['Putting all money in one stock', 'Spreading investments across different assets', 'Only investing in bonds'],
              correctAnswer: 1,
              explanation: 'Diversification means spreading investments to reduce risk.'
            }
          ],
          passingScore: 70
        }
      }
    ],
    prerequisites: [],
    tags: ['investing', 'basics', 'portfolio'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'crypto-trading',
    title: 'Cryptocurrency Trading',
    description: 'Master crypto trading strategies and risk management',
    category: 'intermediate',
    duration: 180,
    modules: [
      {
        id: 'crypto-basics',
        title: 'Cryptocurrency Basics',
        content: 'Understanding blockchain, wallets, and digital assets...',
        order: 1,
        duration: 25
      },
      {
        id: 'trading-strategies',
        title: 'Trading Strategies',
        content: 'Technical analysis, chart patterns, and trading signals...',
        order: 2,
        duration: 35
      }
    ],
    prerequisites: ['investing-basics'],
    tags: ['crypto', 'trading', 'blockchain'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockLearningPaths: LearningPath[] = [
  {
    id: 'investor-journey',
    title: 'Complete Investor Journey',
    description: 'From beginner to advanced investor',
    courses: ['investing-basics', 'crypto-trading'],
    estimatedDuration: 300,
    targetAudience: 'New investors',
    outcomes: ['Build diversified portfolio', 'Understand market analysis', 'Master risk management']
  }
];

const mockUserProgress: UserProgress[] = [];

/**
 * Get all courses
 */
async function getCourses(category?: string, tags?: string[]): Promise<any> {
  try {
    let courses = mockCourses;

    if (category) {
      courses = courses.filter(c => c.category === category);
    }

    if (tags && tags.length > 0) {
      courses = courses.filter(c => tags.some(tag => c.tags.includes(tag)));
    }

    return { success: true, data: courses };
  } catch (error) {
    logger.error('Get courses error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get course by ID
 */
async function getCourse(courseId: string): Promise<any> {
  try {
    const course = mockCourses.find(c => c.id === courseId);

    if (!course) {
      return { success: false, error: 'Course not found' };
    }

    return { success: true, data: course };
  } catch (error) {
    logger.error('Get course error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get course modules
 */
async function getCourseModules(courseId: string): Promise<any> {
  try {
    const course = mockCourses.find(c => c.id === courseId);

    if (!course) {
      return { success: false, error: 'Course not found' };
    }

    return { success: true, data: course.modules };
  } catch (error) {
    logger.error('Get course modules error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get learning paths
 */
async function getLearningPaths(): Promise<any> {
  try {
    return { success: true, data: mockLearningPaths };
  } catch (error) {
    logger.error('Get learning paths error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Start course for user
 */
async function startCourse(data: any): Promise<any> {
  try {
    const { userId, courseId } = data;

    // Check if user already has progress
    let progress = mockUserProgress.find(p => p.userId === userId && p.courseId === courseId);

    if (!progress) {
      progress = {
        userId,
        courseId,
        completedModules: [],
        quizScores: {},
        startedAt: new Date().toISOString(),
        certificateEarned: false
      };

      mockUserProgress.push(progress);
    }

    logger.info('Course started', { userId, courseId });

    return { success: true, data: progress };
  } catch (error) {
    logger.error('Start course error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update user progress
 */
async function updateProgress(data: any): Promise<any> {
  try {
    const { userId, courseId, moduleId, completed, quizScore } = data;

    let progress = mockUserProgress.find(p => p.userId === userId && p.courseId === courseId);

    if (!progress) {
      return { success: false, error: 'Progress not found. Please start the course first.' };
    }

    if (completed && !progress.completedModules.includes(moduleId)) {
      progress.completedModules.push(moduleId);
    }

    if (quizScore !== undefined) {
      progress.quizScores[moduleId] = quizScore;
    }

    // Check if course is completed
    const course = mockCourses.find(c => c.id === courseId);
    if (course && progress.completedModules.length === course.modules.length) {
      progress.completedAt = new Date().toISOString();
      progress.certificateEarned = true;
    }

    logger.info('Progress updated', { userId, courseId, moduleId, completed });

    return { success: true, data: progress };
  } catch (error) {
    logger.error('Update progress error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user progress
 */
async function getUserProgress(userId: string, courseId?: string): Promise<any> {
  try {
    let progress = mockUserProgress.filter(p => p.userId === userId);

    if (courseId) {
      progress = progress.filter(p => p.courseId === courseId);
    }

    return { success: true, data: progress };
  } catch (error) {
    logger.error('Get user progress error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Submit quiz answers
 */
async function submitQuiz(data: any): Promise<any> {
  try {
    const { userId, courseId, moduleId, answers } = data;

    const course = mockCourses.find(c => c.id === courseId);
    if (!course) {
      return { success: false, error: 'Course not found' };
    }

    const module = course.modules.find(m => m.id === moduleId);
    if (!module || !module.quiz) {
      return { success: false, error: 'Quiz not found' };
    }

    let correctAnswers = 0;
    const results = [];

    for (let i = 0; i < module.quiz.questions.length; i++) {
      const question = module.quiz.questions[i];
      const userAnswer = answers[i];
      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) correctAnswers++;

      results.push({
        questionId: question.id,
        correct: isCorrect,
        explanation: question.explanation
      });
    }

    const score = (correctAnswers / module.quiz.questions.length) * 100;
    const passed = score >= module.quiz.passingScore;

    // Update progress
    await updateProgress({ userId, courseId, moduleId, completed: passed, quizScore: score });

    return {
      success: true,
      data: {
        score,
        passed,
        correctAnswers,
        totalQuestions: module.quiz.questions.length,
        results
      }
    };
  } catch (error) {
    logger.error('Submit quiz error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user certificates
 */
async function getCertificates(userId: string): Promise<any> {
  try {
    const completedCourses = mockUserProgress.filter(
      p => p.userId === userId && p.certificateEarned
    );

    const certificates = completedCourses.map(progress => {
      const course = mockCourses.find(c => c.id === progress.courseId);
      return {
        courseId: progress.courseId,
        courseTitle: course?.title,
        completedAt: progress.completedAt,
        certificateUrl: `/certificates/${progress.courseId}/${userId}.pdf`
      };
    });

    return { success: true, data: certificates };
  } catch (error) {
    logger.error('Get certificates error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get recommended courses
 */
async function getRecommendedCourses(userId: string): Promise<any> {
  try {
    const userProgress = mockUserProgress.filter(p => p.userId === userId);
    const completedCourseIds = userProgress.map(p => p.courseId);

    // Simple recommendation logic
    const recommended = mockCourses.filter(course => {
      // Recommend courses user hasn't completed
      if (completedCourseIds.includes(course.id)) return false;

      // Check prerequisites
      return course.prerequisites.every(prereq => completedCourseIds.includes(prereq));
    });

    return { success: true, data: recommended };
  } catch (error) {
    logger.error('Get recommended courses error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Search courses
 */
async function searchCourses(query: string): Promise<any> {
  try {
    const lowercaseQuery = query.toLowerCase();

    const results = mockCourses.filter(course =>
      course.title.toLowerCase().includes(lowercaseQuery) ||
      course.description.toLowerCase().includes(lowercaseQuery) ||
      course.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );

    return { success: true, data: results };
  } catch (error) {
    logger.error('Search courses error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/courses') && httpMethod === 'GET') {
      const category = new URLSearchParams(path.split('?')[1] || '').get('category');
      const tags = new URLSearchParams(path.split('?')[1] || '').get('tags')?.split(',');
      result = await getCourses(category, tags);
    } else if (path.includes('/courses/') && path.split('/courses/')[1] && !path.includes('/modules') && !path.includes('/start') && !path.includes('/progress')) {
      const courseId = path.split('/courses/')[1].split('/')[0];
      result = await getCourse(courseId);
    } else if (path.includes('/courses/') && path.includes('/modules')) {
      const courseId = path.split('/courses/')[1].split('/')[0];
      result = await getCourseModules(courseId);
    } else if (path.includes('/courses/') && path.includes('/start')) {
      result = await startCourse(data);
    } else if (path.includes('/progress')) {
      if (httpMethod === 'GET') {
        const courseId = new URLSearchParams(path.split('?')[1] || '').get('courseId');
        result = await getUserProgress(userId, courseId);
      } else {
        result = await updateProgress(data);
      }
    } else if (path.includes('/learning-paths')) {
      result = await getLearningPaths();
    } else if (path.includes('/quiz/submit')) {
      result = await submitQuiz(data);
    } else if (path.includes('/certificates')) {
      result = await getCertificates(userId);
    } else if (path.includes('/recommended')) {
      result = await getRecommendedCourses(userId);
    } else if (path.includes('/search')) {
      const query = new URLSearchParams(path.split('?')[1] || '').get('q') || '';
      result = await searchCourses(query);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Endpoint not found' })
      };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Banking Academy API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};