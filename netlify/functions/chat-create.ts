import type { Handler } from '@netlify/functions';
import { getChatManager } from '../../chat-support.js';
import { getCorsHeaders } from './lib/cors';

export const handler: Handler = async (event) => {
  const origin = event.headers?.['origin'] || event.headers?.['Origin'] || '';
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Auth check
    const auth = event.headers.authorization || event.headers.cookie;
    if (!auth) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Authentication required' })
      };
    }

    const { category = 'general' } = JSON.parse(event.body || '{}');

    const chatManager = getChatManager();
    const userEmail = event.headers['user-email'] || 'anonymous@smartinvestsi.netlify.app';

    const chat = chatManager.createChat(userEmail, category);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin)
      },
      body: JSON.stringify({ success: true, chat: chat.toJSON(false) })
    };
  } catch (error) {
    console.error('Chat creation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
    });
  } catch (error) {
    console.error('Chat create error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
};

