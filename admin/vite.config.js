import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://pharmary-mall-api-239896-5-1309632689.sh.run.tcloudbase.com',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://pharmary-mall-api-239896-5-1309632689.sh.run.tcloudbase.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
