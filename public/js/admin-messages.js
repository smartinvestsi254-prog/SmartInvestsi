import { getAuthHeaders } from './auth.js';

export async function loadMessages() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/messages', { headers });
    const data = await res.json();
    const list = document.getElementById('messagesList');
    if (!data.success || !data.messages?.length) {
      list.innerHTML = '<div class="text-gray-600">No messages.</div>';
      return;
    }
    const rows = data.messages.map(m => `
      <div class="border rounded p-3 bg-gray-50">
        <div class="flex justify-between">
          <div>
            <strong>${m.name}</strong><br>
            <small class="text-gray-600">${m.email}</small>
          </div>
          <small class="text-gray-500">${m.createdAt}</small>
        </div>
        <div class="mt-2 text-sm">${m.message}</div>
        ${(m.replies || []).map(r => `
          <div class="mt-2 p-2 bg-white border-l-4" style="border-color:#2563eb">
            <strong style="color:#2563eb">Admin Reply:</strong><br>
            <small class="text-gray-500">${r.at}</small>
            <div class="text-sm mt-1">${r.message}</div>
          </div>
        `).join('')}
        <div class="mt-2 flex gap-2">
          <input id="reply_${m.id}" type="text" placeholder="Your reply..." class="flex-1 border rounded p-2 text-sm">
          <button onclick="replyMessage('${m.id}')" class="classic-btn text-sm">Reply</button>
        </div>
      </div>
    `).join('');
    list.innerHTML = rows;
  } catch (e) {
    document.getElementById('messagesList').innerHTML = '<div class="text-red-600">Error loading messages</div>';
  }
}

export async function replyMessage(id) {
  const input = document.getElementById(`reply_${id}`);
  const text = input.value.trim();
  if (!text) return alert('Enter a reply');
  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`/api/admin/messages/${id}/reply`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reply: text })
    });
    const data = await res.json();
    if (data.success) { input.value = ''; loadMessages(); }
    else { alert('Error: ' + (data.error || 'Failed')); }
  } catch (e) { alert('Error: ' + e.message); }
}

export function refreshMessages() { loadMessages(); }
