import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Ausgabeordner für das gebündelte Addon
    outDir: 'dist',

    // Deaktiviert das Leeren des Ausgabeordners, damit Vite und web-ext gut zusammenspielen
    emptyOutDir: false,

    rollupOptions: {
      input: {
        // Hintergrund-Skript
        background: resolve(__dirname, 'src/scripts/background.js'),
        // Content-Skript
        content: resolve(__dirname, 'src/scripts/content.js'),
      },
      output: {
        // Sorgt dafür, dass die gebündelten Dateien direkt im dist/scripts/ liegen
        entryFileNames: `scripts/[name].js`,
        chunkFileNames: `scripts/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      }
    }
  },
});
