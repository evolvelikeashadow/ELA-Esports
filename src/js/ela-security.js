// ELA ESPORTS - PROFESSIONAL SECURITY MODULE
// ============================================

// CSP Headers (add to firebase.json)
const CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://ela-esports.firebaseio.com https://*.googleapis.com https://*.firebaseio.com;
`;

// Rate limiting (localStorage)
const RATE_LIMIT = {
  requests: [],
  maxRequests: 100,
  windowMs: 60000,
  
  isAllowed(ip = 'local') {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length > this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    this.requests.push(now);
    return true;
  }
};

// Input sanitization
const sanitizeInput = (input) => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// Auth guards
const requireAuth = async (redirect = 'login.html') => {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user && window.location.pathname !== redirect.replace('/', '')) {
    window.location.href = redirect;
    return false;
  }
  return true;
};

const requireAdmin = async (redirect = 'admin-login.html') => {
  if (!await window.isAdmin()) {
    window.location.href = redirect;
    return false;
  }
  return true;
};

// XSRF Protection
const generateCSRF = () => btoa(Date.now() + Math.random());
window.elaCSRF = generateCSRF();

// Export security utils
window.elaSecurity = {
  sanitize: sanitizeInput,
  rateLimit: RATE_LIMIT.isAllowed,
  requireAuth,
  requireAdmin,
  CSP
};

console.log('🔒 ELA Security Module Loaded');
