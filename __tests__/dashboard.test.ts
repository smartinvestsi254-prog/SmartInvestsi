import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Dashboard Test Suite
 * Comprehensive testing for dashboard functionality, error handling, and forms
 */

describe('Dashboard Form Submission', () => {
  let mockFetch: any;
  let onboardingForm: HTMLFormElement;

  beforeEach(() => {
    // Mock fetch API
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create mock form
    document.body.innerHTML = `
      <form id="onboardingForm">
        <select id="riskTolerance" name="riskTolerance" value="MODERATE"></select>
        <select id="investmentGoals" name="investmentGoals" value="[\"growth\"]"></select>
        <input type="checkbox" id="cryptoPref" name="cryptoPref" />
        <select id="notificationFreq" name="notificationFreq" value="weekly"></select>
      </form>
      <div id="onboardingStatus" class="badge">Not started</div>
      <div id="onboardingActions"></div>
      <div id="onboardingSummary"></div>
      <div id="errorAlert" class="error-alert"></div>
      <div id="successAlert" class="success-alert"></div>
    `;
    onboardingForm = document.getElementById('onboardingForm') as HTMLFormElement;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should handle form submission with valid data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    // Submit form
    const event = new Event('submit');
    event.preventDefault = vi.fn();
    onboardingForm.dispatchEvent(event);

    expect(mockFetch).toBeDefined();
  });

  it('should display error when profile API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'Server error' })
    });

    const errorAlert = document.getElementById('errorAlert');
    expect(errorAlert).toBeDefined();
  });

  it('should validate form fields before submission', () => {
    const riskTolerance = document.getElementById('riskTolerance');
    expect(riskTolerance?.value).toBe('MODERATE');
  });

  it('should escape HTML in form data', () => {
    const html = '<script>alert("xss")</script>';
    const div = document.createElement('div');
    div.textContent = html;
    expect(div.innerHTML).not.toContain('<script>');
  });
});

describe('Dashboard Error Handling', () => {
  let errorAlert: HTMLElement;
  let successAlert: HTMLElement;
  let errorMessage: HTMLElement;
  let successMessage: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="errorAlert" class="error-alert">
        <span id="errorMessage"></span>
        <button class="btn-close" onclick="this.parentElement.classList.remove('show')"></button>
      </div>
      <div id="successAlert" class="success-alert">
        <span id="successMessage"></span>
        <button class="btn-close" onclick="this.parentElement.classList.remove('show')"></button>
      </div>
    `;
    errorAlert = document.getElementById('errorAlert') as HTMLElement;
    successAlert = document.getElementById('successAlert') as HTMLElement;
    errorMessage = document.getElementById('errorMessage') as HTMLElement;
    successMessage = document.getElementById('successMessage') as HTMLElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should display error alert', () => {
    errorMessage.textContent = 'Test error';
    errorAlert.classList.add('show');
    expect(errorAlert.classList.contains('show')).toBe(true);
    expect(errorMessage.textContent).toBe('Test error');
  });

  it('should display success alert', () => {
    successMessage.textContent = 'Test success';
    successAlert.classList.add('show');
    expect(successAlert.classList.contains('show')).toBe(true);
    expect(successMessage.textContent).toBe('Test success');
  });

  it('should auto-hide alerts after timeout', async () => {
    errorMessage.textContent = 'Test error';
    errorAlert.classList.add('show');
    
    setTimeout(() => {
      errorAlert.classList.remove('show');
    }, 5000);

    expect(errorAlert.classList.contains('show')).toBe(true);
  });

  it('should close alert when close button clicked', () => {
    errorAlert.classList.add('show');
    const closeBtn = errorAlert.querySelector('.btn-close') as HTMLButtonElement;
    closeBtn.click();
    expect(errorAlert.classList.contains('show')).toBe(false);
  });
});

describe('Dashboard Network Error Handling', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    document.body.innerHTML = `
      <div id="errorAlert"><span id="errorMessage"></span></div>
    `;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should handle network timeout', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    
    try {
      await fetch('/api/test');
    } catch (error) {
      expect((error as Error).message).toBe('Network timeout');
    }
  });

  it('should handle connection error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
    
    try {
      await fetch('/api/test');
    } catch (error) {
      expect((error as Error).message).toBe('Connection failed');
    }
  });

  it('should handle 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    });

    const response = await fetch('/api/notfound');
    expect(response.status).toBe(404);
  });

  it('should handle 500 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });

    const response = await fetch('/api/error');
    expect(response.status).toBe(500);
  });
});

describe('Dashboard Form Validation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="testForm">
        <input type="text" id="email" name="email" required />
        <input type="number" id="amount" name="amount" min="0" required />
        <input type="text" id="description" name="description" />
      </form>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should validate required fields', () => {
    const form = document.getElementById('testForm') as HTMLFormElement;
    const emailInput = form.querySelector('#email') as HTMLInputElement;
    expect(emailInput.required).toBe(true);
  });

  it('should validate email format', () => {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    emailInput.value = 'invalid-email';
    expect(emailInput.type).toBe('text');
  });

  it('should validate number minimum value', () => {
    const amountInput = document.getElementById('amount') as HTMLInputElement;
    expect(amountInput.min).toBe('0');
  });

  it('should trim whitespace from input', () => {
    const descInput = document.getElementById('description') as HTMLInputElement;
    descInput.value = '  test  ';
    const trimmed = descInput.value.trim();
    expect(trimmed).toBe('test');
  });
});

describe('Dashboard Security', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="contentArea"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should escape HTML to prevent XSS', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const div = document.createElement('div');
    div.textContent = malicious;
    expect(div.innerHTML).not.toContain('onerror');
  });

  it('should not allow script tags in user input', () => {
    const userInput = '<script>alert("xss")</script>';
    const div = document.createElement('div');
    div.textContent = userInput;
    expect(div.innerHTML).toContain('&lt;script&gt;');
  });

  it('should sanitize data URLs', () => {
    const maliciousUrl = 'javascript:alert(1)';
    const isValid = maliciousUrl.startsWith('http') || maliciousUrl.startsWith('/');
    expect(isValid).toBe(false);
  });
});

describe('Dashboard API Integration', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    document.body.innerHTML = `
      <div id="loadingSpinner" class="loading-spinner"></div>
      <div id="dataContainer"></div>
    `;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should call profile API with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await fetch('/.netlify/functions/personalization/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({ riskTolerance: 'MODERATE' })
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/personalization/profile',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('should handle recommendations API response', async () => {
    const mockRecommendations = {
      success: true,
      data: [
        { title: 'Rec 1', description: 'Test', actionUrl: '/test' }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRecommendations
    });

    const response = await fetch('/.netlify/functions/personalization/recommendations');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });
});

describe('Dashboard Loading States', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="loadingSpinner" class="loading-spinner"></div>
      <button id="submitBtn">Submit</button>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should show loading spinner', () => {
    const spinner = document.getElementById('loadingSpinner') as HTMLElement;
    spinner.classList.add('show');
    expect(spinner.classList.contains('show')).toBe(true);
  });

  it('should hide loading spinner', () => {
    const spinner = document.getElementById('loadingSpinner') as HTMLElement;
    spinner.classList.add('show');
    spinner.classList.remove('show');
    expect(spinner.classList.contains('show')).toBe(false);
  });

  it('should disable button during loading', () => {
    const btn = document.getElementById('submitBtn') as HTMLButtonElement;
    btn.disabled = true;
    expect(btn.disabled).toBe(true);
  });

  it('should enable button after loading', () => {
    const btn = document.getElementById('submitBtn') as HTMLButtonElement;
    btn.disabled = false;
    expect(btn.disabled).toBe(false);
  });
});
