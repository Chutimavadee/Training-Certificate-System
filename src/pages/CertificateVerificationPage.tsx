import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { ShieldCheck, ShieldAlert, Award, Calendar, Bookmark, Clock, User, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

export const CertificateVerificationPage: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCertificate() {
      if (!certificateId) {
        setError('No certificate identifier provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const ref = doc(db, 'certificates', certificateId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setCert(snap.data());
        } else {
          setError('The requested certificate credential could not be found or has not been issued yet.');
        }
      } catch (err: any) {
        console.error('Error verifying certificate:', err);
        setError('An error occurred during secure credential verification.');
      } finally {
        setLoading(false);
      }
    }
    fetchCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Running Secure Credential Audits...</p>
      </div>
    );
  }

  // Formatting dates beautifully
  const formatValue = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return new Date(dateVal).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors self-start">
          <ChevronLeft className="h-4 w-4" /> Go to Learning Center
        </Link>

        {error || !cert ? (
          <Card className="border-red-200 bg-red-50/10">
            <CardContent className="pt-6 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Verification Failure</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  {error || 'This certificate has either been purged or is synthetically simulated. Please contact Bangkok University Registrar Office.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200/60 shadow-lg relative overflow-hidden bg-white">
            {/* Top Verification Header Ribbon */}
            <div className={`p-4 text-center flex items-center justify-center gap-2 text-white font-bold text-sm tracking-wide ${
              cert.status === 'valid' ? 'bg-emerald-600' : cert.status === 'revoked' ? 'bg-rose-600' : 'bg-slate-500'
            }`}>
              {cert.status === 'valid' ? (
                <>
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <span>SECURE CREDENTIAL VERIFIED</span>
                </>
              ) : cert.status === 'revoked' ? (
                <>
                  <ShieldAlert className="h-5 w-5 shrink-0 animate-bounce" />
                  <span>CREDENTIAL HAS BEEN REVOKED</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>CREDENTIAL EXPIRED</span>
                </>
              )}
            </div>

            <CardContent className="pt-8 px-6 sm:px-8">
              {/* Authenticity Header */}
              <div className="flex flex-col items-center text-center gap-2 border-b border-slate-100 pb-6 mb-6">
                <div className={`p-3 rounded-full ${cert.status === 'valid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} mb-2`}>
                  <Award className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Bangkok University Academia</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {cert.certificateNumber || cert.certificateId}</p>
              </div>

              {/* Verified details */}
              <div className="flex flex-col gap-5">
                {/* Participant Name */}
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Conferred To</span>
                    <strong className="text-base text-slate-800 block font-serif underline decoration-indigo-200 underline-offset-2 capitalize">
                      {cert.studentName || 'Premium Scholar'}
                    </strong>
                  </div>
                </div>

                {/* Course details */}
                <div className="flex items-start gap-3">
                  <Bookmark className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Course Title</span>
                    <strong className="text-sm font-semibold text-slate-800 block">
                      {cert.courseTitle || 'Advanced Curricular Training'}
                    </strong>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Training Duration</span>
                    <span className="text-sm font-medium text-slate-700 block">
                      {cert.trainingHours || '30'} Academic Hours ({cert.trainingType || 'onsite'} study)
                    </span>
                  </div>
                </div>

                {/* Date Conferred */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Conferred On</span>
                    <span className="text-sm font-medium text-slate-700 block">
                      {formatValue(cert.issueDate)}
                    </span>
                  </div>
                </div>

                {/* Verification Code */}
                <div className="p-3 bg-slate-50 border border-slate-200/55 rounded-lg flex flex-col gap-1 mt-2 text-center select-all">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Verification Audit Hash</span>
                  <span className="text-xs font-mono text-slate-650 break-all">{cert.verificationCode || 'BU-HSH-NOT-SET'}</span>
                </div>

                {cert.status === 'revoked' && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs mt-2">
                    <span className="font-bold block uppercase tracking-wider text-[9px] mb-1">Revocation Cause:</span>
                    <span>{cert.revocationReason || 'This credential is no longer authenticated by the administration Board.'}</span>
                    {cert.revokedAt && (
                      <span className="block text-[10px] text-rose-550 mt-1">Revoked on: {formatValue(cert.revokedAt)}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
export default CertificateVerificationPage;
