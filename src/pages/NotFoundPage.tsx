import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center" id="not-found-view">
      <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mb-6">
        <HelpCircle className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 font-light max-w-sm mb-8 leading-relaxed">
        The workspace path you seek is unregistered or outside the current training curriculum limits.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-all"
        id="return-home-cta"
      >
        <ArrowLeft className="h-4.5 w-4.5" /> Back to Public Home
      </Link>
    </div>
  );
};
export default NotFoundPage;
