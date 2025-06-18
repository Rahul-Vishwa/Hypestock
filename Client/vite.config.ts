import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    allowedHosts: ['dev.hypestock.local', 'api.hypestock.local', '37ab-2402-e280-2318-21-38c7-1d41-2a9c-fd62.ngrok-free.app']
  }
})
