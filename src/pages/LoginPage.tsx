import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, LogIn, Sparkles, User, ShieldCheck, ShieldAlert, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { user, loginWithGoogle, setRoleOverride, logout, errorMessage, clearError, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  // Automatically clear error states when page mounts
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError(null);
    clearError();
    try {
      await loginWithGoogle();
      // On success, redirect to correct layout or original path
      navigate(from, { replace: true });
    } catch (e: any) {
      console.error("Sign-in page catch error:", e);
      setLocalError(e?.message || "Failed to complete security handshake with Google.");
    } finally {
      setLoading(false);
    }
  };

  // Developer Simulator
  const simulateRole = (simulatedRole: 'teacher' | 'student' | 'admin') => {
    clearError();
    setLocalError(null);
    setRoleOverride(simulatedRole);
    navigate(simulatedRole === 'teacher' ? '/teacher' : simulatedRole === 'student' ? '/student' : '/admin');
  };

  const displayError = localError || errorMessage;

  return (
    <div className="max-w-md w-full mx-auto flex flex-col gap-6" id="login-container">
      <Card className="shadow-lg border-t-4 border-t-blue-600" id="login-card">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">EduCert Portal</CardTitle>
          <CardDescription>Training Management & Certification System</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4" id="login-body">
          {user ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 text-xs border border-emerald-100 flex items-start gap-2.5 text-left">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Session Active</p>
                  <p className="font-light mt-0.5">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="primary" onClick={() => {
                  if (role === 'admin') navigate('/admin');
                  else if (role === 'teacher') navigate('/teacher');
                  else if (role === 'student') navigate('/student');
                  else navigate('/');
                }}>
                  Enter App Dashboard ({role || 'Guest'})
                </Button>
                <button
                  onClick={() => logout()}
                  className="text-xs text-red-600 hover:underline font-bold py-1.5 cursor-pointer"
                >
                  Sign Out Account
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Alert Error Box */}
              {displayError && (
                <div 
                  className="p-3.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-150 flex gap-2.5 leading-normal animate-shake"
                  id="login-error-alert"
                >
                  <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Authorization Lockout</span>
                    <span className="text-[11px] font-medium block mt-0.5">{displayError}</span>
                  </div>
                </div>
              )}

              <div className="text-center flex flex-col gap-1.5 mb-2 mt-1">
                <h4 className="text-sm font-semibold text-slate-700 leading-tight">Verify Your Credentials</h4>
                <p className="text-xs text-slate-400 font-light leading-snug">
                  Use your official university database or institutional Google ID to access your workspace.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={handleGoogleLogin}
                isLoading={loading}
                className="w-full flex items-center justify-center gap-2 py-3 cursor-pointer text-sm font-bold shadow-xs hover:shadow-xs"
                id="sign-in-btn"
              >
                <LogIn className="h-4 w-4" />
                Sign In with Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Role Playgrounds Simulation Panel */}
      <div className="bg-slate-100/80 rounded-xl border border-slate-200 p-6 flex flex-col gap-3" id="simulation-panel">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-none">Developer Simulator</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal font-light">
          Because security policies restrict email addresses dynamically, you can use these bypass controls to simulate active system navigation:
        </p>
        <div className="grid grid-cols-3 gap-2" id="sim-triggers">
          <button
            onClick={() => simulateRole('teacher')}
            className="px-2 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-blue-700 shadow-xs flex flex-col items-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            Teacher
          </button>
          <button
            onClick={() => simulateRole('student')}
            className="px-2 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700 shadow-xs flex flex-col items-center gap-1 cursor-pointer"
          >
            <User className="h-4 w-4" />
            Student
          </button>
          <button
            onClick={() => simulateRole('admin')}
            className="px-2 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-755 shadow-xs flex flex-col items-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-red-500" />
            Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
