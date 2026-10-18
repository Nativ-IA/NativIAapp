import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      // El proyecto vive dentro de OneDrive. Mientras OneDrive sincroniza un
      // archivo lo mantiene bloqueado, y el watcher de Vite muere con
      // `EBUSY: resource busy or locked` — se lleva el servidor entero, no solo
      // el recargado. Pasó al añadir las fuentes.
      //
      // Los binarios de /public no cambian durante el desarrollo, así que no
      // hay nada que vigilar en ellos y sí mucho que perder.
      ignored: ['**/public/fonts/**'],
    },
  },
});
