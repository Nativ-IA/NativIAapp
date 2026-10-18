import React from 'react';
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
import { StudentShell } from './components/AppShell';
import { EmptyState } from './components/ui';

function Logros() {
  return (
    <StudentShell back="/mapa" title="Mis logros">
      <EmptyState
        icon="award"
        title="Tus logros aparecerán aquí"
        hint="Se ganan por cómo piensas, no por cuántos ejercicios haces."
      />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
