/**
 * Transaction History Viewer
 * Displays payment transaction records for users and admin
 */

class TransactionHistoryViewer {
  constructor(config = {}) {
    this.config = {
      apiBase: config.apiBase || '/api',
      containerId: config.containerId || 'transactionsContainer',
      adminMode: config.adminMode || false,
      pageSize: config.pageSize || 10,
      ...config
    };
    this.transactions = [];
    this.currentPage = 1;
    this.totalRecords = 0;
    this.init();
  }

  init() {
    this.createUI();
    this.loadTransactions();
  }

  /**
   * Create transaction history UI
   */
  createUI() {
    const container = document.getElementById(this.config.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="transactions-container">
        <div class="transactions-header">
          <h3 class="transactions-title">
            ${this.config.adminMode ? '📊 All Transactions' : '💳 My Transactions'}
          </h3>
          <div class="transactions-controls">
            <input 
              type="text" 
              class="transaction-search" 
              placeholder="Search by reference, email, amount..."
            >
            <select class="transaction-filter">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            ${this.config.adminMode ? `
              <button class="btn-export-transactions">📥 Export CSV</button>
              <button class="btn-filter-advanced">⚙️ Advanced Filter</button>
            ` : ''}
          </div>
        </div>

        <div class="transactions-list">
          <div class="transaction-item skeleton-loading">
            <div class="skeleton skeleton-line" style="inline-size: 30%"></div>
            <div class="skeleton skeleton-line" style="inline-size: 20%"></div>
            <div class="skeleton skeleton-line" style="inline-size: 25%"></div>
          </div>
        </div>

        <div class="transactions-pagination">
          <button class="btn-pagination prev">← Previous</button>
          <span class="pagination-info">Page <span class="current-page">1</span> of <span class="total-pages">1</span></span>
          <button class="btn-pagination next">Next →</button>
        </div>

        <div class="empty-state" style="display: none;">
          <div class="empty-icon">📭</div>
          <p class="empty-text">No transactions yet</p>
          <p class="empty-subtext">Your transactions will appear here</p>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners(container) {
    const search = container.querySelector('.transaction-search');
    const filter = container.querySelector('.transaction-filter');
    const prevBtn = container.querySelector('.btn-pagination.prev');
    const nextBtn = container.querySelector('.btn-pagination.next');
    const exportBtn = container.querySelector('.btn-export-transactions');
    const advancedBtn = container.querySelector('.btn-filter-advanced');

    search?.addEventListener('input', (e) => {
      this.currentPage = 1;
      this.loadTransactions({ search: e.target.value });
    });

    filter?.addEventListener('change', (e) => {
      this.currentPage = 1;
      this.loadTransactions({ status: e.target.value });
    });

    prevBtn?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadTransactions();
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (this.currentPage * this.config.pageSize < this.totalRecords) {
        this.currentPage++;
        this.loadTransactions();
      }
    });

    exportBtn?.addEventListener('click', () => this.exportToCSV());
    advancedBtn?.addEventListener('click', () => this.showAdvancedFilter());
  }

  /**
   * Load transactions from API
   */
  async loadTransactions(filters = {}) {
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.config.pageSize,
        ...filters
      });

      const endpoint = this.config.adminMode 
        ? '/payments/admin/all' 
        : '/payments/user/history';

      const response = await fetch(`${this.config.apiBase}${endpoint}?${params}`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        this.transactions = result.transactions || [];
        this.totalRecords = result.total || 0;
        this.renderTransactions();
      } else {
        throw new Error(result.error || 'Failed to load transactions');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render transaction list
   */
  renderTransactions() {
    const container = document.getElementById(this.config.containerId);
    const listContainer = container.querySelector('.transactions-list');
    const emptyState = container.querySelector('.empty-state');
    const paginationInfo = container.querySelector('.pagination-info');

    if (this.transactions.length === 0) {
      listContainer.style.display = 'none';
      emptyState.style.display = 'block';
      paginationInfo.innerHTML = 'No transactions';
      return;
    }

    listContainer.style.display = 'block';
    emptyState.style.display = 'none';

    listContainer.innerHTML = this.transactions
      .map(tx => this.createTransactionItem(tx))
      .join('');

    // Update pagination
    const totalPages = Math.ceil(this.totalRecords / this.config.pageSize);
    container.querySelector('.current-page').textContent = this.currentPage;
    container.querySelector('.total-pages').textContent = totalPages;
    container.querySelector('.btn-pagination.prev').disabled = this.currentPage === 1;
    container.querySelector('.btn-pagination.next').disabled = this.currentPage >= totalPages;

    // Add event listeners to expand buttons
    listContainer.querySelectorAll('.transaction-expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.transaction-item');
        item.classList.toggle('expanded');
      });
    });
  }

  /**
   * Create transaction item HTML
   */
  createTransactionItem(tx) {
    const statusClass = this.getStatusClass(tx.status);
    const statusIcon = this.getStatusIcon(tx.status);
    const date = new Date(tx.timestamp || tx.createdAt);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let itemHtml = `
      <div class="transaction-item ${statusClass}">
        <div class="transaction-main">
          <div class="transaction-status">
            <span class="status-icon">${statusIcon}</span>
          </div>
          <div class="transaction-info">
            <div class="transaction-description">
              <strong>${tx.description || 'Payment'}</strong>
              <span class="transaction-method">${tx.methodName || tx.method || 'N/A'}</span>
            </div>
            <div class="transaction-meta">
              <span class="transaction-date">${formattedDate}</span>
              <span class="transaction-reference">Ref: ${tx.reference || tx.id}</span>
            </div>
          </div>
          <div class="transaction-amount">
            <span class="amount">${tx.currency || 'KES'} ${parseFloat(tx.amount).toFixed(2)}</span>
            <span class="status-badge">${this.formatStatus(tx.status)}</span>
          </div>
          <button class="transaction-expand-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <div class="transaction-details">
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Transaction ID</span>
              <code class="detail-value">${tx.id}</code>
              <button class="btn-copy" data-copy="${tx.id}">Copy</button>
            </div>
            <div class="detail-item">
              <span class="detail-label">Amount</span>
              <span class="detail-value">${tx.currency || 'KES'} ${parseFloat(tx.amount).toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Method</span>
              <span class="detail-value">${tx.methodName || tx.method || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <span class="detail-value">${this.formatStatus(tx.status)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email</span>
              <span class="detail-value">${tx.email || tx.userEmail || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Phone</span>
              <span class="detail-value">${tx.phone || 'N/A'}</span>
            </div>
            ${tx.receiptUrl ? `
              <div class="detail-item">
                <span class="detail-label">Receipt</span>
                <a href="${tx.receiptUrl}" class="detail-value link" target="_blank">📄 View Receipt</a>
              </div>
            ` : ''}
            ${tx.note ? `
              <div class="detail-item full-width">
                <span class="detail-label">Note</span>
                <p class="detail-value">${tx.note}</p>
              </div>
            ` : ''}
          </div>
    `;

    if (this.config.adminMode) {
      itemHtml += `
          <div class="admin-actions">
            <button class="btn-admin-action verify">✓ Verify</button>
            <button class="btn-admin-action dispute">⚠️ Dispute</button>
            <button class="btn-admin-action refund">💸 Refund</button>
            <button class="btn-admin-action note">📝 Add Note</button>
          </div>
      `;
    }

    itemHtml += `
        </div>
      </div>
    `;

    return itemHtml;
  }

  /**
   * Get status class
   */
  getStatusClass(status) {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return 'status-unknown';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'completed': return '✓';
      case 'pending': return '⏳';
      case 'failed': return '✕';
      default: return '?';
    }
  }

  /**
   * Format status text
   */
  formatStatus(status) {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return status || 'Unknown';
    }
  }

  /**
   * Export to CSV
   */
  async exportToCSV() {
    try {
      const response = await fetch(`${this.config.apiBase}/payments/export/csv`, {
        credentials: 'include'
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  /**
   * Show advanced filter
   */
  showAdvancedFilter() {
    alert('Advanced filter panel - To be implemented');
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById(this.config.containerId);
    const list = container.querySelector('.transactions-list');
    list.innerHTML = `
      <div class="error-message">
        <strong>⚠️ Error:</strong> ${message}
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Initialize globally
window.TransactionHistoryViewer = TransactionHistoryViewer;
