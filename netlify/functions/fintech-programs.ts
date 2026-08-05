/**
 * Fintech Programs API for SmartInvest
 * Handles fintech programs, partnerships, and related initiatives
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface FintechProgram {
  id: string;
  title: string;
  description: string;
  category: 'education' | 'incubation' | 'investment' | 'partnership' | 'research';
  status: 'active' | 'upcoming' | 'completed';
  targetAudience: string[];
  duration: string;
  benefits: string[];
  requirements: string[];
  applicationDeadline?: string;
  maxParticipants?: number;
  currentParticipants: number;
  partners: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProgramApplication {
  id: string;
  programId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  appliedAt: string;
  documents: string[];
  notes?: string;
}

interface Partnership {
  id: string;
  name: string;
  type: 'bank' | 'fintech' | 'university' | 'government' | 'corporation';
  description: string;
  benefits: string[];
  contactInfo: {
    email: string;
    website?: string;
  };
  activePrograms: string[];
  joinedAt: string;
}

interface ResearchProject {
  id: string;
  title: string;
  description: string;
  leadResearcher: string;
  institutions: string[];
  funding: number;
  status: 'planning' | 'active' | 'completed' | 'published';
  publications: string[];
  startDate: string;
  endDate?: string;
}

// Mock data - replace with real database
const mockPrograms: FintechProgram[] = [
  {
    id: 'startup-incubator-2024',
    title: 'Fintech Startup Incubator Program',
    description: 'Accelerate fintech startups with mentorship, funding, and market access',
    category: 'incubation',
    status: 'active',
    targetAudience: ['early-stage startups', 'fintech entrepreneurs'],
    duration: '6 months',
    benefits: [
      'Mentorship from industry experts',
      'Seed funding up to $50,000',
      'Office space and infrastructure',
      'Market access and partnerships',
      'Technical support and training'
    ],
    requirements: [
      'Fintech focus',
      'Minimum viable product',
      'Team of at least 2 people',
      'Commitment to 6-month program'
    ],
    applicationDeadline: '2024-12-31T23:59:59Z',
    maxParticipants: 20,
    currentParticipants: 12,
    partners: ['KCB Bank', 'Equity Bank', 'Google for Startups'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'women-in-fintech',
    title: 'Women in Fintech Leadership Program',
    description: 'Empowering women leaders in the fintech industry',
    category: 'education',
    status: 'active',
    targetAudience: ['women in fintech', 'female entrepreneurs'],
    duration: '12 months',
    benefits: [
      'Leadership training',
      'Networking opportunities',
      'Mentorship program',
      'Access to funding',
      'Career advancement support'
    ],
    requirements: [
      'Identification as woman',
      'Fintech industry experience',
      'Commitment to program activities'
    ],
    maxParticipants: 50,
    currentParticipants: 35,
    partners: ['UN Women', 'World Bank', 'IFC'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'api-developer-program',
    title: 'API Developer Partnership Program',
    description: 'Build integrations and expand fintech ecosystem',
    category: 'partnership',
    status: 'active',
    targetAudience: ['developers', 'fintech companies', 'integrators'],
    duration: 'Ongoing',
    benefits: [
      'API documentation and support',
      'Sandbox environment access',
      'Co-marketing opportunities',
      'Revenue sharing',
      'Technical certification'
    ],
    requirements: [
      'Technical expertise',
      'Compliance with API guidelines',
      'Regular reporting'
    ],
    currentParticipants: 25,
    partners: ['Stripe', 'PayPal', 'Flutterwave'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockApplications: ProgramApplication[] = [];
const mockPartnerships: Partnership[] = [
  {
    id: 'kcb-bank',
    name: 'KCB Bank',
    type: 'bank',
    description: 'Leading commercial bank in Kenya providing banking and fintech solutions',
    benefits: ['Banking APIs', 'Payment processing', 'Financial data'],
    contactInfo: {
      email: 'partnerships@kcb.co.ke',
      website: 'https://www.kcb.co.ke'
    },
    activePrograms: ['startup-incubator-2024', 'api-developer-program'],
    joinedAt: '2023-01-01T00:00:00Z'
  }
];

const mockResearch: ResearchProject[] = [
  {
    id: 'blockchain-adoption',
    title: 'Blockchain Technology Adoption in Emerging Markets',
    description: 'Research on blockchain adoption patterns and barriers in developing economies',
    leadResearcher: 'Dr. Sarah Johnson',
    institutions: ['University of Nairobi', 'MIT Media Lab'],
    funding: 250000,
    status: 'active',
    publications: [],
    startDate: '2024-01-01T00:00:00Z'
  }
];

/**
 * Get all fintech programs
 */
async function getPrograms(category?: string, status?: string): Promise<any> {
  try {
    let programs = mockPrograms;

    if (category) {
      programs = programs.filter(p => p.category === category);
    }

    if (status) {
      programs = programs.filter(p => p.status === status);
    }

    return { success: true, data: programs };
  } catch (error) {
    logger.error('Get programs error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get program by ID
 */
async function getProgram(programId: string): Promise<any> {
  try {
    const program = mockPrograms.find(p => p.id === programId);

    if (!program) {
      return { success: false, error: 'Program not found' };
    }

    return { success: true, data: program };
  } catch (error) {
    logger.error('Get program error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Apply for program
 */
async function applyForProgram(data: any): Promise<any> {
  try {
    const { userId, programId, documents, notes } = data;

    const program = mockPrograms.find(p => p.id === programId);
    if (!program) {
      return { success: false, error: 'Program not found' };
    }

    if (program.status !== 'active') {
      return { success: false, error: 'Program is not accepting applications' };
    }

    if (program.maxParticipants && program.currentParticipants >= program.maxParticipants) {
      return { success: false, error: 'Program is at capacity' };
    }

    // Check if user already applied
    const existingApplication = mockApplications.find(
      a => a.userId === userId && a.programId === programId
    );

    if (existingApplication) {
      return { success: false, error: 'Already applied to this program' };
    }

    const application: ProgramApplication = {
      id: `app_${Date.now()}`,
      programId,
      userId,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      documents: documents || [],
      notes
    };

    mockApplications.push(application);

    logger.info('Program application submitted', { userId, programId, applicationId: application.id });

    return { success: true, data: application };
  } catch (error) {
    logger.error('Apply for program error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user applications
 */
async function getUserApplications(userId: string): Promise<any> {
  try {
    const applications = mockApplications.filter(a => a.userId === userId);

    // Include program details
    const applicationsWithPrograms = applications.map(app => {
      const program = mockPrograms.find(p => p.id === app.programId);
      return {
        ...app,
        program: program ? {
          title: program.title,
          category: program.category,
          status: program.status
        } : null
      };
    });

    return { success: true, data: applicationsWithPrograms };
  } catch (error) {
    logger.error('Get user applications error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get partnerships
 */
async function getPartnerships(type?: string): Promise<any> {
  try {
    let partnerships = mockPartnerships;

    if (type) {
      partnerships = partnerships.filter(p => p.type === type);
    }

    return { success: true, data: partnerships };
  } catch (error) {
    logger.error('Get partnerships error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get research projects
 */
async function getResearchProjects(status?: string): Promise<any> {
  try {
    let projects = mockResearch;

    if (status) {
      projects = projects.filter(p => p.status === status);
    }

    return { success: true, data: projects };
  } catch (error) {
    logger.error('Get research projects error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Submit partnership inquiry
 */
async function submitPartnershipInquiry(data: any): Promise<any> {
  try {
    const { name, type, description, contactInfo, proposedBenefits } = data;

    const inquiry = {
      id: `inquiry_${Date.now()}`,
      name,
      type,
      description,
      contactInfo,
      proposedBenefits,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };

    logger.info('Partnership inquiry submitted', { name, type });

    return { success: true, data: inquiry };
  } catch (error) {
    logger.error('Submit partnership inquiry error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get program statistics
 */
async function getProgramStats(): Promise<any> {
  try {
    const stats = {
      totalPrograms: mockPrograms.length,
      activePrograms: mockPrograms.filter(p => p.status === 'active').length,
      totalApplications: mockApplications.length,
      pendingApplications: mockApplications.filter(a => a.status === 'pending').length,
      approvedApplications: mockApplications.filter(a => a.status === 'approved').length,
      totalPartnerships: mockPartnerships.length,
      activeResearch: mockResearch.filter(r => r.status === 'active').length
    };

    return { success: true, data: stats };
  } catch (error) {
    logger.error('Get program stats error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get upcoming programs
 */
async function getUpcomingPrograms(): Promise<any> {
  try {
    const upcoming = mockPrograms.filter(p => p.status === 'upcoming');

    return { success: true, data: upcoming };
  } catch (error) {
    logger.error('Get upcoming programs error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Recommend programs for user
 */
async function getRecommendedPrograms(userId: string): Promise<any> {
  try {
    // Simple recommendation logic based on user profile
    // In production, use ML/AI for better recommendations
    const userApplications = mockApplications.filter(a => a.userId === userId);
    const appliedProgramIds = userApplications.map(a => a.programId);

    const recommended = mockPrograms.filter(program => {
      // Don't recommend programs user already applied to
      if (appliedProgramIds.includes(program.id)) return false;

      // Recommend based on category preferences (mock logic)
      return program.status === 'active';
    });

    return { success: true, data: recommended.slice(0, 5) }; // Top 5 recommendations
  } catch (error) {
    logger.error('Get recommended programs error', { error: error.message });
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

    if (path.includes('/programs') && httpMethod === 'GET' && !path.includes('/apply') && !path.includes('/applications') && !path.includes('/recommended') && !path.includes('/upcoming')) {
      const category = new URLSearchParams(path.split('?')[1] || '').get('category');
      const status = new URLSearchParams(path.split('?')[1] || '').get('status');
      result = await getPrograms(category, status);
    } else if (path.includes('/programs/') && path.split('/programs/')[1] && !path.includes('/apply') && !path.includes('/applications')) {
      const programId = path.split('/programs/')[1].split('/')[0];
      result = await getProgram(programId);
    } else if (path.includes('/programs/apply')) {
      result = await applyForProgram(data);
    } else if (path.includes('/applications')) {
      result = await getUserApplications(userId);
    } else if (path.includes('/recommended')) {
      result = await getRecommendedPrograms(userId);
    } else if (path.includes('/upcoming')) {
      result = await getUpcomingPrograms();
    } else if (path.includes('/partnerships')) {
      if (httpMethod === 'GET') {
        const type = new URLSearchParams(path.split('?')[1] || '').get('type');
        result = await getPartnerships(type);
      } else {
        result = await submitPartnershipInquiry(data);
      }
    } else if (path.includes('/research')) {
      const status = new URLSearchParams(path.split('?')[1] || '').get('status');
      result = await getResearchProjects(status);
    } else if (path.includes('/stats')) {
      result = await getProgramStats();
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
    logger.error('Fintech Programs API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};