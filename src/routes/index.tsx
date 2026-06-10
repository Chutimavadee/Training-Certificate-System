import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts Import
import { PublicLayout } from '../layouts/PublicLayout';
import { TeacherLayout } from '../layouts/TeacherLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Guard components list
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleBasedRoute } from '../components/RoleBasedRoute';

// Lazy Loaded Pages to enforce Code Splitting & Performance Optimization
const LandingPage = lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage })));
const TeacherDashboard = lazy(() => import('../pages/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const StudentDashboard = lazy(() => import('../pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CoursesPage = lazy(() => import('../pages/CoursesPage').then(m => ({ default: m.CoursesPage })));
const AttendancePage = lazy(() => import('../pages/AttendancePage').then(m => ({ default: m.AttendancePage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const CertificatePage = lazy(() => import('../pages/CertificatePage').then(m => ({ default: m.CertificatePage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const CertificateVerificationPage = lazy(() => import('../pages/CertificateVerificationPage').then(m => ({ default: m.CertificateVerificationPage })));
const DeploymentSettingsPage = lazy(() => import('../pages/DeploymentSettingsPage').then(m => ({ default: m.DeploymentSettingsPage })));

// Lightweight loader skeleton during chunk load transitions
const ChunkLoader: React.FC = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 font-mono text-xs text-slate-400 gap-2">
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
    <span>Streaming secure modules...</span>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<ChunkLoader />}>
      <Routes>
        {/* 1. PUBLIC ROUTES */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/verify/:certificateId" element={<CertificateVerificationPage />} />
          <Route path="/404" element={<NotFoundPage />} />
        </Route>

        {/* 2. PROTECTED TEACHER & TRAINER ROUTES */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="certificates" element={<CertificatePage />} />
          <Route path="settings" element={<DeploymentSettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 3. PROTECTED STUDENT & TRAINEE ROUTES */}
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['student', 'admin']}>
                <StudentLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="enrollments" element={<CoursesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="certificates" element={<CertificatePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 4. PROTECTED ADMINISTRATIVE ROUTES */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 5. NOT FOUND CATCH-ALLS */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
