// Ingreso al panel de administración del equipo NativIA.
// Usa el mismo ingreso de adultos que el docente; solo entra quien tiene rol
// de plataforma (admin sin colegio).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, setToken } from '../../lib/api';
import { Button } from '../../components/ui';
import { Mark } from '../../components/Logo';

interface Session {
  accessToken: string;
  user: { firstName: string; lastName: string; role: string };
}

export function AdminLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@nativia.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<Session>('/auth/teacher', { email, password });
      if (res.user.role !== 'admin') {
        setError('Esta cuenta no es del equipo de plataforma. Los docentes entran por /profe.');
        return;
      }
      setToken(res.accessToken);
      localStorage.setItem('nativia.admin', JSON.stringify(res.user));
      nav('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'No pudimos entrar.');
    } finally {
      setLoading(false);
    }
  }

  const field =
    'mt-1.5 min-h-touch w-full rounded-md border-2 border-line px-4 text-body transition-colors focus:border-brand';

  return (
    <div className="flex min-h-screen flex-col bg-surf">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Mark className="h-14 w-14 text-brand" />
            <p className="mt-3 text-h1 font-extrabold tracking-tight text-ink">
              Nativ<span className="text-brand">IA</span>
            </p>
            <p className="mt-1 text-small text-ink-2">Panel del equipo de plataforma</p>
          </div>

          <form onSubmit={submit} className="mt-8 rounded-lg border border-line bg-white px-6 py-7">
            <h1 className="text-body-lg font-bold">Administración</h1>

            <div className="mt-5">
              <label htmlFor="admin-email" className="block text-small font-semibold">
                Correo
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="admin-password" className="block text-small font-semibold">
                Contraseña
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </div>

            {error && (
              <p role="alert" className="mt-4 text-small text-alert">
                {error}
              </p>
            )}

            <div className="mt-6">
              <Button full type="submit" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
