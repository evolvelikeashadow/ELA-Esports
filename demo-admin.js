// Demo Admin Setup - Run F12 Console → Enter
(async () => {
  try {
    // Create admin user in Firestore
    const adminData = {
      uid: 'admin-uid',
      email: 'admin@elaesports.in',
      role: 'super-admin',
      createdAt: new Date().toISOString()
    };
    
    // Use Realtime DB for demo admins (fast)
    await fetch('https://ela-esports-default-rtdb.firebaseio.com/admins.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'admin-uid': adminData })
    });
    
    // LocalStorage admin session
    localStorage.setItem('adminSession', JSON.stringify({
      isAdmin: true,
      email: 'admin@elaesports.in',
      uid: 'admin-uid'
    }));
    
    console.log('✅ Admin setup complete!');
    console.log('📧 Email: admin@elaesports.in');
    console.log('🔑 Password: admin123 (create in Firebase Console)');
    console.log('🔄 Refresh admin-login.html');
  } catch (e) {
    console.error('Admin setup failed:', e);
  }
})();

