import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',  // Raiz do projeto
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
    hmr: process.env.DISABLE_HMR !== 'true'
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'index.html'  // Especifica o entry point
      }
    }
  }
})
