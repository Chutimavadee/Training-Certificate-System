import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Award, QrCode, FileText, CheckCircle, Users } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, loginWithGoogle, role } = useAuth();

  const features = [
    {
      title: 'Course Management',
      desc: 'Create, organize, and administer rich training courses with customized outlines.',
      icon: GraduationCap,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Dynamic QR Attendance',
      desc: 'Scan secure and time-sensitive QR check-ins during live sessions prevents spoofing.',
      icon: QrCode,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Verified Certificates',
      desc: 'Automatically generate cryptographically secure PDF certificates with validation QR keys.',
      icon: Award,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-16 py-8" id="landing-container">
      {/* Hero Visual Section */}
      <section className="text-center max-w-3xl flex flex-col gap-6" id="hero-banner">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full w-fit mx-auto border border-blue-100">
          <CheckCircle className="h-3 w-3" /> Fully Scalable University Foundation
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-850 tracking-tight leading-tight">
          Training Management & <br />
          <span className="text-blue-600">Certification System</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto font-light">
          A production-ready training portal equipped with real-time QR-based attendance tracking, 
          course enrollment pipelines, and cryptographically verified PDF certificate generators.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          {user ? (
            <Link
              to={role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/profile'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-all text-sm"
              id="dashboard-cta"
            >
              Enter Dashboard Portal
            </Link>
          ) : (
            <>
              <button
                onClick={() => loginWithGoogle()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-all text-sm cursor-pointer"
                id="login-google-cta"
              >
                Sign In with Google
              </button>
              <Link
                to="/login"
                className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg transition-all text-sm"
              >
                Learn More
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-3 gap-8 w-full max-w-5xl" id="features-grid">
        {features.map((feature, idx) => {
          const IconComp = feature.icon;
          return (
            <div 
              key={idx} 
              className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-4"
              id={`feature-${idx}`}
            >
              <span className={`p-3 rounded-lg w-fit ${feature.color}`}>
                <IconComp className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-light">{feature.desc}</p>
            </div>
          );
        })}
      </section>

      {/* Stats Board Section */}
      <section className="w-full max-w-5xl bg-white border border-slate-200/70 shadow-sm rounded-xl p-8 flex flex-wrap items-center justify-around gap-8 text-center bg-slate-50/20" id="stats-board">
        <div id="stat-courses">
          <p className="text-3xl font-extrabold text-blue-600">50+</p>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Courses</span>
        </div>
        <div id="stat-students">
          <p className="text-3xl font-extrabold text-slate-850">1,200+</p>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Trainees Certified</span>
        </div>
        <div id="stat-scans">
          <p className="text-3xl font-extrabold text-emerald-600">10k+</p>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Scanned Check-ins</span>
        </div>
      </section>
    </div>
  );
};
export default LandingPage;
