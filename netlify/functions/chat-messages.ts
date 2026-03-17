import type { Handler } from '@netlify/functions';
import { getChatManager } from '../../chat-support.js';

export const handler: Handler = async (event, context) => {
  const { httpMethod, path, headers, body } = event;
  const chatId = path?.split('/').pop() || '';
  
  const chatManager = getChatManager();
  
  // Basic auth check (enhance with admin/auth.js logic)
  const auth = headers.authorization || headers.cookie;
  if (!auth) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: 'Auth required' })
    };
  }

  try {
    if (httpMethod === 'GET') {
      const chat = chatManager.getChat(chatId);
      if (!chat) {
        return {
          statusCode: 404,
          body: JSON.stringify({ success: false, error: 'Chat not found' })
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, chat: chat.toJSON(true) })
      };
    } 

    if (httpMethod === 'POST') {
      const { content, role = 'user' } = JSON.parse(body || '{}');
      if (!content) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'Content required' })
        };
      }
      const chat = chatManager.getChat(chatId);
      if (!chat) {
        return {
          statusCode: 404,
          body: JSON.stringify({ success: false, error: 'Chat not found' })
        };
      }
      const message = chat.addMessage(role, content);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Chat messages error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
};

