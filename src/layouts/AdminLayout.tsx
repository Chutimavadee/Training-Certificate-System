import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  LayoutDashboard, 
  User, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Admin Console', path: '/admin', icon: LayoutDashboard },
    { name: 'My Profile', path: '/admin/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" id="admin-layout">
      {/* 1. OFF-CANVAS MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" id="mobile-drawer-wrapper-admin">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-slate-200 p-6 shadow-xl animate-fade-in-left">
            <div className="flex items-center justify-between mb-8" id="drawer-header-admin">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-600 text-white rounded shadow-xs">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="font-bold text-slate-900 tracking-tight text-sm">Admin Office</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-4.5" />
              </button>
            </div>

            {/* Profile Brief */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 text-white rounded font-bold flex items-center justify-center">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate leading-tight">{profile?.name || 'Admin User'}</p>
                <span className="text-[10px] text-red-600 font-semibold uppercase flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3 inline" /> System Control Role
                </span>
              </div>
            </div>

            <nav className="flex-1 flex flex-col gap-1.5" id="mobile-drawer-nav-admin">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-bold' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }
                    `}
                  >
                    <IconComponent className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border-t border-slate-100 pt-4"
            >
              <LogOut className="h-5 w-5" />
              Sign Out Session
            </button>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200" id="admin-desktop-sidebar">
        {/* Brand Banner */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <span className="p-2 bg-blue-600 text-white rounded shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="leading-none">
            <span className="font-extrabold text-slate-900 tracking-tight text-sm block">EduCert <span className="text-blue-600 font-bold">Portal</span></span>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">System Admin</span>
          </div>
        </div>

        {/* Profile Card Summary */}
        <div className="p-4 mx-4 mt-6 mb-4 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 text-white rounded shadow-sm font-bold flex items-center justify-center shrink-0">
            A
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate leading-snug">{profile?.name || 'Administrator'}</p>
            <span className="text-[9px] font-bold text-red-600 uppercase flex items-center gap-0.5">
              <ShieldCheck className="h-2.5 w-2.5 animate-pulse" /> Full Sysadmin Access
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-4 flex flex-col gap-1.5" id="desktop-sidebar-nav-container-admin">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-1">Administrative Office</p>
          <nav className="flex flex-col gap-1" id="desktop-sidebar-nav-admin">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent className={`h-4.5 w-4.5 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                      {item.name}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            id="desktop-logout-admin-btn"
          >
            <LogOut className="h-4 w-4" />
            Exit Admin Center
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKPLACE SECTION */}
      <div className="flex-1 flex flex-col min-w-0" id="admin-main-wrap">
        {/* Top Floating App Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30" id="admin-topbar">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Open navigation drawers"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[11px]" id="topbar-timezone-admin">
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Firebase Spark Ready
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Admin Access Level
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden md:inline">Root Level Session</span>
            <div className="w-8 h-8 rounded bg-red-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              AD
            </div>
          </div>
        </header>

        {/* Content canvas viewport */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
