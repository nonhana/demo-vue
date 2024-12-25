import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/js/index.js',
  output: {
    dir: 'dist/js',
    format: 'iife',
  },
})
