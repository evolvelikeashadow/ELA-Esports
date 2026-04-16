// 🔥 COMPLETE DEMO DATA - Creates verified players/teams/orgs
// Run F12 → Console → paste → Enter → Refresh players.html + admin.html

(async () => {
  // Admin setup (for admin.html access)
  await fetch('https://ela-esports-default-rtdb.firebaseio.com/admins.json', {
    method: 'PUT',
    body: JSON.stringify({
      'demo-admin': {
        uid: 'demo-admin-uid',
        email: 'admin@elaesports.in',
        role: 'super-admin'
      }
    })
  });

  // Verified players for players.html
  const verifiedPlayers = [
    {
      name: 'Pro Gamer Alpha',
      email: 'alpha@esports.in',
      ign: 'AlphaProFF',
      uid: '111111111',
      role: 'Rusher',
      device: 'Mobile',
      experience: 'Professional',
      team: 'Alpha Squad',
      verified: true,
      rank: 'Diamond'
    },
    {
      name: 'Sniper Queen Beta',
      email: 'beta@esports.in',
      ign: 'BetaSniperX',
      uid: '222222222',
      role: 'Sniper',
      device: 'Emulator',
      experience: 'Advanced',
      team: 'Beta Elite',
      verified: true,
      rank: 'Platinum'
    },
    {
      name: 'Support King Gamma',
      email: 'gamma@esports.in',
      ign: 'GammaSupport',
      uid: '333333333',
      role: 'Support',
      device: 'Mobile',
      experience: 'Intermediate',
      team: 'Gamma Force',
      verified: true,
      rank: 'Gold'
    }
  ];

  // Demo teams/orgs for admin.html
  const demoTeams = [
    {
      team: 'Demo Team Alpha',
      captain: 'Alpha Pro',
      email: 'alpha@esports.in',
      tournament: 'National Championship 2024',
      size: 5,
      status: 'verified'
    },
    {
      team: 'Demo Team Beta',
      captain: 'Beta Queen',
      email: 'beta@esports.in',
      tournament: 'Regional Qualifiers',
      size: 4,
      status: 'pending'
    }
  ];

  // LocalStorage demo data
  localStorage.setItem('elaUsers', JSON.stringify([...JSON.parse(localStorage.getItem('elaUsers') || '[]'), ...verifiedPlayers]));
  localStorage.setItem('teams', JSON.stringify([...JSON.parse(localStorage.getItem('teams') || '[]'), ...demoTeams]));
  localStorage.setItem('tournaments', JSON.stringify([
    {
      id: 'demo1',
      name: 'National Championship',
      date: new Date(Date.now() + 86400000).toISOString(),
      prizePool: '₹1,00,000',
      maxTeams: 128,
      status: 'upcoming'
    }
  ]));

  console.log('✅ Demo data created!');
  console.log('🔄 Refresh players.html & admin.html');
  console.log('👤 Demo users:', verifiedPlayers.length);
  console.log('🏆 Demo teams:', demoTeams.length);
})();

