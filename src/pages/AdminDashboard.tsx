import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle, 
  UserCog, 
  Mail, 
  Trash2, 
  Key, 
  UserCheck 
} from 'lucide-react';

interface SystemUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'student' | 'admin';
  createdAt?: any;
  lastLogin?: any;
}

interface PreRegisteredStudent {
  id: string;
  email: string;
  name: string;
  studentId: string;
  createdAt?: any;
}

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [students, setStudents] = useState<PreRegisteredStudent[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // New Student registration states
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentIdNum, setStudentIdNum] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Load directory information
  const fetchData = async () => {
    try {
      setLoadingUsers(true);
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const usersList: SystemUser[] = [];
      usersSnap.forEach((doc) => {
        usersList.push(doc.data() as SystemUser);
      });
      setUsers(usersList);
    } catch (e) {
      console.error("Error fetching system users:", e);
    } finally {
      setLoadingUsers(false);
    }

    try {
      setLoadingStudents(true);
      const studentsSnap = await getDocs(query(collection(db, 'students')));
      const studentsList: PreRegisteredStudent[] = [];
      studentsSnap.forEach((doc) => {
        const data = doc.data();
        studentsList.push({
          id: doc.id,
          email: data.email || '',
          name: data.name || '',
          studentId: data.studentId || '',
          createdAt: data.createdAt
        });
      });
      setStudents(studentsList);
    } catch (e) {
      console.error("Error fetching registered students:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update user's system privilege role
  const handleRoleChange = async (uid: string, newRole: 'teacher' | 'student' | 'admin') => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      
      // If student or teacher, propagate appropriate record
      if (newRole === 'teacher') {
        const tRef = doc(db, 'teachers', uid);
        await setDoc(tRef, {
          id: uid,
          email: users.find(u => u.uid === uid)?.email || '',
          name: users.find(u => u.uid === uid)?.displayName || 'Trainer Office',
          role: 'teacher',
          department: 'Department of Computer Systems',
          createdAt: serverTimestamp()
        }, { merge: true });
      } else if (newRole === 'student') {
        const sRef = doc(db, 'students', uid);
        await setDoc(sRef, {
          id: uid,
          email: users.find(u => u.uid === uid)?.email || '',
          name: users.find(u => u.uid === uid)?.displayName || 'Trainee',
          role: 'student',
          studentId: 'STD-' + Math.floor(100000 + Math.random() * 900000),
          createdAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.error("Privilege write failed:", err);
      alert("Permission restricted or network timeout. Verify Firestore authorization logs.");
    }
  };

  // Register a new authorized student in directory
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const emailTrimmed = studentEmail.trim().toLowerCase();
    const nameTrimmed = studentName.trim();
    const idTrimmed = studentIdNum.trim();

    if (!emailTrimmed || !nameTrimmed || !idTrimmed) {
      setRegError("All fields are strictly required.");
      return;
    }

    // Email format checks
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setRegError("Enter a valid email address.");
      return;
    }

    // Check if duplicate registered email
    const duplicate = students.some(s => s.email === emailTrimmed);
    if (duplicate) {
      setRegError("This email is already registered in the official directory.");
      return;
    }

    try {
      const newId = 'student-' + Date.now();
      await setDoc(doc(db, 'students', newId), {
        id: newId,
        email: emailTrimmed,
        name: nameTrimmed,
        studentId: idTrimmed,
        role: 'student',
        createdAt: serverTimestamp()
      });

      setRegSuccess(`Successfully registered ${nameTrimmed} (${emailTrimmed}) in official system registry.`);
      setStudentEmail('');
      setStudentName('');
      setStudentIdNum('');
      fetchData(); // reload
    } catch (err: any) {
      console.error("Student registration failed on cloud database:", err);
      setRegError("Error: Insufficient permission or database quota limit exceeded.");
    }
  };

  // Delete pre-registered trainee document
  const handleDeleteStudent = async (studentDocId: string) => {
    if (!window.confirm("Are you sure you want to remove this record? Removed students cannot authenticate again.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'students', studentDocId));
      fetchData();
    } catch (err) {
      console.error("Unable to remove student:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12" id="admin-dashboard-container">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
            <Key className="h-6 w-6 text-blue-600" /> Admin Command Center
          </h1>
          <p className="text-sm text-slate-500">Configure university security policies, manage staff access level, and register student credentials.</p>
        </div>
        <Button onClick={fetchData} variant="secondary" className="font-semibold text-xs py-1.5 self-start">
          Refresh Directory
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="admin-stats-grid">
        <Card className="p-6 flex items-center gap-4 bg-blue-50/40 border-blue-100" id="stat-card-admins">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Instructors & Admins</p>
            <p className="text-2xl font-extrabold text-slate-900">{users.filter(u => u.role !== 'student').length} Active</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4 bg-indigo-50/40 border-indigo-100" id="stat-card-students">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pre-registered Trainees</p>
            <p className="text-2xl font-extrabold text-slate-900">{students.length} Registered</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4 bg-emerald-50/40 border-emerald-100" id="stat-card-verified shadow-xs">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Credentials</p>
            <p className="text-2xl font-extrabold text-slate-900">{users.length} Logged In</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="admin-main-sections">
        {/* User Role Matrix */}
        <div className="lg:col-span-2">
          <Card className="h-full" id="role-matrix-card">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">User Enrollment & Privilege Matrix</CardTitle>
                  <p className="text-xs text-slate-400 font-light mt-0.5">Change roles of active Google registered users below.</p>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded">
                  {users.length} Signed-In
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4" id="matrix-body">
              {loadingUsers ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <span>Querying Firestore user database...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl" id="empty-user-prompt">
                  <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No active sessions located.</p>
                  <p className="text-xs text-slate-400 mt-1">Users will show up automatically on their first Google login.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="users-directory-table">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="py-3 px-2">Account Profile</th>
                        <th className="py-3 px-2">Role Status</th>
                        <th className="py-3 px-2 text-right">Access Level Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((systemUser) => (
                        <tr key={systemUser.uid} className="hover:bg-slate-50/50 transition-colors text-xs" id={`user-row-${systemUser.uid}`}>
                          <td className="py-3.5 px-2">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{systemUser.displayName}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {systemUser.email}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              systemUser.role === 'admin' 
                                ? 'bg-red-50 text-red-700 border border-red-100' 
                                : systemUser.role === 'teacher' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            } capitalize`}>
                              {systemUser.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-2">
                            <div className="flex items-center justify-end gap-1.5" id={`privilege-selection-${systemUser.uid}`}>
                              <select 
                                value={systemUser.role}
                                onChange={(e) => handleRoleChange(systemUser.uid, e.target.value as any)}
                                className="text-xs font-semibold bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                              >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Registration Terminal */}
        <div className="flex flex-col gap-6">
          <Card id="add-student-card">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" /> Pre-register Trainee
              </CardTitle>
              <p className="text-xs text-slate-400 font-light mt-0.5">Authorizes trainee login with institutional accounts.</p>
            </CardHeader>
            <CardContent className="pt-4" id="reg-form-body">
              {regError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-150 font-medium">
                  {regError}
                </div>
              )}
              {regSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-150 font-medium">
                  {regSuccess}
                </div>
              )}

              <form onSubmit={handleRegisterStudent} className="flex flex-col gap-4">
                <Input 
                  label="Registered Email"
                  placeholder="e.g. trainee@bu.ac.th"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                />
                <Input 
                  label="Trainee Name"
                  placeholder="e.g. Somchai Bu"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
                <Input 
                  label="Official Student ID"
                  placeholder="e.g. 64115024"
                  required
                  value={studentIdNum}
                  onChange={(e) => setStudentIdNum(e.target.value)}
                />
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full py-2.5 font-bold cursor-pointer"
                >
                  Authorize Trainee Email
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Directory Status List */}
          <Card className="flex-1 max-h-[350px] overflow-hidden flex flex-col" id="directory-card">
            <CardHeader className="pb-3 border-b border-slate-100 shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-800">Pre-authorized Directory</CardTitle>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  {students.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-3" id="students-directory-list">
              {loadingStudents ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  <span>Loading directory entries...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 leading-normal">
                  No trainees authorized in system yet. Populate database to run student lockouts.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {students.map((student) => (
                    <div 
                      key={student.id} 
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-lg flex items-center justify-between text-xs transition-colors"
                      id={`registered-student-${student.id}`}
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="font-bold text-slate-800 truncate">{student.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                        <p className="text-[9px] text-blue-600 font-mono mt-0.5">ID: {student.studentId}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-1 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 rounded transition-colors self-center cursor-pointer"
                        title="Revoke entry privilege"
                        id={`revoke-student-btn-${student.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
