import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/engine-rest': {
                target: 'http://operaton-engine:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/engine-rest/, '/engine-rest')
            },
            '/api': {
                target: 'http://backend-python:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api')
            }
        }
    }
})
