// Admin File Management Module

/**
 * Load files from API
 */
async function loadFiles() {
  try {
    const headers = await window.AdminAuth.getAuthHeaders();
    const res = await fetch('/api/admin/files', { headers });
    const data = await res.json();
    const list = document.getElementById('filesList');
    if (!data.success || !data.files?.length) {
      list.innerHTML = '<div class="text-gray-600">No files found.</div>';
      return;
    }
    const rows = data.files.map(f => `
      <div class="border rounded p-3 bg-gray-50">
        <div class="flex justify-between">
          <div>
            <strong>${f.title}</strong><br>
            <small class="text-gray-600">${f.filename}</small>
          </div>
          <div class="text-right">
            <span class="text-xs px-2 py-1 rounded" style="background:${f.published ? '#dcfce7' : '#fef9c3'}">${f.published ? 'Published' : 'Draft'}</span><br>
            <small class="text-gray-500">${f.createdAt}</small>
          </div>
        </div>
        <div class="mt-2 flex gap-2">
          <button onclick="window.AdminFiles.togglePublish('${f.id}', ${f.published})" class="classic-btn text-sm">${f.published ? 'Unpublish' : 'Publish'}</button>
          <button onclick="window.AdminFiles.deleteFile('${f.id}')" class="classic-btn text-sm bg-red-600">Delete</button>
        </div>
      </div>
    `).join('');
    list.innerHTML = rows;
  } catch (e) {
    document.getElementById('filesList').innerHTML = '<div class="text-red-600">Error loading files</div>';
  }
}

/**
 * Toggle publish status
 */
async function togglePublish(id, current) {
  try {
    const headers = await window.AdminAuth.getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`/api/admin/files/${id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ published: !current })
    });
    const data = await res.json();
    if (data.success) window.AdminFiles.loadFiles();
  } catch (e) { alert('Error: ' + e.message); }
}

/**
 * Delete file
 */
async function deleteFile(id) {
  if (!confirm('Are you sure you want to delete this file?')) return;
  try {
    const headers = await window.AdminAuth.getAuthHeaders();
    const res = await fetch(`/api/admin/files/${id}`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (data.success) {
      loadFiles();
    } else {
      alert('Error deleting file');
    }
  } catch (e) {
    alert('Error deleting file');
  }
}

// Export functions
window.AdminFiles = {
  loadFiles,
  togglePublish,
  deleteFile
};