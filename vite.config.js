import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deterministic dev port: backend CORS only allows http://localhost:5173 and
// http://127.0.0.1:5173. strictPort=true makes Vite FAIL LOUDLY instead of
// silently drifting to 5174/5175 (which would break every API call with a
// CORS error surfacing as "Failed to fetch" in the browser).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
