import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Award, ShieldCheck, Download, CheckCircle2, UserCheck, Plus, Landmark } from 'lucide-react';

export const CertificatePage: React.FC = () => {
  const [issued, setIssued] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [courseSelection, setCourseSelection] = useState('cs201');

  const history = [
    { uuid: 'crt-5511-209a', name: 'Alisa S.', course: 'CS-201', date: '2026-05-24', status: 'verified' },
    { uuid: 'crt-9851-bc01', name: 'Bob Johnson', course: 'CS-201', date: '2026-05-24', status: 'verified' },
    { uuid: 'crt-3304-fe81', name: 'Chutimavadee T.', course: 'DATA-101', date: '2026-06-01', status: 'verified' },
  ];

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;
    setIssued(true);
    setTimeout(() => setIssued(false), 3500);
  };

  return (
    <div className="flex flex-col gap-6" id="certificates-wrapper">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Certificate Generation Cabin</h1>
        <p className="text-sm text-slate-500">Draft, configure signatures, and issue cryptographic certificates to students with verification logs.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Certificate Form split */}
        <div className="lg:col-span-4 flex flex-col gap-6" id="generation-form-col">
          <Card id="issue-panel">
            <CardHeader>
              <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-lg flex items-center justify-center mb-2">
                <Plus className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">Issue New Credential</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIssue} className="flex flex-col gap-4">
                <Input
                  label="Candidate Student Name"
                  placeholder="e.g. Alisa Somsri"
                  required
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                />

                <Select
                  label="Completed Course"
                  value={courseSelection}
                  onChange={(e) => setCourseSelection(e.target.value)}
                  options={[
                    { value: 'cs201', label: 'CS-201: Web Architectures' },
                    { value: 'data101', label: 'DATA-101: Big Data Fundamentals' },
                    { value: 'cs302', label: 'CS-302: Zero-Trust Security' },
                  ]}
                />

                <Input
                  label="Authority Signature File"
                  type="text"
                  disabled
                  value="Dr. Chutimavadee T. (Auto-Injected Encryption)"
                  className="bg-slate-50 text-slate-400 font-mono text-[10px]"
                />

                <Button variant="primary" type="submit" className="w-full mt-2 font-bold cursor-pointer">
                  <Award className="h-4 w-4 mr-1.5" /> Issue Cryptographic PDF
                </Button>
              </form>

              {issued && (
                <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-in-up">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span>Credential generated successfully! Secure copy saved to cloud.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Certificate preview card mockup */}
        <div className="lg:col-span-8 flex flex-col gap-6" id="preview-col">
          <h3 className="text-base font-bold text-slate-800">Dynamic Certificate Preview</h3>
          <Card className="border-amber-200/55 p-6 bg-amber-50/5 relative shadow-md" id="certificate-preview-mockup">
            <div className="border-4 border-double border-amber-200 p-8 rounded-xl flex flex-col items-center bg-white">
              {/* Header crest */}
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="h-7 w-7 text-amber-600" />
                <span className="font-serif font-semibold text-xs uppercase tracking-widest text-slate-500">
                  Bangkok University Academia
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-800 mt-2 tracking-tight">
                Certificate of Completion
              </h2>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">
                This academic record is proudly conferred upon
              </span>

              {/* Dynamic Name */}
              <p className="text-base sm:text-lg font-serif font-bold text-slate-800 underline decoration-amber-200 underline-offset-4 my-4 capitalize">
                {candidate || 'Alisa Somsri'}
              </p>

              <p className="text-center text-xs text-slate-500 leading-relaxed font-light max-w-md mb-6">
                for having fulfilled the required training syllabus, session scans, and practical benchmarks 
                prescribed under course <strong className="text-slate-700">"{courseSelection === 'cs201' ? 'CS-201: Web Architectures' : courseSelection === 'data101' ? 'DATA-101: Big Data Fundamentals' : 'CS-302: Zero-Trust Security'}"</strong>.
              </p>

              {/* Footer columns */}
              <div className="w-full flex justify-between items-end border-t border-slate-100 pt-6 mt-4 gap-4">
                <div className="text-left flex flex-col gap-1 leading-none shrink-0">
                  <span className="font-serif italic text-xs text-slate-600">Chutimavadee T.</span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Dean of Computer Engineering</span>
                </div>

                {/* Scannable Verification QR */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-16 h-16 bg-white border border-slate-200 p-1 rounded relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                      <rect width="100" height="100" fill="white" />
                      <path d="M10,10 h30 v30 h-30 z M20,20 h10 v10 h-10 z M60,10 h30 v30 h-30 z M70,20 h10 v10 h-10 z M10,60 h30 v30 h-30 z M20,70 h10 v10 h-10 z M60,60 h10 v10 h-10 z M80,80 h10 v10 h-10 z M70,70 h10 v10 h-10 z M80,60 h10 v10 h-10 z" fill="currentColor" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 bg-white rounded-full p-0.5" />
                    </div>
                  </div>
                  <span className="text-[9px] text-emerald-600 font-semibold uppercase font-mono leading-none mt-1">Verified QR</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default CertificatePage;
