import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 3000 keeps CLIENT_URL=http://localhost:3000 in server/.env working.
// strictPort: if 3000 is busy, Vite stops with a clear message instead of silently using another port
// (a different port would be blocked by the server's CORS setting).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: true,
  },
});
