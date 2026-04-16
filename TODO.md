# Debug Phase - Admin Login Diagnostics

**Current Status**: Firebase setup done but no redirect → need runtime logs

## Debug TODO
- [ ] Step 1: Add console.log DEBUG to script.js adminLoginForm + isAdmin()
- [ ] Step 2: Test login → paste F12 Console output  
- [ ] Step 3: Fix uid mismatch/firestore error from logs
- [ ] Step 4: Clean redirect ✅

**Test after edits**:
```
1. Save script.js 
2. Open admin-login.html 
3. F12 Console → Login → PASTE ALL LOGS HERE
```

**Expected logs**:
```
Firebase initialized: true
Admin login: email@domain.com
isAdmin uid: abc123
Admins query snap.size: 0/1  ← PROBLEM HERE
Access denied...
```

