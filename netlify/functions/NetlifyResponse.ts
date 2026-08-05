/** 
 * Netlify Function Response type - separate from APIResponse body
 * statusCode, headers, body for HTTP responses
 */

export interface NetlifyResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  success: boolean;
  data?: T;
  error?: string;
}

export function createNetlifyResponse<T>(statusCode: number, headers: Record<string, string>, bodyObj: { success: boolean; data?: T; error?: string }): NetlifyResponse<T> {
  return {
    statusCode,
    headers,
    body: JSON.stringify(bodyObj),
    ...bodyObj
  };
}
