// src/services/EducationService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class EducationService {
  
  async getCourses(userEmail: string, category?: string) {
    const where: any = { isPublished: true };
    if (category) {
      where.category = category;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: [
        { rating: 'desc' },
        { enrollmentCount: 'desc' }
      ],
      include: {
        _count: {
          select: { lessons: true, enrollments: true }
        }
      }
    });

    // Check premium access
    const access = await checkFeatureAccess(userEmail, 'education.premiumCourses');
    
    return courses.map(course => ({
      ...course,
      canAccess: !course.isPremium || access.allowed,
      requiresUpgrade: course.isPremium && !access.allowed
    }));
  }

  async getCourse(courseId: string, userEmail: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { enrollments: true, reviews: true }
        }
      }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Check enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userEmail: { courseId, userEmail }
      }
    });

    // Check access
    const access = await checkFeatureAccess(userEmail, 'education.premiumCourses');
    const canAccess = !course.isPremium || access.allowed;

    return {
      ...course,
      isEnrolled: !!enrollment,
      enrollment,
      canAccess,
      requiresUpgrade: course.isPremium && !access.allowed
    };
  }

  async enrollCourse(courseId: string, userEmail: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (course.isPremium) {
      const access = await checkFeatureAccess(userEmail, 'education.premiumCourses');
      if (!access.allowed) {
        throw new Error(access.reason);
      }
    }

    const existing = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userEmail: { courseId, userEmail }
      }
    });

    if (existing) {
      throw new Error('Already enrolled in this course');
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId,
        userEmail
      }
    });

    await prisma.course.update({
      where: { id: courseId },
      data: {
        enrollmentCount: { increment: 1 }
      }
    });

    return enrollment;
  }

  async markLessonComplete(lessonId: string, userEmail: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true }
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Check enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userEmail: {
          courseId: lesson.courseId,
          userEmail
        }
      }
    });

    if (!enrollment) {
      throw new Error('Not enrolled in this course');
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        lessonId_userEmail: { lessonId, userEmail }
      },
      update: {
        isCompleted: true,
        completedAt: new Date()
      },
      create: {
        lessonId,
        userEmail,
        isCompleted: true,
        completedAt: new Date()
      }
    });

    // Update course progress
    await this.updateCourseProgress(lesson.courseId, userEmail);

    return progress;
  }

  private async updateCourseProgress(courseId: string, userEmail: string) {
    const lessons = await prisma.lesson.findMany({
      where: { courseId }
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        lesson: { courseId },
        userEmail,
        isCompleted: true
      }
    });

    const progress = lessons.length > 0 
      ? (completedLessons / lessons.length) * 100 
      : 0;

    await prisma.courseEnrollment.update({
      where: {
        courseId_userEmail: { courseId, userEmail }
      },
      data: {
        progress,
        isCompleted: progress === 100,
        completedAt: progress === 100 ? new Date() : null
      }
    });
  }

  async addReview(courseId: string, userEmail: string, rating: number, comment?: string) {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userEmail: { courseId, userEmail }
      }
    });

    if (!enrollment) {
      throw new Error('Must be enrolled to review');
    }

    const review = await prisma.courseReview.upsert({
      where: {
        courseId_userEmail: { courseId, userEmail }
      },
      update: {
        rating,
        comment
      },
      create: {
        courseId,
        userEmail,
        rating,
        comment,
        isVerified: enrollment.isCompleted
      }
    });

    // Update course rating
    await this.updateCourseRating(courseId);

    return review;
  }

  private async updateCourseRating(courseId: string) {
    const reviews = await prisma.courseReview.findMany({
      where: { courseId }
    });

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.course.update({
      where: { id: courseId },
      data: { rating: avgRating }
    });
  }
}
