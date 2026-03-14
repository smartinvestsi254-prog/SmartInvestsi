import type { Handler } from '@netlify/functions';
import { getChatManager } from '../../chat-support.js';

export const handler: Handler = async (event) => {
  const { headers } = event;
  
  // Auth (from cookie/header)
  const auth = headers.authorization || headers.cookie;
  if (!auth) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: 'Auth required' })
    };
  }

  const chatManager = getChatManager();
  const userEmail = headers['user-email'] || 'anonymous@smartinvestsi.netlify.app'; // From auth middleware
  
  const chats = chatManager.getUserChats(userEmail);
  const openChats = chats.filter(c => ['open', 'in-progress'].includes(c.status));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      success: true, 
      chats: chats.map(c => c.toJSON(false))
    })
  };
};

