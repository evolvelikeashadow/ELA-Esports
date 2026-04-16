# Firebase Cloud Setup - Avatar Upload ✅

## Step-by-Step (5 mins)

### 1. Firebase Console (ela-esports project)
```
Firebase Console → Storage → Get Started
✓ Start in test mode → Next → Done
```

### 2. Storage Rules (Copy-Paste)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /players/{playerId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == playerId;
    }
  }
}
Deploy Rules → Done
```

### 3. script.js Avatar Upload (Already Fixed)
```js
// ✅ Works now - profile.html avatar upload
window.handleAvatarUpload(event)  // FileReader + Firebase upload
```

### 4. Test Avatar Upload
```
1. Gaming-website/login.html → Login/Create account
2. Gaming-website/profile.html → Upload avatar photo
3. ✅ Preview immediate + Cloud sync (console: "Cloud upload success!")
4. F12 → Network → Check Firebase Storage request
```

### 5. CORS Fix (if needed)
```
Firebase Console → Storage → CORS tab → Add:
["*"] → Save
```

**✅ Avatar upload ready! Local preview + cloud sync.**

**Usage**: profile.html → Choose photo → Instant preview → Cloud save everywhere.

