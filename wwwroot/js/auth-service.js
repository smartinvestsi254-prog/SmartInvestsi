/**
 * Authentication Service for SmartInvestsi
 * Handles user login, signup, and session management
 */

class AuthService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
    this.tokenKey = 'smartinvest_token';
    this.userKey = 'smartinvest_user';
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
        this.showNotification('Login successful!', 'success');
        return { success: true, user: data.user };
      } else {
        this.showNotification(data.error || 'Login failed', 'error');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showNotification('Network error. Please try again.', 'error');
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Signup user
   */
  async signup(email, name, password) {
    try {
      const response = await fetch(`${this.baseUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password })
      });

      const data = await response.json();

      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
        this.showNotification('Account created successfully!', 'success');
        return { success: true, user: data.user };
      } else {
        this.showNotification(data.error || 'Signup failed', 'error');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      this.showNotification('Network error. Please try again.', 'error');
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.showNotification('Logged out successfully', 'info');
    // Redirect to home or login page
    window.location.href = '/';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      return false;
    }

    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.getUser();
  }

  /**
   * Get authorization headers for API calls
   */
  getAuthHeaders() {
    const token = this.getToken();
    const user = this.getUser();

    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'x-user-id': user ? user.id : '',
      'x-user-email': user ? user.email : '',
      'Content-Type': 'application/json'
    };
  }

  // Private methods
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser() {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-black' :
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Create global instance
const authService = new AuthService();

// Make it globally available
window.AuthService = authService;