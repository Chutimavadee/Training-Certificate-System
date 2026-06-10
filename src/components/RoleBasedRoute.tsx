import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is loaded but doesn't exist in allowed roles list:
  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Restricted Access</h2>
          <p className="text-sm text-slate-500 mb-6">
            The screen you are trying to view requires {allowedRoles.map(r => `"${r}"`).join(' or ')} permissions. 
            Your current assigned system role is <strong className="text-slate-700 capitalize">"{role || 'Unregistered'}"</strong>.
          </p>
          <div className="flex flex-col gap-3">
            <a 
              href={role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/'} 
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-all text-sm shadow-sm"
            >
              Return to Profile Landing
            </a>
            <button 
              onClick={() => {
                // Return to login or log out
                window.location.href = '/login';
              }}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium rounded-lg transition-all text-sm"
            >
              Log in with Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
