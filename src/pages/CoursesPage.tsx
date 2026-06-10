import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Search, Plus, Calendar, BookOpen, Clock, Users, Link as LinkIcon, CheckCircle2, Trash2, AlertCircle, Laptop, Landmark, Globe } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { user, role, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Record<string, string>>({}); // courseId -> status
  
  // Create / Edit course states (For teacher / admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newType, setNewType] = useState<'onsite' | 'online' | 'hybrid'>('online');
  const [newHours, setNewHours] = useState(30);
  const [newSeats, setNewSeats] = useState(50);
  const [newMeetingLink, setNewMeetingLink] = useState('');
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load courses and registrations
  const loadData = async () => {
    try {
      setLoading(true);
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const loadedCourses = coursesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCourses(loadedCourses);

      if (user && role === 'student') {
        const regs: Record<string, string> = {};
        // Query root registrations or subcollections
        const rootRegsSnap = await getDocs(collection(db, 'registrations'));
        rootRegsSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.studentId === user.uid) {
            regs[data.courseId] = data.status;
          }
        });
        
        // Also look in subcollections of loaded courses to be extra safe & synchronized
        for (const crs of loadedCourses) {
          try {
            const subRegRef = doc(db, 'courses', crs.id, 'registrations', `${user.uid}_${crs.id}`);
            const subRegSnap = await getDoc(subRegRef);
            if (subRegSnap.exists()) {
              regs[crs.id] = subRegSnap.data().status;
            }
          } catch(e) {
            // Ignore if permission denied
          }
        }
        
        setUserRegistrations(regs);
      }
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setActionError('Could not sync curriculum catalog details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, role]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle || !newStartDate || !newEndDate) {
      setActionError('Please fill out all required academic course parameters.');
      return;
    }

    try {
      setActionError(null);
      const courseId = 'crs_' + Math.floor(100000 + Math.random() * 900000);
      
      const coursePayload = {
        id: courseId,
        code: newCode.toUpperCase(),
        title: newTitle,
        description: newDesc,
        teacherId: user?.uid || 'system',
        startDate: newStartDate,
        endDate: newEndDate,
        trainingType: newType,
        trainingHours: Number(newHours) || 30,
        availableSeats: Number(newSeats) || 50,
        meetingLink: newType !== 'onsite' ? newMeetingLink : '',
        createdAt: serverTimestamp(),
        plannedSessions: 10,
        maxPoints: 100,
      };

      await setDoc(doc(db, 'courses', courseId), coursePayload);
      
      setActionSuccess(`Course ${newCode} added successfully!`);
      setShowCreateModal(false);
      
      // Reset form
      setNewCode('');
      setNewTitle('');
      setNewDesc('');
      setNewStartDate('');
      setNewEndDate('');
      setNewType('online');
      setNewHours(30);
      setNewSeats(50);
      setNewMeetingLink('');

      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error creating course:', err);
      setActionError(err.message || 'Verification failure creating course.');
    }
  };

  const handleRegister = async (course: any) => {
    if (!user) {
      setActionError('You must be signed in to enroll in this course.');
      return;
    }
    try {
      setActionError(null);

      // Verify availability
      if (course.availableSeats !== undefined && course.availableSeats <= 0) {
        setActionError('Registration closed. There are no remaining seats in this course.');
        return;
      }

      const regId = `${user.uid}_${course.id}`;
      const payloadRoot = {
        registrationId: regId,
        studentId: user.uid,
        courseId: course.id,
        status: 'registered', // matches prompt requirement
        registrationDate: serverTimestamp(),
      };

      const payloadSubcollect = {
        id: regId,
        studentId: user.uid,
        courseId: course.id,
        status: 'approved', // backward support for checkins/attendance dashboard
        registeredAt: serverTimestamp(),
      };

      // Atomic batch replication inside Spark constraints simply writing setDocs
      await setDoc(doc(db, 'registrations', regId), payloadRoot);
      await setDoc(doc(db, 'courses', course.id, 'registrations', regId), payloadSubcollect);

      // Decrement seats
      if (course.availableSeats !== undefined && course.availableSeats > 0) {
        await setDoc(doc(db, 'courses', course.id), {
          ...course,
          availableSeats: course.availableSeats - 1
        }, { merge: true });
      }

      setActionSuccess(`Enrollment confirmed for ${course.code}!`);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setActionError('Registration unsuccessful due to database constraints.');
    }
  };

  const handleCancelRegistration = async (courseId: string) => {
    if (!user) return;
    try {
      setActionError(null);
      const regId = `${user.uid}_${courseId}`;
      
      await deleteDoc(doc(db, 'registrations', regId));
      await deleteDoc(doc(db, 'courses', courseId, 'registrations', regId));

      // Restore seats
      const course = courses.find(c => c.id === courseId);
      if (course && course.availableSeats !== undefined) {
        await setDoc(doc(db, 'courses', courseId), {
          ...course,
          availableSeats: course.availableSeats + 1
        }, { merge: true });
      }

      setActionSuccess('Your course enrollment cancellation was registered.');
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setActionError('Could not process enrollment status modification.');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Delete this course curriculum from record?')) return;
    try {
      setActionError(null);
      await deleteDoc(doc(db, 'courses', courseId));
      setActionSuccess('Course removed successfully.');
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Deletion error:', err);
      setActionError('Permission denied deleting this curriculum.');
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6" id="courses-wrapper">
      {/* Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Academic Curriculum Hub</h1>
          <p className="text-sm text-slate-500">Discover, register, and coordinate online or physical academic training programs.</p>
        </div>
        {(role === 'teacher' || role === 'admin') && (
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 font-bold cursor-pointer transition-all">
            <Plus className="h-4 w-4" /> Issue Course
          </Button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-semibold rounded-xl border border-emerald-100 flex items-center gap-2 animate-slide-in-up shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 text-rose-850 text-xs sm:text-sm font-semibold rounded-xl border border-rose-100 flex items-center gap-2 animate-slide-in-up">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Course Search filter */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-250/50 shadow-sm flex items-center gap-3">
        <div className="relative flex-grow">
          <Input
            placeholder="Search by course code, syllabus topics, or professor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Courses Catalog list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs text-slate-400 font-mono">Syncing Courses Database...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="border-dashed border-slate-350 p-12 text-center text-slate-450">
          <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Program Matches</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">There are no courses matching this search scope in Bangkok University's database directories.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" id="courses-grid-elements">
          {filteredCourses.map((course) => {
            const enrollStatus = userRegistrations[course.id];
            const isRegistered = enrollStatus === 'registered' || enrollStatus === 'approved';
            
            return (
              <Card key={course.id} className="flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-200 relative border-slate-200">
                {/* Custom Type Badge */}
                <span className={`absolute top-4 right-4 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  course.trainingType === 'online' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  course.trainingType === 'hybrid' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {course.trainingType || 'onsite'}
                </span>

                <CardHeader className="pb-3 pr-20">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">
                    {course.code}
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-800 leading-tight pr-4">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">Instructor Id: {course.teacherId}</CardDescription>
                </CardHeader>

                <CardContent className="text-xs text-slate-500 leading-relaxed font-light pb-4">
                  <p className="line-clamp-3 mb-4">{course.description || 'No detailed academic syllabus overview has been written for this curriculum yet.'}</p>
                  
                  {/* Detailed specs */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-[10px]">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400shrink-0" />
                      <span>{course.trainingHours || '30'} Hours Target</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{course.availableSeats !== undefined ? course.availableSeats : '30'} Seats Left</span>
                    </div>
                    {course.meetingLink && (
                      <div className="col-span-2 flex items-center gap-1 text-indigo-650 font-mono truncate">
                        <LinkIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{course.meetingLink}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto bg-slate-50/20 px-6 py-4 rounded-b-xl">
                  {role === 'student' ? (
                    isRegistered ? (
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {enrollStatus === 'approved' ? 'Active' : 'Registered'}
                        </span>
                        <Button variant="secondary" size="xs" onClick={() => handleCancelRegistration(course.id)} className="text-[10px] text-red-650 hover:bg-red-50 hover:text-red-700 font-semibold">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => handleRegister(course)} disabled={course.availableSeats !== undefined && course.availableSeats <= 0} className="w-full text-xs font-bold py-1.5 bg-indigo-600 hover:bg-indigo-700">
                        {course.availableSeats !== undefined && course.availableSeats <= 0 ? 'Fully Booked' : 'Quick Register'}
                      </Button>
                    )
                  ) : (role === 'teacher' && course.teacherId === user?.uid) || role === 'admin' ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">Managed</span>
                      <Button variant="secondary" size="xs" onClick={() => handleDeleteCourse(course.id)} className="text-red-650 hover:bg-rose-50 border-transparent hover:border-rose-100">
                        <Trash2 className="h-3 w-3 mr-0.5" /> Discontinue
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Restricted View</span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-scale-in">
            <div className="bg-indigo-750 text-white p-5 flex justify-between items-center bg-indigo-900">
              <h2 className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Launch Course Curriculum
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-indigo-200 hover:text-white font-bold text-lg select-none cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Course Code"
                  placeholder="e.g. CS-201"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <Input
                  label="Course Title"
                  placeholder="e.g. Advanced Web Architectures"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Syllabus Overview</label>
                <textarea
                  className="rounded-lg border border-slate-250 p-2 text-xs h-20 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Draft syllabus, topics, core methodologies to cover..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Commences On"
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
                <Input
                  label="Culminates On"
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Select
                  label="Training Format"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  options={[
                    { value: 'onsite', label: '🏟️ Onsite' },
                    { value: 'online', label: '💻 Online Only' },
                    { value: 'hybrid', label: '🛰️ Hybrid Study' },
                  ]}
                />
                <Input
                  label="Credit Hours"
                  type="number"
                  min="1"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                />
                <Input
                  label="Student Cap"
                  type="number"
                  min="1"
                  value={newSeats}
                  onChange={(e) => setNewSeats(Number(e.target.value))}
                />
              </div>

              {newType !== 'onsite' && (
                <Input
                  label="Virtual Meeting Link (Meet / Zoom / Teams)"
                  placeholder="e.g. https://meet.google.com/abc-defg-hij"
                  value={newMeetingLink}
                  onChange={(e) => setNewMeetingLink(e.target.value)}
                  required
                />
              )}

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)} className="text-xs py-2 px-4 shadow-sm">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="text-xs py-2 px-6 bg-indigo-650 text-white hover:bg-indigo-700 font-bold">
                  Deploy Curriculum
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CoursesPage;
