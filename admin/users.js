// Admin User Management Module

/**
 * Load users from API
 */
async function loadUsers() {
  try {
    const headers = await window.AdminAuth.getAuthHeaders();
    const res = await fetch('/api/admin/users', { headers });
    const data = await res.json();
    const list = document.getElementById('usersList');
    if (!data.success || !data.users?.length) {
      list.innerHTML = '<div class="text-gray-600">No users found.</div>';
      return;
    }
    const rows = data.users.map(u => `
      <div class="border rounded p-3 bg-gray-50">
        <div class="flex justify-between">
          <div>
            <strong>${u.name || 'N/A'}</strong><br>
            <small class="text-gray-600">${u.email}</small>
          </div>
          <small class="text-gray-500">${u.createdAt}</small>
        </div>
        <div class="mt-2 text-sm">Premium: ${u.isPremium ? 'Yes' : 'No'}</div>
      </div>
    `).join('');
    list.innerHTML = rows;
  } catch (e) {
    document.getElementById('usersList').innerHTML = '<div class="text-red-600">Error loading users</div>';
  }
}

/**
 * Load user stats
 */
async function loadUserStats() {
  try {
    const headers = await window.AdminAuth.getAuthHeaders();
    const res = await fetch('/api/admin/user-stats', { headers });
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('stat-users').textContent = data.stats.total || '0';
      document.getElementById('stat-premium').textContent = data.stats.premium || '0';
      document.getElementById('stat-active').textContent = data.stats.active || '0';
    }
  } catch (e) {
    console.error('Error loading user stats:', e);
  }
}

// Export functions
window.AdminUsers = {
  loadUsers,
  loadUserStats
};