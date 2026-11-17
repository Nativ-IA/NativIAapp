import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { JoinPage } from './pages/JoinPage';
import { AvatarPage } from './pages/AvatarPage';
import { MapPage } from './pages/MapPage';
import { AxisPage } from './pages/AxisPage';
import { ActivityPage } from './pages/ActivityPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { TeacherLoginPage, TeacherDashboardPage } from './pages/TeacherPages';
import { TeacherGroupPage } from './pages/TeacherGroupPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminSchoolsPage } from './pages/admin/AdminSchoolsPage';
import { AdminSchoolPage } from './pages/admin/AdminSchoolPage';
import { AdminUsagePage } from './pages/admin/AdminUsagePage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { StudentShell } from './components/AppShell';
import { EmptyState } from './components/ui';

// La página del QR trae su propio generador de códigos: se descarga solo
// cuando alguien la abre, no con la portada que ve cada estudiante.
const QrPage = lazy(() => import('./pages/QrPage').then((m) => ({ default: m.QrPage })));

function Logros() {
  return (
    <StudentShell back="/mapa" title="Mis logros">
      <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        <EmptyState
          icon="award"
          title="Tus logros aparecerán aquí"
          hint="Se ganan por cómo piensas, no por cuántos ejercicios haces."
        />
      </div>
    </StudentShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Estudiante */}
        <Route path="/" element={<JoinPage />} />
        <Route path="/quien-eres" element={<AvatarPage />} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/eje/:axisCode" element={<AxisPage />} />
        <Route path="/actividad/:activityId" element={<ActivityPage />} />
        <Route path="/logros" element={<Logros />} />
        <Route path="/transparencia" element={<TransparencyPage />} />

        {/* Docente */}
        <Route path="/profe" element={<TeacherLoginPage />} />
        <Route path="/profe/panel" element={<TeacherDashboardPage />} />
        <Route path="/profe/grupo" element={<TeacherGroupPage />} />
        <Route path="/profe/estudiante/:studentProfileId" element={<StudentDetailPage />} />

        {/* Equipo de plataforma */}
        <Route path="/admin/entrar" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminSchoolsPage />} />
        <Route path="/admin/colegios/:schoolId" element={<AdminSchoolPage />} />
        <Route path="/admin/consumo" element={<AdminUsagePage />} />
        <Route path="/admin/auditoria" element={<AdminAuditPage />} />

        {/* Código QR para abrir la app desde otro dispositivo */}
        <Route
          path="/qr"
          element={
            <Suspense fallback={null}>
              <QrPage />
            </Suspense>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
