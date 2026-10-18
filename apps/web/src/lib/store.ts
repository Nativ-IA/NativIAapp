import { create } from 'zustand';
import { setToken } from './api';

export interface StudentSession {
  studentProfileId: string;
  firstName: string;
  avatarKey: string;
  grade: number;
}

interface AppState {
  student: StudentSession | null;
  joinCode: string | null;
  online: boolean;
  a11y: { textScale: number; dyslexiaFont: boolean };
  setStudent: (s: StudentSession | null, token?: string) => void;
  setJoinCode: (c: string | null) => void;
  setOnline: (v: boolean) => void;
  setA11y: (a: Partial<AppState['a11y']>) => void;
  logout: () => void;
}

/**
 * Limpieza de sesiones del nombre anterior del proyecto.
 *
 * La aplicación se llamó «Colibrí» antes de ser NativIA. El renombre cambió el
 * prefijo de las claves de `localStorage` pero no borró las viejas, así que en
 * cualquier equipo donde se haya abierto una versión anterior siguen ahí las
 * tres —incluido `colibri.token`, un token de sesión que NINGÚN «salir» puede
 * borrar, porque ya no queda código que mire ese prefijo.
 *
 * Se enumeran las tres claves exactas en lugar de barrer el prefijo entero:
 * `localStorage` es por origen, y en una máquina de desarrollo `localhost:5173`
 * lo comparten otros proyectos a los que no les toca nada.
 */
for (const legacy of ['colibri.token', 'colibri.student', 'colibri.joinCode']) {
  localStorage.removeItem(legacy);
}

const saved = localStorage.getItem('nativia.student');

export const useApp = create<AppState>((set) => ({
  student: saved ? JSON.parse(saved) : null,
  joinCode: localStorage.getItem('nativia.joinCode'),
  online: navigator.onLine,
  a11y: { textScale: 1, dyslexiaFont: false },

  setStudent: (s, token) => {
    if (token) setToken(token);
    if (s) localStorage.setItem('nativia.student', JSON.stringify(s));
    else localStorage.removeItem('nativia.student');
    set({ student: s });
  },

  setJoinCode: (c) => {
    if (c) localStorage.setItem('nativia.joinCode', c);
    else localStorage.removeItem('nativia.joinCode');
    set({ joinCode: c });
  },

  setOnline: (online) => set({ online }),

  setA11y: (a) =>
    set((st) => {
      const next = { ...st.a11y, ...a };
      document.documentElement.style.setProperty('--text-scale', String(next.textScale));
      document.documentElement.classList.toggle('dyslexia', next.dyslexiaFont);
      return { a11y: next };
    }),

  /**
   * Cierra la sesión del estudiante y deja el equipo como recién abierto.
   *
   * Se borra TAMBIÉN el código de curso. Salir devuelve a la portada, donde se
   * elige entre estudiante y profe, así que dejar el código guardado sería
   * guardar un dato de una sesión que ya terminó — y la pantalla de entrada lo
   * vuelve a pedir de todos modos.
   *
   * Los ajustes de accesibilidad se reinician por la misma razón: son de quien
   * acaba de salir. Si el siguiente niño encuentra el texto al 125 % porque el
   * anterior lo amplió, no sabe por qué ni cómo deshacerlo.
   */
  logout: () => {
    setToken(null);
    localStorage.removeItem('nativia.student');
    localStorage.removeItem('nativia.joinCode');
    document.documentElement.style.setProperty('--text-scale', '1');
    document.documentElement.classList.remove('dyslexia');
    set({ student: null, joinCode: null, a11y: { textScale: 1, dyslexiaFont: false } });
  },
}));

window.addEventListener('online', () => useApp.getState().setOnline(true));
window.addEventListener('offline', () => useApp.getState().setOnline(false));
