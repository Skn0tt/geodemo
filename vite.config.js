import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true // Listen on all network interfaces (for mobile testing)
  }
});
