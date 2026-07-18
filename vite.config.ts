import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for smaller builds
    minify: 'esbuild',
    esbuildOptions: {
      drop: ['console', 'debugger'], // Remove console.log and debugger statements
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'state-vendor': ['zustand', 'zustand-persist'],
          // Note: Firebase modules are NOT chunked - they have special handling
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // CSS optimization
    cssMinify: true,
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets < 4KB
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'zustand',
    ],
    exclude: ['firebase'],
  },
})
