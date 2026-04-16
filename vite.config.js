import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        players: 'players.html',
        profile: 'profile.html'
      }
    }
  }
})
