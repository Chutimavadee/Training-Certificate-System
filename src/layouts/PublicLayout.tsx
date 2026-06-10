import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, LogIn, LayoutDashboard, User } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="public-layout">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/60" id="public-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-blue-800 focus:outline-none" id="brand-logo">
            <span className="p-2 bg-blue-600 text-white rounded shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight block leading-tight">
                EduCert <span className="text-blue-600">Portal</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Foundation Architect v1.0.0</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2" id="public-layout-status-badges">
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full border border-emerald-200 font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Firebase Spark Ready
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200 font-bold">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> React + Vite + TS
            </span>
          </div>

          <nav className="flex items-center gap-4" id="public-navbar">
            {user ? (
              <>
                <Link
                  to={role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/profile'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">My Dashboard</span>
                </Link>
                <button
                  onClick={() => logout().then(() => navigate('/'))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Page Viewport Wrapper */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="public-viewport">
        <Outlet />
      </main>

      {/* Footer Block */}
      <footer className="bg-white border-t border-slate-200 py-6" id="public-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
          <p>© 2026 Training Management & Certification System. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer text-slate-300">UT-System Foundation v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default PublicLayout;
