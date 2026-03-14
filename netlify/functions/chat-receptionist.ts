/**
 * Chat Receptionist API for SmartInvest
 * AI-powered chat support using Chatbase, analyzing user questions for feedback
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface UserFeedback {
  userId: string;
  question: string;
  category: 'improvement' | 'service_usage' | 'bug' | 'feature_request' | 'general';
  sentiment: 'positive' | 'neutral' | 'negative';
  servicesMentioned: string[];
  improvementsSuggested: string[];
  timestamp: string;
}

interface ChatSession {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  feedback: UserFeedback[];
  startTime: string;
  lastActivity: string;
  isActive: boolean;
}

// Mock data - replace with real database
const mockSessions: ChatSession[] = [];
const mockFeedback: UserFeedback[] = [];

// Chatbase configuration
const CHATBASE_API_KEY = process.env.CHATBASE_API_KEY;
const CHATBASE_BOT_ID = process.env.CHATBASE_BOT_ID;
const CHATBASE_CHATBOT_ID = process.env.CHATBASE_CHATBOT_ID;
const CHATBASE_API_URL = process.env.CHATBASE_API_URL || 'https://www.chatbase.co/api/v1/chat';

/**
 * Analyze user question for feedback and insights
 */
async function analyzeQuestion(question: string, userId: string): Promise<UserFeedback> {
  // Simple keyword-based analysis (in production, use NLP/AI)
  const lowerQuestion = question.toLowerCase();

  let category: UserFeedback['category'] = 'general';
  let sentiment: UserFeedback['sentiment'] = 'neutral';
  const servicesMentioned: string[] = [];
  const improvementsSuggested: string[] = [];

  // Detect services mentioned
  const services = ['trading', 'payments', 'crypto', 'portfolio', 'alerts', 'academy', 'premium'];
  services.forEach(service => {
    if (lowerQuestion.includes(service)) {
      servicesMentioned.push(service);
    }
  });

  // Detect sentiment
  if (lowerQuestion.includes('love') || lowerQuestion.includes('great') || lowerQuestion.includes('excellent')) {
    sentiment = 'positive';
  } else if (lowerQuestion.includes('hate') || lowerQuestion.includes('terrible') || lowerQuestion.includes('worst')) {
    sentiment = 'negative';
  }

  // Detect category
  if (lowerQuestion.includes('improve') || lowerQuestion.includes('better') || lowerQuestion.includes('enhance')) {
    category = 'improvement';
    // Extract improvement suggestions
    const improvePatterns = [
      /improve (.+?)(?:\.|\?|$)/i,
      /better (.+?)(?:\.|\?|$)/i,
      /enhance (.+?)(?:\.|\?|$)/i
    ];
    improvePatterns.forEach(pattern => {
      const match = question.match(pattern);
      if (match) {
        improvementsSuggested.push(match[1].trim());
      }
    });
  } else if (servicesMentioned.length > 0) {
    category = 'service_usage';
  } else if (lowerQuestion.includes('bug') || lowerQuestion.includes('error') || lowerQuestion.includes('not working')) {
    category = 'bug';
  } else if (lowerQuestion.includes('add') || lowerQuestion.includes('feature') || lowerQuestion.includes('would like')) {
    category = 'feature_request';
  }

  const feedback: UserFeedback = {
    userId,
    question,
    category,
    sentiment,
    servicesMentioned,
    improvementsSuggested,
    timestamp: new Date().toISOString()
  };

  mockFeedback.push(feedback);

  logger.info('User feedback analyzed', {
    userId,
    category,
    sentiment,
    servicesMentioned: servicesMentioned.length,
    improvementsSuggested: improvementsSuggested.length
  });

  return feedback;
}

/**
 * Send message to Chatbase and get response
 */
async function getChatbaseResponse(message: string, sessionId: string): Promise<string> {
  if (!CHATBASE_API_KEY || !CHATBASE_BOT_ID) {
    logger.warn('Chatbase not configured, using fallback response');
    return "I'm here to help! Our support team will get back to you soon. For immediate assistance, please check our FAQ or contact support@smartinvest.com.";
  }

  try {
    const response = await fetch(CHATBASE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATBASE_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        chatbotId: CHATBASE_CHATBOT_ID,
        stream: false,
        sessionId: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`Chatbase API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.text || "I apologize, but I'm having trouble processing your request right now.";
  } catch (error) {
    logger.error('Chatbase API error', { error: error.message });
    return "I'm experiencing technical difficulties. Please try again later or contact our support team.";
  }
}

/**
 * Start new chat session
 */
async function startChatSession(userId: string): Promise<any> {
  try {
    const session: ChatSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      messages: [],
      feedback: [],
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    };

    mockSessions.push(session);

    // Welcome message
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: "Hello! I'm your SmartInvest assistant. I'm here to help you with trading, payments, crypto, portfolio management, and more. How can I assist you today?",
      timestamp: new Date().toISOString()
    };

    session.messages.push(welcomeMessage);

    logger.info('Chat session started', { userId, sessionId: session.sessionId });

    return { success: true, data: session };
  } catch (error) {
    logger.error('Start chat session error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send message in chat session
 */
async function sendMessage(sessionId: string, userId: string, message: string): Promise<any> {
  try {
    const session = mockSessions.find(s => s.sessionId === sessionId && s.userId === userId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (!session.isActive) {
      return { success: false, error: 'Session is closed' };
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    session.messages.push(userMessage);
    session.lastActivity = new Date().toISOString();

    // Analyze question for feedback
    await analyzeQuestion(message, userId);

    // Get AI response
    const aiResponse = await getChatbaseResponse(message, sessionId);

    // Add AI response
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };

    session.messages.push(assistantMessage);

    logger.info('Message sent in chat', { sessionId, userId, messageLength: message.length });

    return { success: true, data: { userMessage, assistantMessage } };
  } catch (error) {
    logger.error('Send message error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get chat session
 */
async function getChatSession(sessionId: string, userId: string): Promise<any> {
  try {
    const session = mockSessions.find(s => s.sessionId === sessionId && s.userId === userId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    return { success: true, data: session };
  } catch (error) {
    logger.error('Get chat session error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * End chat session
 */
async function endChatSession(sessionId: string, userId: string): Promise<any> {
  try {
    const session = mockSessions.find(s => s.sessionId === sessionId && s.userId === userId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.isActive = false;

    logger.info('Chat session ended', { sessionId, userId });

    return { success: true, data: { ended: true } };
  } catch (error) {
    logger.error('End chat session error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user feedback insights
 */
async function getFeedbackInsights(userId?: string): Promise<any> {
  try {
    let feedback = mockFeedback;

    if (userId) {
      feedback = feedback.filter(f => f.userId === userId);
    }

    const insights = {
      totalFeedback: feedback.length,
      sentimentBreakdown: feedback.reduce((acc, f) => {
        acc[f.sentiment] = (acc[f.sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      categoryBreakdown: feedback.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      popularServices: feedback.reduce((acc, f) => {
        f.servicesMentioned.forEach(service => {
          acc[service] = (acc[service] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
      improvementSuggestions: feedback
        .filter(f => f.improvementsSuggested.length > 0)
        .flatMap(f => f.improvementsSuggested)
    };

    return { success: true, data: insights };
  } catch (error) {
    logger.error('Get feedback insights error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get active sessions for user
 */
async function getActiveSessions(userId: string): Promise<any> {
  try {
    const activeSessions = mockSessions.filter(s => s.userId === userId && s.isActive);

    return { success: true, data: activeSessions };
  } catch (error) {
    logger.error('Get active sessions error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/chat/start') && httpMethod === 'POST') {
      result = await startChatSession(userId);
    } else if (path.includes('/chat/message') && httpMethod === 'POST') {
      const { sessionId, message } = data;
      if (!sessionId || !message) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'Session ID and message are required' })
        };
      }
      result = await sendMessage(sessionId, userId, message);
    } else if (path.includes('/chat/session/') && httpMethod === 'GET') {
      const sessionId = path.split('/chat/session/')[1].split('/')[0];
      result = await getChatSession(sessionId, userId);
    } else if (path.includes('/chat/end') && httpMethod === 'POST') {
      const { sessionId } = data;
      if (!sessionId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'Session ID is required' })
        };
      }
      result = await endChatSession(sessionId, userId);
    } else if (path.includes('/chat/active') && httpMethod === 'GET') {
      result = await getActiveSessions(userId);
    } else if (path.includes('/feedback/insights') && httpMethod === 'GET') {
      result = await getFeedbackInsights(userId);
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Chat Receptionist API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};