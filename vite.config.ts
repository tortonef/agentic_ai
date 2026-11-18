import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves project sites under /<repo>/. Set BASE_PATH in CI (the workflow does this);
// use "/" for a user site (<user>.github.io) or a custom domain.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
