// ============================================
// ELA ESPORTS - MAIN JAVASCRIPT FILE
// ============================================

// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase Config
// Secure Firebase Config - Loads from firebase-env.js
import { getFirebaseConfig } from './firebase-env.js';
let firebaseConfig;
try {
  firebaseConfig = await getFirebaseConfig();
} catch (e) {
  console.error('Config load failed:', e);
  firebaseConfig = { /* fallback empty */ };
}

// Initialize Firebase
let app, auth, db, storage, googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  console.log("Firebase initialized successfully (Auth/Firestore/Storage)");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Admin auth will use Firebase Custom Claims - COMPLETE

// 🔍 DEBUG: Global isAdmin check - ADMIN LOGIN FIX
window.isAdmin = async function() {
  console.log('🔍 isAdmin() called - currentUser:', auth?.currentUser?.uid, 'db:', !!db);
  
  if (!auth?.currentUser) {
    console.log('❌ No currentUser');
    return false;
  }
  
  try {
    // Custom Claims first (fastest)
    console.log('🔍 Checking custom claims...');
    const idTokenResult = await getIdTokenResult(auth.currentUser);
    console.log('Claims:', idTokenResult.claims);
    if (idTokenResult.claims.admin === true) {
      console.log('✅ Admin via custom claims');
      return true;
    }
    
    // Fallback Firestore admins collection
    if (db) {
      const uid = auth.currentUser.uid;
      console.log('🔍 Querying admins for uid:', uid);
      const q = query(collection(db, 'admins'), where('uid', '==', uid));
      const snap = await getDocs(q);
      console.log('🔍 Admins query result:', snap.size, 'docs');
      if (!snap.empty) {
        console.log('✅ Admin found in Firestore:', snap.docs[0].data());
        return true;
      } else {
        console.log('❌ No admin doc matching uid:', uid);
      }
    } else {
      console.log('❌ Firestore (db) unavailable');
    }
    
    console.log('❌ isAdmin() false');
    return false;
  } catch (e) {
    console.error('💥 isAdmin check ERROR:', e);
    return false;
  }
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'info', duration = 4000) {
  // Create container if it doesn't exist
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(notification);

  // Animate in
  setTimeout(() => notification.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Make showNotification globally available
window.showNotification = showNotification;

// Named exports for tournament-details.html inline script
export { db as getFirestore };
export { doc };
export { getDoc };
export { getUrlParam };
export { showNotification };
// checkRegistrationStatus exported as window global

// NEW: Enhanced tournament details fetcher with teams/leaderboard
export async function getTournamentDetails(tournamentId) {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) return null;

    const data = tournamentDoc.data();
    
    // Fetch registered teams count & top teams for leaderboard
    const registrationsQuery = query(
      collection(db, 'tournament_registrations'),
      where('tournamentId', '==', tournamentId),
      where('status', 'in', ['approved', 'pending']),
      orderBy('registeredAt', 'asc'),
      limit(5)
    );
    const regSnapshot = await getDocs(registrationsQuery);
    
    const registeredTeams = regSnapshot.docs.map(doc => doc.data());
    const teamsCount = await getDocs(query(
      collection(db, 'tournament_registrations'),
      where('tournamentId', '==', tournamentId),
      where('status', '==', 'approved')
    )).then(snap => snap.size);

    return {
      ...data,
      registeredTeamsCount: teamsCount,
      leaderboardTeams: registeredTeams.slice(0, 5), // Top 5 for preview
      totalSlots: data.maxTeams || 128,
      regProgress: Math.min((teamsCount / (data.maxTeams || 128)) * 100, 100)
    };
  } catch (error) {
    console.error('Tournament details fetch error:', error);
    return null;
  }
}



// ============================================
// NAVBAR UPDATE FUNCTION
// ============================================

function updateNavbar() {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  const adminSession = JSON.parse(localStorage.getItem('adminSession'));
  
  // Handle HTML nav links
  const authLink = document.getElementById('authLink');
  const registerLink = document.getElementById('registerLink');
  const userMenu = document.getElementById('userMenu');
  const userNameDisplay = document.getElementById('userNameDisplay');
  
  // Handle nav-links list items
  const loginNavItem = document.querySelector('.nav-links li a[href="login.html"]')?.parentElement;
  const registerNavItem = document.querySelector('.nav-links li a[href="registration.html"]')?.parentElement;

  if (user || adminSession) {
    // Hide login/register buttons
    if (authLink) authLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (loginNavItem) loginNavItem.style.display = 'none';
    if (registerNavItem) registerNavItem.style.display = 'none';
    
    // Show user menu
    if (userMenu) {
      userMenu.style.display = 'flex';
      if (userNameDisplay) {
        if (adminSession && adminSession.isAdmin) {
          userNameDisplay.textContent = 'ADMIN';
        } else {
          userNameDisplay.textContent = user?.name || 'Player';
        }
      }
    }
  } else {
    // Show login/register buttons
    if (authLink) authLink.style.display = 'block';
    if (registerLink) registerLink.style.display = 'block';
    if (loginNavItem) loginNavItem.style.display = 'block';
    if (registerNavItem) registerNavItem.style.display = 'block';
    
    // Hide user menu
    if (userMenu) userMenu.style.display = 'none';
  }
}

// Make updateNavbar globally available
window.updateNavbar = updateNavbar;
window.loadUserProfile = loadUserProfile;

// ============================================
// LOGOUT FUNCTION
// ============================================
function logout() {
  const handleLogout = () => {
    localStorage.removeItem('elaUser');
    localStorage.removeItem('adminSession');
    updateNavbar();
    showNotification('You have been logged out successfully!', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  };

  if (auth) {
    signOut(auth).then(handleLogout).catch((error) => {
      console.error('Logout error:', error);
      // Still logout locally even if Firebase fails
      handleLogout();
    });
  } else {
    handleLogout();
  }
}

// Make logout globally available
window.logout = logout;

// ============================================
// GOOGLE SIGN-IN
// ============================================
async function signInWithGoogle() {
  if (!auth || !db) {
    showNotification('Authentication service not available', 'error');
    return;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Firestore
    const q = query(collection(db, "players"), where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    let userData;
    if (querySnapshot.empty) {
      // Create new user in Firestore
      userData = {
        uid: user.uid,
        name: user.displayName || 'Player',
        email: user.email,
        phone: '',
        dob: '',
        country: '',
        city: '',
        ign: '',
        role: 'Player',
        device: 'Mobile',
        experience: 'Beginner',
        team: 'Solo',
        verified: false,
        rank: 'Bronze',
        achievements: [],
        avatar: 'character_1.png',
        registeredAt: new Date().toISOString(),
        loginMethod: 'google'
      };
      await setDoc(doc(db, "players", user.uid), userData);
    } else {
      // Get existing user data
      querySnapshot.forEach((doc) => {
        userData = doc.data();
      });
      userData.loginMethod = 'google';
    }

    // Save to localStorage
    localStorage.setItem('elaUser', JSON.stringify(userData));
    updateNavbar();
    showNotification('Google login successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.assign('profile.html');
    }, 1000);
  } catch (error) {
    console.error('Google sign-in error:', error);
    showNotification('Google sign-in failed. Please try again.', 'error');
  }
}

// Make signInWithGoogle globally available

window.getAvatarSrc = function(userData) {
  return userData?.avatar || userData?.avatarPreview || (userData?.avatarFilename ? `assets/${userData.avatarFilename}` : 'assets/character_1.png');
};

window.handleAvatarUpload = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Always show immediate preview
  const reader = new FileReader();
  reader.onload = function(e) {
    const previewUrl = e.target.result;
    document.getElementById('profileAvatar').src = previewUrl;
    
    // Save preview to localStorage immediately
    const userData = JSON.parse(localStorage.getItem('elaUser') || '{}');
    userData.avatarPreview = previewUrl;
    userData.avatarFilename = file.name;
    localStorage.setItem('elaUser', JSON.stringify(userData));
  };
  reader.readAsDataURL(file);

  // Try Firebase upload if available
  if (storage && auth?.currentUser && db) {
    try {
      showNotification('Uploading to cloud...', 'info');
      const storageRef = ref(storage, `players/${auth.currentUser.uid}/avatar.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore with both URL and filename
      await setDoc(doc(db, 'players', auth.currentUser.uid), {
        avatar: downloadURL,
        avatarFilename: file.name,
        avatarUpdatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Update localStorage with cloud URL
      const userData = JSON.parse(localStorage.getItem('elaUser') || '{}');
      userData.avatar = downloadURL;
      localStorage.setItem('elaUser', JSON.stringify(userData));
      
      showNotification('✅ Cloud upload success! Photo synced everywhere.', 'success');
    } catch (error) {
      console.error('Cloud upload failed (CORS expected):', error);
      showNotification('📱 Local preview saved (cloud sync unavailable)', 'info');
    }
  } else {
    showNotification('📱 Local preview saved', 'info');
  }
};

// Enhance loadUserProfile with stats computation (new version replaces old orphaned version)

async function updateProfileStats(userData) {
  try {
    let stats = {
      totalTournaments: 0,
      matchesPlayed: 0,
      rankPoints: 0,
      winRate: '0%'
    };

    if (db && auth?.currentUser) {
      // Count user's tournament registrations
      const regQuery = query(
        collection(db, 'tournament_registrations'),
        where('teamCaptainUid', '==', userData.uid),
        where('status', '==', 'approved')
      );
      const regSnapshot = await getDocs(regQuery);
      stats.totalTournaments = regSnapshot.size;

      // Simple win rate demo (expand later)
      stats.winRate = stats.totalTournaments > 0 ? '42%' : '0%';
      stats.rankPoints = stats.totalTournaments * 100;
      stats.matchesPlayed = stats.totalTournaments * 5;
    }

    // Update UI
    document.getElementById('totalTournaments').textContent = stats.totalTournaments;
    document.getElementById('winRate').textContent = stats.winRate;
    document.getElementById('rankPoints').textContent = stats.rankPoints;
    document.getElementById('matchesPlayed').textContent = stats.matchesPlayed;
  } catch (error) {
    console.error('Stats computation error:', error);
  }
}

function updateAchievements(achievements) {
  const container = document.getElementById('achievementsList');
  if (!container) return;

  // Demo achievements for now
  const demoAchievements = [
    { icon: 'fas fa-trophy', name: 'Tournament Winner', unlocked: achievements?.includes('tournament_winner') },
    { icon: 'fas fa-fire', name: '10 Kill Game', unlocked: achievements?.includes('10_kills') },
    { icon: 'fas fa-crown', name: 'Top 10 Finish', unlocked: achievements?.includes('top10') },
    { icon: 'fas fa-star', name: '5-Star Rating', unlocked: achievements?.includes('5_star') }
  ];

  container.innerHTML = demoAchievements.map(ach => `
    <div class="achievement-card ${ach.unlocked ? 'unlocked' : ''}">
      <div class="achievement-icon">
        <i class="${ach.icon}"></i>
      </div>
      <span>${ach.name}</span>
    </div>
  `).join('');
}


// ============================================
// TOURNAMENT CONSTANTS & UTILITIES (PHASE 1)
// ============================================
const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing', 
  PAST: 'completed',
  REGISTRATION: 'registration'
};

function getCountdown(targetDate) {
  const now = new Date().getTime();
  const distance = targetDate - now;
  
  if (distance < 0) return null;
  
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, distance };
}

function formatCountdown(countdown) {
  if (!countdown) return '<span class="status-completed">Completed</span>';
  
  return `
    <div class="countdown-display">
      <span class="countdown-num">${countdown.days}</span><span>d</span>
      <span class="countdown-num">${countdown.hours}</span><span>h</span>
      <span class="countdown-num">${countdown.minutes}</span><span>m</span>
      <span class="countdown-num">${countdown.seconds}</span><span>s</span>
    </div>
  `;
}

// Update all countdowns on page
function updateAllCountdowns() {
  document.querySelectorAll('.tournament-card').forEach(card => {
    const countdownEl = card.querySelector('.countdown-display');
    const tournamentId = card.dataset.tournamentId;
    if (countdownEl && tournamentId) {
      // Update timer (real impl fetches from data attr)
      const timeStr = countdownEl.textContent;
      const [days, dhours, dmin, dsec] = timeStr.match(/\d+/g) || [];
      const newSeconds = (parseInt(dsec || 0) - 1 + 60) % 60;
      countdownEl.innerHTML = `${days}h${dhours}m${newSeconds}s`;
    }
  });
}

// ============================================
 // TOURNAMENT FUNCTIONS (ENHANCED PHASE 1)
 // ============================================

window.loadTournaments = async function(status = 'upcoming') {
  // Find lists on current page (index.html or events.html)
  const lists = {
    upcoming: document.getElementById('upcoming-events-list'),
    ongoing: document.getElementById('ongoing-events-list'),
    past: document.getElementById('past-events-list')
  };
  
  const titles = {
    upcoming: document.querySelector('.section-title:not(.ongoing-title):not(.past-title)'),
    ongoing: document.querySelector('.ongoing-title'),
    past: document.querySelector('.past-title')
  };

  const targetList = lists[status === 'completed' ? 'past' : status];
  if (!targetList) return;

  // Update tabs if present
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeTab = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
    btn.textContent.trim().toLowerCase().includes(status === 'completed' ? 'past' : status)
  );
  if (activeTab) activeTab.classList.add('active');

  // Hide all lists/titles, show target
  Object.values(lists).forEach(list => list ? list.style.display = 'none' : null);
  targetList.style.display = 'grid';
  
  Object.values(titles).forEach(title => title ? title.style.display = 'none' : null);
  if (titles[status === 'completed' ? 'past' : status]) {
    titles[status === 'completed' ? 'past' : status].style.display = 'block';
  }

  // Load tournaments - LOCAL DEMO MODE (Firebase fallback)
  console.log('Loading tournaments for', status, 'DB:', !!db);
  
  let tournaments = [];
  
  // Pure Firestore - Fetch ALL tournaments by status
  if (!db) {
    console.warn('No Firestore - cannot load real data');
    targetList.innerHTML = '<div class="no-events-card"><h3>Firestore Required</h3><p>Real tournaments need Firebase connection.</p></div>';
    return;
  }
  
  try {
    let q;
    if (status === 'upcoming') {
      q = query(collection(db, 'tournaments'), where('status', '==', 'upcoming'));
    } else if (status === 'ongoing') {
      q = query(collection(db, 'tournaments'), where('status', '==', 'ongoing'));
    } else { // completed/past
      q = query(collection(db, 'tournaments'), where('status', '==', 'completed'));
    }
    
    const snapshot = await getDocs(q);
    tournaments = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      status: doc.data().status || status  // Ensure status
    }));
    
    console.log(`✅ Firestore: Loaded ${tournaments.length} ${status} tournaments`);
    
    if (tournaments.length === 0) {
      targetList.innerHTML = `<div class="no-events-card">
        <i class="fas fa-calendar-times"></i>
        <h3>No ${status.toUpperCase()} Tournaments</h3>
        <p>Create some in Admin panel!</p>
      </div>`;
    } else {
      renderTournaments(tournaments, targetList);
    }
  } catch (error) {
    console.error('Firestore tournaments error:', error);
    targetList.innerHTML = '<div class="no-events-card"><i class="fas fa-exclamation-triangle"></i><h3>Load Error</h3></div>';
    showNotification('Failed to load from Firestore', 'error');
  }

};

async function loadUpcomingTournaments() {
  const upcomingList = document.getElementById("upcoming-events-list");
  if (!upcomingList) return;

  upcomingList.innerHTML = '<div class="loading">Loading tournaments...</div>';

  try {
    if (!db) {
      upcomingList.innerHTML = '<div class="no-events-card"><i class="fas fa-database"></i><h3>Service Unavailable</h3><p>Tournaments loading requires database connection.</p></div>';
      showNotification('Firestore unavailable', 'error');
      return;
    }

    const q = query(collection(db, "tournaments"), where("status", "==", "upcoming"), where("verified", "==", true));
    const querySnapshot = await getDocs(q);

    upcomingList.innerHTML = '';

    if (querySnapshot.empty) {
      upcomingList.innerHTML = `
        <div class="no-events-card">
          <i class="fas fa-calendar-alt"></i>
          <h3>No Upcoming Tournaments</h3>
          <p>Check back soon for new exciting tournaments!</p>
        </div>
      `;
      return;
    }

    const tournaments = [];
    querySnapshot.forEach((doc) => {
      tournaments.push({ id: doc.id, ...doc.data() });
    });
    renderTournaments(tournaments);

  } catch (error) {
    console.error('Error loading tournaments:', error);
    upcomingList.innerHTML = '<div class="no-events-card"><i class="fas fa-exclamation-triangle"></i><h3>Load Error</h3><p>Failed to load tournaments. Please refresh.</p></div>';
    showNotification('Failed to load tournaments', 'error');
  }
}

function renderTournaments(tournaments, targetList) {
  const listEl = targetList || document.getElementById("upcoming-events-list");
  if (!listEl) return;

  listEl.innerHTML = '';

  if (tournaments.length === 0) {
    listEl.innerHTML = `
      <div class="no-events-card">
        <i class="fas fa-calendar-alt"></i>
        <h3>No ${targetList.id.includes('past') ? 'Past' : targetList.id.includes('ongoing') ? 'Ongoing' : 'Upcoming'} Tournaments</h3>
        <p>Check back soon for new exciting tournaments!</p>
      </div>
    `;
    return;
  }

  tournaments.forEach((tournament) => {
    const card = document.createElement('div');
    card.className = 'event-card reveal-up card-float glow-breath';
    card.dataset.tournamentId = tournament.id;
    card.innerHTML = `
      <div class="event-header">
        <h3>${tournament.name}</h3>
        <span class="event-status status-${tournament.status || 'upcoming'}">${(tournament.status || 'upcoming').toUpperCase()}</span>
      </div>
      <div class="event-details">
        <p class="event-desc">${tournament.desc || 'Official ELA Tournament'}</p>
        ${tournament.date ? `<p class="event-date"><i class="fas fa-calendar"></i> ${new Date(tournament.date).toLocaleString()}</p>` : ''}
        ${tournament.prizePool ? `<p class="event-prize"><i class="fas fa-trophy"></i> ${tournament.prizePool}</p>` : ''}
        ${tournament.maxTeams ? `<p class="event-teams"><i class="fas fa-users"></i> Max ${tournament.maxTeams} teams</p>` : ''}
        ${tournament.gameMode ? `<p class="event-mode"><i class="fas fa-gamepad"></i> ${tournament.gameMode}</p>` : ''}
      </div>
      <a href="tournament-details.html?id=${tournament.id}" class="event-btn">View Details</a>
    `;
    listEl.appendChild(card);
  });
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
async function loadAdminPlayers() {
  const playersList = document.getElementById("playersList");
  if (!playersList) return;

  playersList.innerHTML = '<p>Loading players...</p>';

  try {
    if (!db) {
      // Fallback to localStorage
      const users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
      renderPlayerCards(users);
      return;
    }

    const querySnapshot = await getDocs(collection(db, "players"));
    const players = [];
    querySnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    renderPlayerCards(players);

  } catch (error) {
    console.error('Error loading players:', error);
    const users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
    renderPlayerCards(users);
  }
}

function renderPlayerCards(players) {
  const playersList = document.getElementById("playersList");
  if (!playersList) return;

  playersList.innerHTML = '';

  if (players.length === 0) {
    playersList.innerHTML = '<p>No players registered yet.</p>';
    return;
  }

  players.forEach((player) => {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    playerCard.innerHTML = `
      <div class="player-info">
        <h4>${player.name}</h4>
        <p>Email: ${player.email}</p>
        <p>IGN: ${player.ign || 'Not set'}</p>
        <p>Status: ${player.verified ? 'Verified' : 'Pending'}</p>
      </div>
      <div class="player-actions">
        ${!player.verified ? `<button onclick="verifyPlayer('${player.id || player.email}')" class="btn-approve">Approve</button>` : ''}
        <button onclick="rejectPlayer('${player.id || player.email}')" class="btn-reject">Reject</button>
      </div>
    `;
    playersList.appendChild(playerCard);
  });
}

window.verifyPlayer = async function(playerId) {
  try {
    if (db) {
      await updateDoc(doc(db, "players", playerId), { 
        verified: true,
        status: "Verified"
      });
    }
    
    // Update localStorage fallback
    let users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
    const userIndex = users.findIndex(u => u.id === playerId || u.uid === playerId);
    if (userIndex !== -1) {
      users[userIndex].verified = true;
      users[userIndex].status = "Verified";
      localStorage.setItem('elaUsers', JSON.stringify(users));
    }
    
    loadAdminPlayers();
    loadAdminStats();
    showNotification('Player verified successfully!', 'success');
  } catch (error) {
    console.error('Error verifying player:', error);
    showNotification('Failed to verify player: ' + error.message, 'error');
  }
};

window.rejectPlayer = async function(playerId) {
  if (!confirm('Reject this player? They will be removed from the players dataset but marked as rejected.')) return;

  try {
    if (db) {
      // First mark as rejected, then DELETE from players collection
      await updateDoc(doc(db, "players", playerId), { 
        verified: false,
        status: "Rejected"
      });
      await deleteDoc(doc(db, "players", playerId));
    }
    
    // Update localStorage fallback - remove from list
    let users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
    users = users.filter(u => u.id !== playerId && u.uid !== playerId);
    localStorage.setItem('elaUsers', JSON.stringify(users));
    
    loadAdminPlayers();
    loadAdminStats();
    showNotification('Player rejected and removed from dataset', 'success');
  } catch (error) {
    console.error('Error rejecting player:', error);
    showNotification('Failed to reject player: ' + error.message, 'error');
  }
};

// Load Admin Teams
async function loadAdminTeams() {
  const teamsList = document.getElementById("teamsList");
  if (!teamsList) return;

  try {
    if (!db) {
      const teams = JSON.parse(localStorage.getItem('teams') || '[]');
      renderTeamCards(teams);
      return;
    }

    const querySnapshot = await getDocs(collection(db, "teams"));
    const teams = [];
    querySnapshot.forEach((doc) => {
      teams.push({ id: doc.id, ...doc.data() });
    });
    renderTeamCards(teams);

  } catch (error) {
    console.error('Error loading teams:', error);
    const teams = JSON.parse(localStorage.getItem('teams') || '[]');
    renderTeamCards(teams);
  }
}

function renderTeamCards(teams) {
  const teamsList = document.getElementById("teamsList");
  if (!teamsList) return;

  teamsList.innerHTML = '';

  if (teams.length === 0) {
    teamsList.innerHTML = '<p>No teams registered yet.</p>';
    return;
  }

  teams.forEach((team) => {
    const teamCard = document.createElement('div');
    teamCard.className = 'team-card';
    teamCard.innerHTML = `
      <div class="team-info">
        <h4>${team.team}</h4>
        <p>Captain: ${team.captain}</p>
        <p>Email: ${team.email}</p>
        <p>Tournament: ${team.tournament}</p>
        <p>Size: ${team.size} players</p>
      </div>
    `;
    teamsList.appendChild(teamCard);
  });
}

// Add Tournament
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addTournamentForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('adminEventName').value.trim();
      const desc = document.getElementById('adminEventDesc').value.trim();
      const dateStr = document.getElementById('adminEventDate').value;
      if (!dateStr) {
        showNotification('Please select a date', 'error');
        return;
      }
      const date = new Date(dateStr + ':00');
      const maxTeams = document.getElementById('adminMaxTeams').value;
      const prizePool = document.getElementById('adminPrizePool').value.trim();
      const gameMode = document.getElementById('adminGameMode').value;
      const status = document.getElementById('adminStatus').value;
      const rules = document.getElementById('adminRules').value.trim();
      
      if (!name || !desc || !date || !prizePool || !status) {
        showNotification('Please fill all required fields', 'error');
        return;
      }
      
      await addTournament(name, desc, date.toISOString(), maxTeams, prizePool, gameMode || 'Squad', rules, status);
      form.reset();
    };
  }
});

async function addTournament(name, desc, date, maxTeams, prizePool, gameMode, rules, status) {
  const tournamentData = {
    name: name,
    desc: desc,
    date: date,
    maxTeams: parseInt(maxTeams),
    prizePool: prizePool,
    gameMode: gameMode,
    rules: rules || '',
    status: status,
    verified: true,
    createdAt: new Date().toISOString(),
    registeredTeams: 0
  };

  try {
    await addDoc(collection(db, "tournaments"), tournamentData);
    showNotification('Tournament created! Refresh home page.', 'success');
    loadAdminTournaments();
  } catch (error) {
    console.error('Error adding tournament:', error);
    showNotification('Failed to add: ' + error.message, 'error');
  }
}

// Load Admin Tournaments
async function loadAdminTournaments() {
  const tournamentsList = document.getElementById("tournamentsList");
  if (!tournamentsList) return;

  const tableBody = tournamentsList.querySelector('.table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<p>Loading tournaments...</p>';

  try {
    let tournaments = [];
    
    if (db) {
      const querySnapshot = await getDocs(collection(db, "tournaments"));
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() });
      });
    } else {
      tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
    }

    tableBody.innerHTML = '';

    if (tournaments.length === 0) {
      tableBody.innerHTML = '<div class="table-row"><span colspan="6">No tournaments found.</span></div>';
      return;
    }

    tournaments.forEach((tournament) => {
      const tournamentRow = document.createElement('div');
      tournamentRow.className = 'table-row';
      tournamentRow.innerHTML = `
        <span>${tournament.name}</span>
        <span>${tournament.date ? new Date(tournament.date).toLocaleString() : 'TBD'}</span>
        <span>${tournament.prizePool || 'TBD'}</span>
        <span>${tournament.maxTeams || 'Unlimited'}</span>
        <span><span class="status-${tournament.status || 'upcoming'}">${(tournament.status || 'upcoming').toUpperCase()}</span></span>
        <span>
          <button onclick="editTournament('${tournament.id}')" class="btn-edit">Edit</button>
          <button onclick="deleteTournament('${tournament.id}')" class="btn-delete">Delete</button>
        </span>
      `;
      tableBody.appendChild(tournamentRow);
    });
  } catch (error) {
    console.error('Error loading tournaments:', error);
    tableBody.innerHTML = '<div class="table-row"><span colspan="6">Error loading tournaments.</span></div>';
  }
}

window.editTournament = async function(tournamentId) {
  try {
    let tournament;
    
    if (db) {
      const tournamentDoc = await getDoc(doc(db, "tournaments", tournamentId));
      if (tournamentDoc.exists()) {
        tournament = tournamentDoc.data();
      }
    } else {
      const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
      tournament = tournaments.find(t => t.id === tournamentId);
    }

    if (tournament) {
      // Populate form with existing data
      document.getElementById('adminEventName').value = tournament.name || '';
      document.getElementById('adminEventDesc').value = tournament.desc || '';
      document.getElementById('adminEventDate').value = tournament.date ? new Date(tournament.date).toISOString().slice(0, 16) : '';
      document.getElementById('adminMaxTeams').value = tournament.maxTeams || '';
      document.getElementById('adminPrizePool').value = tournament.prizePool || '';
      document.getElementById('adminGameMode').value = tournament.gameMode || '';
      document.getElementById('adminRules').value = tournament.rules || '';
      document.getElementById('adminStatus').value = tournament.status || 'upcoming';

      // Change button text and add data attribute
      const submitBtn = document.querySelector('#addTournamentForm button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Update Tournament';
        submitBtn.setAttribute('data-edit-id', tournamentId);
      }

      // Scroll to form
      const form = document.getElementById('addTournamentForm');
      if (form) form.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    console.error('Error loading tournament for edit:', error);
    showNotification('Failed to load tournament data.', 'error');
  }
};

window.deleteTournament = async function(tournamentId) {
  if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
    return;
  }

  try {
    if (db) {
      await deleteDoc(doc(db, "tournaments", tournamentId));
    }
    
    // Also update localStorage
    let tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
    tournaments = tournaments.filter(t => t.id !== tournamentId);
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    
    loadAdminTournaments();
    loadUpcomingTournaments();
    showNotification('Tournament deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting tournament:', error);
    showNotification('Failed to delete tournament.', 'error');
  }
};

async function updateTournament(tournamentId, name, desc, date, maxTeams, prizePool, gameMode, rules, status) {
  try {
    if (db) {
      await updateDoc(doc(db, "tournaments", tournamentId), {
        name: name,
        desc: desc,
        date: date,
        maxTeams: parseInt(maxTeams),
        prizePool: prizePool,
        gameMode: gameMode,
        rules: rules || '',
        status: status,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Also update localStorage
    let tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
    const index = tournaments.findIndex(t => t.id === tournamentId);
    if (index !== -1) {
      tournaments[index] = { ...tournaments[index], name, desc, date, maxTeams, prizePool, gameMode, rules, status };
      localStorage.setItem('tournaments', JSON.stringify(tournaments));
    }
    
    showNotification('Tournament updated successfully!', 'success');
    loadAdminTournaments();
    loadUpcomingTournaments();
  } catch (error) {
    console.error('Error updating tournament:', error);
    showNotification('Failed to update tournament.', 'error');
  }
}

// Load Admin Stats
async function loadAdminStats() {
  try {
    let totalPlayers = 0;
    let verifiedPlayers = 0;
    let activeTournaments = 0;

    if (db) {
      // Get total players
      const playersSnapshot = await getDocs(collection(db, "players"));
      totalPlayers = playersSnapshot.size;
      verifiedPlayers = playersSnapshot.docs.filter(doc => doc.data().verified).length;

      // Get active tournaments
      const tournamentsSnapshot = await getDocs(collection(db, "tournaments"));
    activeTournaments = tournamentsSnapshot.docs.filter(doc => {
        const status = doc.data().status;
        return status !== 'completed';
      }).length;
    } else {
      // Fallback to localStorage
      const users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
      totalPlayers = users.length;
      verifiedPlayers = users.filter(u => u.verified).length;
      
      const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
    activeTournaments = tournaments.filter(t => 
        t.status !== 'completed'
      ).length;
    }

    const pendingPlayers = totalPlayers - verifiedPlayers;

    // Update stats display
    const totalPlayersEl = document.getElementById('totalPlayers');
    const verifiedPlayersEl = document.getElementById('verifiedPlayers');
    const pendingPlayersEl = document.getElementById('pendingPlayers');
    const activeTournamentsEl = document.getElementById('activeTournaments');

    if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
    if (verifiedPlayersEl) verifiedPlayersEl.textContent = verifiedPlayers;
    if (pendingPlayersEl) pendingPlayersEl.textContent = pendingPlayers;
    if (activeTournamentsEl) activeTournamentsEl.textContent = activeTournaments;

  } catch (error) {
    console.error('Error loading admin stats:', error);
  }
}

// ============================================
// PROFILE FUNCTIONS
// ============================================
// 🔍 DEBUG: USER PROFILE - TEMP BYPASS LIKE ADMIN
async function loadUserProfile() {
  console.log('🔍 loadUserProfile() - elaUser:', localStorage.getItem('elaUser'));
  console.log('🔍 currentUser:', auth?.currentUser?.uid);
  
  // TEMP BYPASS - use localStorage first (like admin fix)
  let userData = JSON.parse(localStorage.getItem('elaUser') || '{}');
  if (userData && Object.keys(userData).length > 0) {
    console.log('✅ Using localStorage userData');
  } else {
    console.log('❌ No localStorage userData');
  }
  
  const user = auth?.currentUser;
  if (!user && !userData.uid) {
    // Redirect to login if no local data either
    const section = document.querySelector('.section');
    if (section) {
      section.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); padding: 40px; border-radius: 15px; max-width: 400px; margin: 0 auto;">
            <i class="fas fa-lock" style="font-size: 3rem; color: var(--neon-blue); margin-bottom: 20px;"></i>
            <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: white;">Authentication Required</h3>
            <p style="color: var(--text-dim); margin-bottom: 20px;">Please log in to view your profile.</p>
            <a href="login.html" style="background: var(--neon-blue); color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Login</a>
          </div>
        </div>
      `;
    }
    setTimeout(() => window.location.href = 'login.html', 3000);
    return;
  }

  try {
    // Try Firestore sync if available (non-blocking)
    if (user && db && user.uid === userData.uid) {
      const userDoc = await getDoc(doc(db, "players", user.uid));
      if (userDoc.exists()) {
        userData = { ...userData, ...userDoc.data() }; // Merge
        console.log('✅ Firestore sync success');
      }
    }
  } catch (error) {
    console.error('Firestore sync failed (offline OK):', error);
  }

  // Update UI with available data
  console.log('✅ Rendering profile:', userData.name || 'Unnamed');
  const profileName = document.getElementById('profileName');
  const profileAvatar = document.getElementById('profileAvatar');
  if (profileName) profileName.textContent = userData.name || user?.displayName || 'Player';
  if (profileAvatar) profileAvatar.src = getAvatarSrc(userData) || 'assets/character_1.png';

  // Update verification badge
  const verifiedBadge = document.getElementById('verifiedBadge');
  if (verifiedBadge) verifiedBadge.style.display = userData.verified ? 'inline-block' : 'none';

  // Update rank badge
  const rankBadge = document.getElementById('rankBadge');
  if (rankBadge) rankBadge.textContent = userData.rank || 'Bronze';

  // Personal Info
  const displayName = document.getElementById('displayName');
  const displayEmail = document.getElementById('displayEmail');
  const displayPhone = document.getElementById('displayPhone');
  const displayDob = document.getElementById('displayDob');
  const displayCountry = document.getElementById('displayCountry');
  const displayCity = document.getElementById('displayCity');
  if (displayName) displayName.textContent = userData.name || '-';
  if (displayEmail) displayEmail.textContent = userData.email || user?.email || '-';
  if (displayPhone) displayPhone.textContent = userData.phone || '-';
  if (displayDob) displayDob.textContent = userData.dob || '-';
  if (displayCountry) displayCountry.textContent = userData.country || '-';
  if (displayCity) displayCity.textContent = userData.city || '-';

  // Gaming Profile
  const displayIGN = document.getElementById('displayIGN');
  const displayUID = document.getElementById('displayUID');
  const displayRole = document.getElementById('displayRole');
  const displayDevice = document.getElementById('displayDevice');
  const displayExperience = document.getElementById('displayExperience');
  const displayTeam = document.getElementById('displayTeam');
  if (displayIGN) displayIGN.textContent = userData.ign || '-';
  if (displayUID) displayUID.textContent = userData.uid || '-';
  if (displayRole) displayRole.textContent = userData.role || '-';
  if (displayDevice) displayDevice.textContent = userData.device || '-';
  if (displayExperience) displayExperience.textContent = userData.experience || '-';
  if (displayTeam) displayTeam.textContent = userData.team || '-';

  // Load tournaments (non-blocking)
  if (userData.uid) loadUserTournaments(userData.uid).catch(console.error);
}

async function loadUserTournaments(userId) {
  const tournamentsList = document.getElementById('userTournaments');
  if (!tournamentsList) return;

  try {
    let teams = [];
    
    if (db && auth?.currentUser) {
      const teamsQuery = query(collection(db, "teams"), where("captainEmail", "==", auth.currentUser.email));
      const teamsSnapshot = await getDocs(teamsQuery);
      teamsSnapshot.forEach((doc) => {
        teams.push(doc.data());
      });
    } else {
      teams = JSON.parse(localStorage.getItem('teams') || '[]');
    }

    if (teams.length === 0) {
      tournamentsList.innerHTML = '<p>No tournaments joined yet.</p>';
      return;
    }

    tournamentsList.innerHTML = '';
    teams.forEach((team) => {
      const tournamentCard = document.createElement('div');
      tournamentCard.className = 'tournament-card';
      tournamentCard.innerHTML = `
        <h4>${team.tournament}</h4>
        <p><strong>Team:</strong> ${team.team}</p>
        <p><strong>Role:</strong> Captain</p>
        <p><strong>Team Size:</strong> ${team.size} players</p>
        <p><strong>Registered:</strong> ${team.registeredAt ? new Date(team.registeredAt).toLocaleDateString() : 'N/A'}</p>
      `;
      tournamentsList.appendChild(tournamentCard);
    });
  } catch (error) {
    console.error('Error loading user tournaments:', error);
  }
}

// Initialize Profile Editing (existing, kept for tabs etc.)
function initializeProfileEditing() {
  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const profileTabs = document.querySelectorAll('.profile-tab');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      profileTabs.forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      const tabContent = document.getElementById(btn.dataset.tab + 'Tab');
      if (tabContent) tabContent.classList.add('active');
    });
  });

  // Edit buttons
  const editBtns = document.querySelectorAll('.edit-btn');
  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openEditModal(btn.dataset.edit);
    });
  });

  // Modal close
  const closeModal = document.querySelector('.close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      const modal = document.getElementById('editModal');
      if (modal) modal.style.display = 'none';
    });
  }

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

window.editPersonalInfo = () => openEditModal('personal');
window.editGamingInfo = () => openEditModal('gaming');

// Open Edit Modal
function openEditModal(type) {
  const modal = document.getElementById('editModal');
  const modalTitle = document.getElementById('modalTitle');
  const editForm = document.getElementById('editForm');

  if (!modal || !modalTitle || !editForm) return;

  const user = JSON.parse(localStorage.getItem('elaUser'));

  if (type === 'personal') {
    modalTitle.textContent = 'Edit Personal Information';
    editForm.innerHTML = `
      <div class="form-group">
        <label for="editName">Full Name</label>
        <input type="text" id="editName" class="input-box" value="${user?.name || ''}" required>
      </div>
      <div class="form-group">
        <label for="editPhone">Phone Number</label>
        <input type="tel" id="editPhone" class="input-box" value="${user?.phone || ''}">
      </div>
      <div class="form-group">
        <label for="editDob">Date of Birth</label>
        <input type="date" id="editDob" class="input-box" value="${user?.dob || ''}">
      </div>
      <div class="form-group">
        <label for="editCountry">Country</label>
        <input type="text" id="editCountry" class="input-box" value="${user?.country || ''}">
      </div>
      <div class="form-group">
        <label for="editCity">City</label>
        <input type="text" id="editCity" class="input-box" value="${user?.city || ''}">
      </div>
      <button type="submit" class="btn-main">Save Changes</button>
    `;
  } else if (type === 'gaming') {
    modalTitle.textContent = 'Edit Gaming Profile';
    editForm.innerHTML = `
      <div class="form-group">
        <label for="editIGN">In Game Name</label>
        <input type="text" id="editIGN" class="input-box" value="${user?.ign || ''}" required>
      </div>
      <div class="form-group">
        <label for="editUID">Free Fire UID</label>
        <input type="text" id="editUID" class="input-box" value="${user?.uid || ''}">
      </div>
      <div class="form-group">
        <label for="editRole">Preferred Role</label>
        <select id="editRole" class="input-box">
          <option value="">Select Role</option>
          <option value="Rusher" ${user?.role === 'Rusher' ? 'selected' : ''}>Rusher</option>
          <option value="Defender" ${user?.role === 'Defender' ? 'selected' : ''}>Defender</option>
          <option value="Sniper" ${user?.role === 'Sniper' ? 'selected' : ''}>Sniper</option>
          <option value="Support" ${user?.role === 'Support' ? 'selected' : ''}>Support</option>
          <option value="All-Rounder" ${user?.role === 'All-Rounder' ? 'selected' : ''}>All-Rounder</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editDevice">Device Type</label>
        <select id="editDevice" class="input-box">
          <option value="">Select Device</option>
          <option value="Mobile" ${user?.device === 'Mobile' ? 'selected' : ''}>Mobile</option>
          <option value="Emulator" ${user?.device === 'Emulator' ? 'selected' : ''}>Emulator</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editExperience">Experience Level</label>
        <select id="editExperience" class="input-box">
          <option value="">Select Experience</option>
          <option value="Beginner" ${user?.experience === 'Beginner' ? 'selected' : ''}>Beginner</option>
          <option value="Intermediate" ${user?.experience === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
          <option value="Advanced" ${user?.experience === 'Advanced' ? 'selected' : ''}>Advanced</option>
          <option value="Professional" ${user?.experience === 'Professional' ? 'selected' : ''}>Professional</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editTeam">Team Name</label>
        <input type="text" id="editTeam" class="input-box" value="${user?.team || ''}">
      </div>
      <button type="submit" class="btn-main">Save Changes</button>
    `;
  }

  modal.style.display = 'block';

  // Handle form submission
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfileChanges(type);
  });
}

// Save Profile Changes
async function saveProfileChanges(type) {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user) return;

  try {
    const updates = {};

    if (type === 'personal') {
      updates.name = document.getElementById('editName').value;
      updates.phone = document.getElementById('editPhone').value;
      updates.dob = document.getElementById('editDob').value;
      updates.country = document.getElementById('editCountry').value;
      updates.city = document.getElementById('editCity').value;
    } else if (type === 'gaming') {
      updates.ign = document.getElementById('editIGN').value;
      updates.uid = document.getElementById('editUID').value;
      updates.role = document.getElementById('editRole').value;
      updates.device = document.getElementById('editDevice').value;
      updates.experience = document.getElementById('editExperience').value;
      updates.team = document.getElementById('editTeam').value;
    }

    // Update Firestore if available (set with merge to handle non-existent docs)
    if (auth?.currentUser && db) {
      await setDoc(doc(db, "players", auth.currentUser.uid), updates, { merge: true });
    }

    // Update localStorage
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('elaUser', JSON.stringify(updatedUser));

    document.getElementById('editModal').style.display = 'none';
    showNotification('Profile updated successfully!', 'success');

    // Reload profile data
    loadUserProfile();

  } catch (error) {
    console.error('Error updating profile:', error);
    // Still save to localStorage even if Firebase fails - SAFE null checks
    const updatedUser = { ...user };
    if (type === 'personal') {
      const editName = document.getElementById('editName');
      if (editName) updatedUser.name = editName.value;
      
      const editPhone = document.getElementById('editPhone');
      if (editPhone) updatedUser.phone = editPhone.value;
      
      const editDob = document.getElementById('editDob');
      if (editDob) updatedUser.dob = editDob.value;
      
      const editCountry = document.getElementById('editCountry');
      if (editCountry) updatedUser.country = editCountry.value;
      
      const editCity = document.getElementById('editCity');
      if (editCity) updatedUser.city = editCity.value;
    } else if (type === 'gaming') {
      const editIGN = document.getElementById('editIGN');
      if (editIGN) updatedUser.ign = editIGN.value;
      
      const editUID = document.getElementById('editUID');
      if (editUID) updatedUser.uid = editUID.value;
      
      const editRole = document.getElementById('editRole');
      if (editRole) updatedUser.role = editRole.value;
      
      const editDevice = document.getElementById('editDevice');
      if (editDevice) updatedUser.device = editDevice.value;
      
      const editExperience = document.getElementById('editExperience');
      if (editExperience) updatedUser.experience = editExperience.value;
      
      const editTeam = document.getElementById('editTeam');
      if (editTeam) updatedUser.team = editTeam.value;
    }
    localStorage.setItem('elaUser', JSON.stringify(updatedUser));
    document.getElementById('editModal').style.display = 'none';
    showNotification('Profile updated locally (cloud sync failed)', 'info');
    loadUserProfile();
  }
}

// ============================================
// PLAYERS PAGE FUNCTIONS
// ============================================
async function loadVerifiedPlayers() {
  const playersGrid = document.getElementById("playersGrid");
  const noPlayers = document.getElementById("noPlayers");
  if (!playersGrid) return;

  playersGrid.innerHTML = "";

  try {
    let verifiedPlayers = [];
    
    if (db) {
      const querySnapshot = await getDocs(collection(db, "players"));
      querySnapshot.forEach((doc) => {
        const player = doc.data();
        if (player.verified) {
          verifiedPlayers.push({ id: doc.id, ...player });
        }
      });
    } else {
      // Fallback to localStorage
      const users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
      verifiedPlayers = users.filter(u => u.verified);
    }

    if (verifiedPlayers.length === 0) {
      if (noPlayers) noPlayers.style.display = "block";
      return;
    }

    if (noPlayers) noPlayers.style.display = "none";

    verifiedPlayers.forEach(player => {
      const playerCard = createPlayerCard(player);
      playersGrid.appendChild(playerCard);
    });

  } catch (firebaseError) {
    console.error('Error loading players:', firebaseError);
    // Fallback to localStorage
    const users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
    const verifiedPlayers = users.filter(u => u.verified);

    if (verifiedPlayers.length === 0) {
      if (noPlayers) noPlayers.style.display = "block";
      return;
    }

    if (noPlayers) noPlayers.style.display = "none";

    verifiedPlayers.forEach(player => {
      const playerCard = createPlayerCard(player);
      playersGrid.appendChild(playerCard);
    });
  }
}

function createPlayerCard(player) {
  const card = document.createElement('div');
  card.className = 'player-card reveal-up';
  card.setAttribute('data-role', (player.role || 'player').toLowerCase());
  card.innerHTML = `
    <div class="player-avatar">
      <img src="${getAvatarSrc(player) || 'assets/character_1.png'}" alt="${player.name}" onerror="this.src='assets/character_1.png'">
      <div class="player-rank">${player.rank || 'Bronze'}</div>
    </div>
    <div class="player-info">
      <h3 class="player-name">${player.name}</h3>
      <p class="player-ign">${player.ign || 'N/A'}</p>
      <div class="player-details">
        <span class="player-role">${player.role || 'Player'}</span>
        <span class="player-device">${player.device || 'Mobile'}</span>
      </div>
      <div class="player-stats">
        <div class="stat">
          <span class="stat-label">Experience</span>
          <span class="stat-value">${player.experience || 'Beginner'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Team</span>
          <span class="stat-value">${player.team || 'Solo'}</span>
        </div>
      </div>
    </div>
    <button class="view-profile-btn" onclick="showPlayerModal('${player.email}')">
      <i class="fas fa-eye"></i> View Profile
    </button>
  `;
  return card;
}

window.showPlayerModal = function(email) {
  // Find player data
  let player = null;
  
  // Try localStorage first
  const users = JSON.parse(localStorage.getItem('elaUsers') || '[]');
  player = users.find(u => u.email === email);
  
  if (!player) {
    showNotification('Player not found', 'error');
    return;
  }

  // Update modal content
  const modalAvatar = document.getElementById('modalAvatar');
  const modalName = document.getElementById('modalName');
  const modalRank = document.getElementById('modalRank');
  const modalIGN = document.getElementById('modalIGN');
  const modalUID = document.getElementById('modalUID');
  const modalRole = document.getElementById('modalRole');
  const modalExperience = document.getElementById('modalExperience');
  const modalDevice = document.getElementById('modalDevice');
  const modalTeam = document.getElementById('modalTeam');

  if (modalAvatar) modalAvatar.src = getAvatarSrc(player) || 'assets/character_1.png';
  if (modalName) modalName.textContent = player.name;
  if (modalRank) modalRank.textContent = player.rank || 'Bronze';
  if (modalIGN) modalIGN.textContent = player.ign || 'N/A';
  if (modalUID) modalUID.textContent = player.uid || 'N/A';
  if (modalRole) modalRole.textContent = player.role || 'Player';
  if (modalExperience) modalExperience.textContent = player.experience || 'Beginner';
  if (modalDevice) modalDevice.textContent = player.device || 'Mobile';
  if (modalTeam) modalTeam.textContent = player.team || 'Solo';

  // Show modal
  const modal = document.getElementById('playerModal');
  if (modal) {
    modal.style.display = 'block';
  }
};

// Close player modal
window.closePlayerModal = function() {
  const modal = document.getElementById('playerModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// ============================================
// ADMIN REGISTRATION FUNCTIONS (PHASE 1.5)
// ============================================
async function loadAdminRegistrations() {
  const list = document.getElementById("registrationsList");
  const countEl = document.getElementById("pendingCount");
  if (!list) return;

  list.innerHTML = '<p>Loading registrations...</p>';

  try {
    const q = query(collection(db, "tournament_registrations"), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    
    list.innerHTML = '';
    let pendingCount = 0;
    
    snapshot.forEach((doc) => {
      const reg = doc.data();
      pendingCount++;
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <span>${reg.teamName}</span>
        <span>${reg.tournamentName}</span>
        <span>${reg.captainName} (${reg.captainEmail})</span>
        <span class="status-pending">PENDING</span>
        <span>${new Date(reg.registeredAt).toLocaleDateString()}</span>
        <span>
          <button onclick="approveRegistration('${doc.id}', 'approved')" class="btn-approve">Approve</button>
          <button onclick="approveRegistration('${doc.id}', 'rejected')" class="btn-reject">Reject</button>
        </span>
      `;

      list.appendChild(row);
    });
    
    if (countEl) countEl.textContent = pendingCount;
    
  } catch (error) {
    list.innerHTML = '<p>Error loading registrations</p>';
  }
}

window.approveRegistration = async function(regId, status) {
  if (!confirm(`Mark registration as ${status.toUpperCase()}?`)) return;

  try {
    // Get current registration data
    const regDoc = await getDoc(doc(db, "tournament_registrations", regId));
    const regData = regDoc.data();

    if (status === 'rejected') {
      // DELETE rejected registration completely
      await deleteDoc(doc(db, "tournament_registrations", regId));
      showNotification('Registration rejected and removed from dataset', 'success');
    } else {
      // Update approved registration (keep in dataset)
      await updateDoc(doc(db, "tournament_registrations", regId), {
        status: status,
        approvedAt: new Date().toISOString(),
        approvedBy: JSON.parse(localStorage.getItem('adminSession'))?.email || 'admin'
      });
      showNotification('Registration approved!', 'success');
    }

    // Reload registrations list
    loadAdminRegistrations();
    
  } catch (error) {
    console.error('Approve/Reject error:', error);
    showNotification('Error: ' + error.message, 'error');
  }
};

// ADMIN TAB SWITCHING
function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update active tab
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(targetTab + 'Tab').classList.add('active');
      
      // Load tab data
      if (targetTab === 'players') loadAdminPlayers();
      if (targetTab === 'tournaments') loadAdminTournaments();
      if (targetTab === 'registrations') loadAdminRegistrations();
      if (targetTab === 'orgs') loadAdminTeams();
    });
  });
}

// ADMIN PAGE PROTECTION
// ============================================
// 🔍 DEBUG: ADMIN PAGE PROTECTION - TEMP BYPASS
async function checkAdminAccess() {
  console.log('🔍 checkAdminAccess() - adminSession:', localStorage.getItem('adminSession'));
  console.log('🔍 currentUser:', auth?.currentUser?.uid);
  
  // TEMP BYPASS for testing - check localStorage first
  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  if (adminSession.isAdmin) {
    console.log('✅ Admin session valid - SKIP Firebase check');
    return true;
  }
  
  // Original Firebase check
  if (!(await window.isAdmin())) {
    console.log('❌ isAdmin() failed - clearing session');
    localStorage.removeItem('adminSession');
    if (window.location.pathname.includes('admin.html')) {
      window.location.href = 'admin-login.html';
    }
    return false;
  }
  
  // Refresh session
  localStorage.setItem('adminSession', JSON.stringify({ 
    isAdmin: true, 
    email: auth?.currentUser?.email || adminSession.email,
    uid: auth?.currentUser?.uid || adminSession.uid
  }));
  
  console.log('✅ Admin access granted');
  return true;
}

// ============================================
 // TOURNAMENT REGISTRATION (PHASE 2)
 // ============================================



// ============================================
 // TOURNAMENT REGISTRATION (PHASE 2)
// ============================================

function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
window.getUrlParam = getUrlParam;

window.registerForTournament = async function(tournamentId = null) {
  try {
    const user = JSON.parse(localStorage.getItem('elaUser'));
    if (!user) {
      showNotification('Please login to register', 'error');
      window.location.href = 'login.html';
      return;
    }

    if (!tournamentId) {
      tournamentId = getUrlParam('id');
      if (!tournamentId) {
        showNotification('No tournament selected', 'error');
        return;
      }
    }

    // Get user teams
    const teams = await getUserTeams();
    if (teams.length === 0) {
      const createNew = confirm('No teams found. Create new team now?');
      if (createNew) {
        const teamName = prompt('Enter team name:');
        if (teamName) {
          const teamId = await createTeam(teamName);
          if (teamId) {
            await registerTeamForTournament(teamId, tournamentId);
            return;
          }
        }
      } else {
        window.location.href = 'team.html';
        return;
      }
    }

    // Use first team
    const teamId = teams[0].id;
    await registerTeamForTournament(teamId, tournamentId);
    showNotification('Team registered successfully! Awaiting admin approval.', 'success');
  } catch (error) {
    console.error('Registration error:', error);
    showNotification(`Registration failed: ${error.message}`, 'error');
  }
};

// ============================================
 // TEAM SYSTEM FUNCTIONS (PHASE 2)
// ============================================


// Create a new team
window.createTeam = async function(teamName, description = '') {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user || !db) {
    showNotification('Please login and ensure database is available', 'error');
    return null;
  }

  try {
    const teamData = {
      name: teamName,
      captainUid: user.uid,
      captainName: user.name,
      captainEmail: user.email,
      description: description,
      members: [user.uid],  // Captain is first member
      maxMembers: 5,
      status: 'active',
      createdAt: new Date().toISOString(),
      tournaments: []
    };

    const teamRef = await addDoc(collection(db, 'teams'), teamData);
    
    // Add team to player profile
    await updateDoc(doc(db, 'players', user.uid), {
      teams: arrayUnion(teamRef.id),
      team: teamName  // Legacy field
    });

    // Update localStorage
    user.currentTeam = teamRef.id;
    user.teams = user.teams ? [...user.teams, teamRef.id] : [teamRef.id];
    localStorage.setItem('elaUser', JSON.stringify(user));

    showNotification('Team created successfully!', 'success');
    return teamRef.id;
  } catch (error) {
    console.error('Error creating team:', error);
    showNotification('Failed to create team: ' + error.message, 'error');
    return null;
  }
};

// Get user's teams
window.getUserTeams = async function() {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user || !db) return [];

  try {
    const teamsQuery = query(
      collection(db, 'teams'), 
      where('members', 'array-contains', user.uid)
    );
    const snapshot = await getDocs(teamsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
};

// Send team invite
window.sendTeamInvite = async function(teamId, recipientEmail) {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user || !db) return;

  // Verify captain
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists() || teamDoc.data().captainUid !== user.uid) {
    showNotification('Only team captain can send invites', 'error');
    return;
  }

  try {
    const inviteData = {
      teamId: teamId,
      senderUid: user.uid,
      senderName: user.name,
      senderEmail: user.email,
      recipientEmail: recipientEmail,
      status: 'pending',
      sentAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'team_invites'), inviteData);
    showNotification('Team invite sent!', 'success');
  } catch (error) {
    console.error('Error sending invite:', error);
    showNotification('Failed to send invite', 'error');
  }
};

// Accept team invite
window.acceptTeamInvite = async function(inviteId) {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user || !db) return;

  try {
    const inviteRef = doc(db, 'team_invites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists() || inviteSnap.data().recipientEmail !== user.email) {
      showNotification('Invalid invite', 'error');
      return;
    }

    const teamId = inviteSnap.data().teamId;
    const teamRef = doc(db, 'teams', teamId);

    // Add to team members
    await updateDoc(teamRef, {
      members: arrayUnion(user.uid)
    });

    // Add to player teams
    await updateDoc(doc(db, 'players', user.uid), {
      teams: arrayUnion(teamId)
    });

    // Delete invite
    await deleteDoc(inviteRef);

    showNotification('Joined team successfully!', 'success');
  } catch (error) {
    console.error('Error accepting invite:', error);
    showNotification('Failed to join team', 'error');
  }
};

// Get team members
window.getTeamMembers = async function(teamId) {
  if (!db) return [];

  try {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) return [];

    const memberUids = teamDoc.data().members || [];
    const members = [];

    for (const uid of memberUids) {
      const playerDoc = await getDoc(doc(db, 'players', uid));
      if (playerDoc.exists()) {
        members.push(playerDoc.data());
      }
    }

    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
};

// CHECK REGISTRATION STATUS FOR UI - Called on page load
window.checkRegistrationStatus = async function(tournamentId) {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user || !db) return 'login';

  try {
    // Get user's teams
    const teamsQuery = query(
      collection(db, 'teams'), 
      where('members', 'array-contains', user.uid)
    );
    const teamsSnapshot = await getDocs(teamsQuery);
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamId = teamDoc.id;
      
      // Check if this team is registered for tournament
      const regQuery = query(
        collection(db, 'tournament_registrations'),
        where('teamId', '==', teamId),
        where('tournamentId', '==', tournamentId),
        where('teamCaptainUid', '==', user.uid)
      );
      const regSnapshot = await getDocs(regQuery);
      
      if (!regSnapshot.empty) {
        const reg = regSnapshot.docs[0].data();
        return {
          status: reg.status,
          teamId: teamId,
          teamName: teamDoc.data().name
        };
      }
    }
    
    return null; // No registration
  } catch (error) {
    console.error('Status check error:', error);
    return 'error';
  }
};

// Register team for tournament
window.registerTeamForTournament = async function(teamId, tournamentId) {
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (!user || !db) return;

  try {
    // Verify captain
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists() || teamDoc.data().captainUid !== user.uid) {
      showNotification('Only captain can register', 'error');
      return;
    }

    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      showNotification('Tournament not found', 'error');
      return;
    }

    // CHECK FOR EXISTING REGISTRATION
    const existingQuery = query(
      collection(db, 'tournament_registrations'),
      where('teamId', '==', teamId),
      where('tournamentId', '==', tournamentId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      const existingReg = existingSnapshot.docs[0].data();
      showNotification(`Team already registered (Status: ${existingReg.status.toUpperCase()})`, 'info');
      return;
    }

    const regData = {
      teamId: teamId,
      teamName: teamDoc.data().name,
      tournamentId: tournamentId,
      tournamentName: tournamentDoc.data().name,
      teamCaptainUid: user.uid,
      captainName: user.name,
      captainEmail: user.email,
      status: 'pending',
      registeredAt: new Date().toISOString(),
      members: teamDoc.data().members || []
    };

    await addDoc(collection(db, 'tournament_registrations'), regData);

    // Add to team tournaments
    await updateDoc(doc(db, 'teams', teamId), {
      tournaments: arrayUnion(tournamentId)
    });

    showNotification('Team registered! Awaiting admin approval.', 'success');
  } catch (error) {
    console.error('Error registering team:', error);
    showNotification('Registration failed: ' + error.message, 'error');
  }
};

// Team registration form handler (team-registration.html)
if (document.getElementById('teamForm')) {
  document.getElementById('teamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const teamName = document.getElementById('teamTeamName').value;
    const captainName = document.getElementById('captainName').value;
    const captainEmail = document.getElementById('captainEmail').value;
    const captainPhone = document.getElementById('captainPhone').value;
    const teamSize = document.getElementById('teamSize').value;
    const teamDescription = document.getElementById('teamDescription').value;
    
    // Get tournament from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tournamentName = urlParams.get('name');
    if (!tournamentName) {
      showNotification('No tournament selected', 'error');
      return;
    }

    const user = JSON.parse(localStorage.getItem('elaUser'));
    if (!user) {
      showNotification('Please login first', 'error');
      window.location.href = 'login.html';
      return;
    }

    try {
      // Create team first
      const teamId = await createTeam(teamName, teamDescription);
      if (!teamId) return;

      // TODO: Query tournament ID by name (Phase 3)
      // For now, save to localStorage + notify admin
      const teamData = {
        team: teamName,
        captain: captainName,
        email: captainEmail,
        phone: captainPhone,
        tournament: tournamentName,
        size: teamSize,
        description: teamDescription,
        registeredAt: new Date().toISOString(),
        teamId: teamId
      };

      // Save to local fallback
      let teams = JSON.parse(localStorage.getItem('teams') || '[]');
      teams.push(teamData);
      localStorage.setItem('teams', JSON.stringify(teams));

      showNotification(`Team "${teamName}" registered for "${tournamentName}"! Awaiting admin approval.`, 'success');
      
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 2000);
    } catch (error) {
      console.error('Team registration error:', error);
      showNotification('Registration failed', 'error');
    }
  });

  // Pre-fill form with user data
  const user = JSON.parse(localStorage.getItem('elaUser'));
  if (user) {
    document.getElementById('captainName').value = user.name || '';
    document.getElementById('captainEmail').value = user.email || '';
    document.getElementById('teamSize').value = 5;
  }

  // Load tournament name from URL
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentName = urlParams.get('name');
  if (tournamentName) {
    document.getElementById('tournamentName').value = decodeURIComponent(tournamentName);
  }
}

// ============================================
// ADMIN PAGE PROTECTION
// ============================================
// Run admin check when page loads
document.addEventListener('DOMContentLoaded', function() {
  checkAdminAccess();
  
  // Login form handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      if (!auth || !db) {
        showNotification('Authentication service not available', 'error');
        return;
      }
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('User credential:', user.uid, user.email);
        
        // Offline fallback user data
        let userData = {
          uid: user.uid,
          name: 'Player',
          email: user.email,
          phone: '',
          ign: '',
          role: 'Player',
          device: 'Mobile',
          experience: 'Beginner',
          team: 'Solo',
          verified: false
        };
        
        // Firestore sync if available
        if (db) {
          const q = query(collection(db, "players"), where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              userData = { id: doc.id, ...doc.data() };
            });
            console.log('✅ Firestore user sync OK');
          } else {
            console.log('📝 No Firestore player doc - created offline');
          }
        } else {
          console.log('❌ No db - full offline');
        }
        
        localStorage.setItem('elaUser', JSON.stringify(userData));
        console.log('✅ elaUser saved:', userData.uid);
        
        updateNavbar();
        // IMMEDIATE localStorage set + 2s delay for stability
        console.log('✅ User data saved:', userData.uid);
        showNotification('Login successful!', 'success');
        
        // Wait 2s for Firebase auth state + localStorage sync
        setTimeout(() => {
          console.log('🔄 Redirect profile.html - elaUser:', localStorage.getItem('elaUser') ? 'SET' : 'MISSING');
          window.location.assign('profile.html');
        }, 2000);
        
      } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password.';
        }
        showNotification(errorMessage, 'error');
      }
    });
  }
  
  // Registration form handler
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!auth || !db) {
        showNotification('Authentication service not available', 'error');
        return;
      }
      
      const name = document.getElementById('registerName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const phone = document.getElementById('registerPhone').value;
      const dob = document.getElementById('registerDob').value;
      const country = document.getElementById('registerCountry').value;
      const city = document.getElementById('registerCity').value;
      const ign = document.getElementById('registerIGN').value;
      const uid = document.getElementById('registerUID').value;
      const role = document.getElementById('registerRole').value;
      const device = document.getElementById('registerDevice').value;
      const experience = document.getElementById('registerExperience').value;
      const team = document.getElementById('registerTeam').value;
      
      try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user data in Firestore
        const userData = {
          name: name,
          email: email,
          phone: phone,
          dob: dob,
          country: country,
          city: city,
          ign: ign,
          uid: uid,
          role: role || 'Player',
          device: device || 'Mobile',
          experience: experience || 'Beginner',
          team: team || 'Solo',
          verified: false,
          rank: 'Bronze',
          achievements: [],
          avatar: 'character_1.png',
          registeredAt: new Date().toISOString(),
          loginMethod: 'email'
        };
        
        // Add to Firestore
        await addDoc(collection(db, "players"), userData);
        
        // Save to localStorage for session
        localStorage.setItem('elaUser', JSON.stringify(userData));
        
        updateNavbar();
        showNotification('Registration successful! Redirecting to profile...', 'success');
        
        setTimeout(() => {
          window.location.assign('profile.html');
        }, 1500);
        
      } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password should be at least 6 characters.';
        }
        showNotification(errorMessage, 'error');
      }
    });
  }
  
  // 🔍 DEBUG: Admin login form handler  
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value.trim();
      
      console.log('🔍 ADMIN LOGIN START:', email, 'auth:', !!auth, 'db:', !!db);
      
      if (!auth) {
        console.log('❌ No auth');
        showNotification('Authentication service not available', 'error');
        return;
      }
      
      try {
        console.log('🔍 Signing in...');
        showNotification('Logging in...', 'info');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Auth success - user:', user.uid, user.email);
        
        // SECURE ADMIN CHECK: Use unified isAdmin()
        console.log('🔍 Calling isAdmin()...');
        const isAuthorizedAdmin = await window.isAdmin();
        console.log('🔍 isAdmin result:', isAuthorizedAdmin);
        
        if (isAuthorizedAdmin) {
          // Set admin session only for verified admins
          localStorage.setItem('adminSession', JSON.stringify({ 
            isAdmin: true, 
            email: user.email,
            uid: user.uid 
          }));
          console.log('✅ Admin session set');
          
          showNotification('Admin login successful! Redirecting...', 'success');
          setTimeout(() => {
            console.log('🔄 Redirecting to admin.html');
            window.location.href = 'admin.html';
          }, 1000);
        } else {
          console.log('❌ Not authorized admin');
          // Logout unauthorized user
          await signOut(auth);
          showNotification('Access denied - contact administrator for authorization.', 'error');
        }
      } catch (error) {
        console.error('💥 Admin login ERROR:', error.code, error.message);
        let errorMessage = 'Login failed. Please check your credentials.';
        if (error.code === 'auth/user-not-found') {
          errorMessage = 'Admin account not found. Please create it in Firebase Console first.';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address.';
        }
        showNotification(errorMessage, 'error');
      }
    });
  }
  
  // Google sign-in button handler
  const googleBtn = document.querySelector('.google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }
  
  // Logout button handlers
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
  
  const logoutBtnNav = document.getElementById('logoutBtnNav');
  if (logoutBtnNav) {
    logoutBtnNav.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
  
  // Initialize navbar
  updateNavbar();
  
  // Initialize admin tabs if on admin page
  if (document.querySelector('.admin-tab-btn')) {
    initAdminTabs();
  }
  
  // Auto-load tournaments on pages with grids
  const grids = document.querySelectorAll('#upcoming-events-list, #ongoing-events-list, #past-events-list');
  if (grids.length > 0) {
    window.loadTournaments('upcoming');  // Default load upcoming on both pages
  }
  
  if (document.getElementById('playersList')) {
    loadAdminPlayers();
    loadAdminStats();
  }
  
  if (document.getElementById('teamsList')) {
    loadAdminTeams();
  }
  
  if (document.getElementById('tournamentsList')) {
    loadAdminTournaments();
  }
  
  if (document.getElementById('playersGrid')) {
    loadVerifiedPlayers();
  }
  
  if (document.querySelector('.professional-profile')) {
    window.loadUserProfile = loadUserProfile;
    window.loadUserProfile();
  }
  
  if (document.querySelector('.tab-btn')) {
    initializeProfileEditing();
  }
  
  // Profile edit buttons - direct function calls (functions defined earlier)
  const editPersonalBtn = document.getElementById('editPersonalBtn');
  const editGamingBtn = document.getElementById('editGamingBtn');
  if (editPersonalBtn) editPersonalBtn.addEventListener('click', editPersonalInfo);
  if (editGamingBtn) editGamingBtn.addEventListener('click', editGamingInfo);
});
