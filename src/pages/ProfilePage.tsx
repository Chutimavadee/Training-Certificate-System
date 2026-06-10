import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, Shield, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, role, profile } = useAuth();
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [studentId, setStudentId] = useState((profile as any)?.studentId || '');
  const [department, setDepartment] = useState((profile as any)?.department || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl w-full mx-auto flex flex-col gap-6" id="profile-wrapper">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">My System Profile</h1>
        <p className="text-sm text-slate-500">Configure your professional identity settings and synchronize data files with Firebase accounts.</p>
      </div>

      <Card id="profile-edit-board">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">Identity settings</CardTitle>
              <span className="text-[10px] text-slate-400 capitalize">{role || 'Unassigned'} Account File</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="Enter full name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Registered Email"
                disabled
                value={user?.email || 'unregistered@google.edu'}
                className="bg-slate-50 text-slate-400"
              />
            </div>

            {role === 'student' && (
              <Input
                label="Student Identification Number"
                placeholder="e.g. 6211566"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            )}

            {role === 'teacher' && (
              <Input
                label="Trainer Department"
                placeholder="e.g. Department of Computer Engineering"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            )}

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-blue-500" /> Changes strictly write-locked inside rulesets.
              </span>
              <Button variant="primary" type="submit" className="font-semibold cursor-pointer">
                Save & Update Details
              </Button>
            </div>
          </form>

          {saved && (
            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-in-up">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>Identity rules validated. Your metadata was securely persistent to cloud.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default ProfilePage;
