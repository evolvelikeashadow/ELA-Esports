// 🔥 QUICK ADMIN FIX - Copy paste F12 Console (admin-login.html)
(async () => {
  // 1. Skip Firebase Auth - Direct Admin Session
  localStorage.setItem('adminSession', JSON.stringify({
    isAdmin: true,
    email: 'admin@elaesports.in',
    uid: 'DEMO-ADMIN',
    timestamp: Date.now()
  }));
  
  // 2. Skip isAdmin() check - Force admin mode
  window.isAdmin = async () => true;
  
  showNotification('🔥 ADMIN MODE ENABLED - Redirecting...', 'success');
  
  // 3. Direct redirect
  setTimeout(() => {
    window.location.href = 'admin.html';
  }, 800);
  
  console.log('✅ Direct Admin Access Granted!');
})();

