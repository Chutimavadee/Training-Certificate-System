import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebase';
import { UserRole, TeacherProfile, StudentProfile } from '../types';
import { seedInitialData } from '../firebase/dbSeeder';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  profile: TeacherProfile | StudentProfile | any | null;
  loading: boolean;
  errorMessage: string | null;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setRoleOverride: (role: UserRole | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | StudentProfile | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expose a physical override for frontend dev-simulator testing
  const setRoleOverride = (newRole: UserRole | null) => {
    setRole(newRole);
    if (newRole === 'teacher') {
      setProfile({
        id: user?.uid || 'simulated-uid',
        email: user?.email || 'trainer@bu.ac.th',
        name: user?.displayName || 'Simulated Trainer',
        role: 'teacher',
        department: 'Department of Computer Systems',
        createdAt: new Date().toISOString()
      });
    } else if (newRole === 'student') {
      setProfile({
        id: user?.uid || 'simulated-uid',
        email: user?.email || 'student@bu.ac.th',
        name: user?.displayName || 'Simulated Student',
        role: 'student',
        studentId: 'STD-6211566',
        createdAt: new Date().toISOString()
      });
    } else if (newRole === 'admin') {
      setProfile({
        id: user?.uid || 'simulated-uid',
        email: user?.email || 'admin@bu.ac.th',
        name: user?.displayName || 'Simulated System Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    } else {
      setProfile(null);
    }
  };

  const clearError = () => setErrorMessage(null);

  // Database initialization and auth synchronization
  useEffect(() => {
    // Seed database quietly at initialization so testing works instantly
    seedInitialData();

    // Setup local session persistence for seamless auto login
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Set local persistence warning:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userSnap = await getDoc(userDocRef);

          // Auto-creation on reload/auth change if a users record exists or matches rules
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const userRole = userData.role as UserRole;
            
            // Enforce constraints dynamically
            if (userRole === 'teacher') {
              if (currentUser.email && !currentUser.email.endsWith('@bu.ac.th')) {
                throw new Error("Access Denied: Only @bu.ac.th emails are allowed for teachers.");
              }
              const teacherSnap = await getDoc(doc(db, 'teachers', currentUser.uid));
              setProfile(teacherSnap.exists() ? teacherSnap.data() as TeacherProfile : null);
            } else if (userRole === 'student') {
              // Verify presence in students collection
              const studentsRef = collection(db, 'students');
              const q = query(studentsRef, where('email', '==', currentUser.email));
              const querySnap = await getDocs(q);
              if (querySnap.empty) {
                throw new Error("Access Denied: Your student email has not been registered.");
              }
              const studentSnap = await getDoc(doc(db, 'students', currentUser.uid));
              setProfile(studentSnap.exists() ? studentSnap.data() as StudentProfile : null);
            } else if (userRole === 'admin') {
              setProfile({
                id: currentUser.uid,
                email: currentUser.email || '',
                name: currentUser.displayName || 'Administrator',
                role: 'admin',
                createdAt: userData.createdAt || new Date()
              });
            }

            setUser(currentUser);
            setRole(userRole);
            setErrorMessage(null);

            // Update lastLogin
            await updateDoc(userDocRef, {
              lastLogin: serverTimestamp()
            }).catch((err) => {
              console.warn("Silent lastLogin update failed:", err);
            });
          } else {
            // First Login or un-synchronized users collection
            const email = currentUser.email || '';
            let assignedRole: UserRole | null = null;
            let matchedStudentId = '';
            let matchedName = currentUser.displayName || 'Trainee';

            // 1. Check if email is Bootstrapped admin
            if (email === 'chutimavadee.t@bu.ac.th') {
              assignedRole = 'admin';
            }
            // 2. Check if email ends with @bu.ac.th (Teacher Access)
            else if (email.endsWith('@bu.ac.th')) {
              assignedRole = 'teacher';
            }
            // 3. Check if email exists in official registered trainees list
            else {
              const studentsRef = collection(db, 'students');
              const q = query(studentsRef, where('email', '==', email));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                assignedRole = 'student';
                const sData = querySnap.docs[0].data();
                matchedStudentId = sData.studentId;
                matchedName = sData.name || matchedName;
              }
            }

            if (assignedRole) {
              // Create the user centralized record
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: email,
                displayName: currentUser.displayName || matchedName,
                role: assignedRole,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              });

              // Create specific role details matching schemas for existing systems
              if (assignedRole === 'teacher') {
                const teacherDocRef = doc(db, 'teachers', currentUser.uid);
                await setDoc(teacherDocRef, {
                  id: currentUser.uid,
                  email: email,
                  name: currentUser.displayName || 'Trainer Office',
                  role: 'teacher',
                  department: 'Department of Computer Engineering',
                  createdAt: serverTimestamp()
                });
                const tSnap = await getDoc(teacherDocRef);
                setProfile(tSnap.data() as TeacherProfile);
              } else if (assignedRole === 'student') {
                const studentDocRef = doc(db, 'students', currentUser.uid);
                await setDoc(studentDocRef, {
                  id: currentUser.uid,
                  email: email,
                  name: matchedName,
                  role: 'student',
                  studentId: matchedStudentId || 'STD-' + Math.floor(100000 + Math.random() * 900000),
                  createdAt: serverTimestamp()
                });
                const sSnap = await getDoc(studentDocRef);
                setProfile(sSnap.data() as StudentProfile);
              } else if (assignedRole === 'admin') {
                setProfile({
                  id: currentUser.uid,
                  email: email,
                  name: currentUser.displayName || 'Administrator',
                  role: 'admin',
                  createdAt: new Date().toISOString()
                });
              }

              setUser(currentUser);
              setRole(assignedRole);
              setErrorMessage(null);
            } else {
              // Not authorized under either role, sign out immediately
              await signOut(auth);
              setUser(null);
              setRole(null);
              setProfile(null);
              setErrorMessage("Access Denied: Email has not been registered or domain is invalid.");
            }
          }
        } catch (error: any) {
          console.error("Auto login verification exception:", error);
          await signOut(auth).catch(() => {});
          setUser(null);
          setRole(null);
          setProfile(null);
          setErrorMessage(error?.message || "Verification failed during automatic login session.");
        }
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setLoading(true);
    setErrorMessage(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || '';
      const uid = result.user.uid;

      // Immediately run strict role validation rules for security compliance
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      let verifiedRole: UserRole | null = null;
      let matchedStudentId = '';
      let matchedName = result.user.displayName || 'Student';

      // Load existing account settings
      if (userSnap.exists()) {
        verifiedRole = userSnap.data()?.role;
      }

      // If existing role found, check validation rules to make sure they are still compliant
      if (verifiedRole) {
        if (verifiedRole === 'teacher' && !email.endsWith('@bu.ac.th')) {
          await signOut(auth);
          throw new Error("Access Denied: Only @bu.ac.th emails are allowed for teachers.");
        }
        if (verifiedRole === 'student') {
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('email', '==', email));
          const querySnap = await getDocs(q);
          if (querySnap.empty) {
            await signOut(auth);
            throw new Error("Access Denied: This student email has not been registered in the system.");
          }
        }
      } else {
        // First Login - Evaluate Role
        if (email === 'chutimavadee.t@bu.ac.th') {
          verifiedRole = 'admin';
        } else if (email.endsWith('@bu.ac.th')) {
          verifiedRole = 'teacher';
        } else {
          // Verify if student exists in database students collection
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('email', '==', email));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            verifiedRole = 'student';
            const studentEntry = querySnap.docs[0].data();
            matchedStudentId = studentEntry.studentId;
            matchedName = studentEntry.name || matchedName;
          } else {
            await signOut(auth);
            throw new Error("Student unregistered in directory. Please contact University administration.");
          }
        }
      }

      // If authorized, write / update profiles
      if (verifiedRole) {
        await setDoc(userDocRef, {
          uid: uid,
          email: email,
          displayName: result.user.displayName || matchedName,
          role: verifiedRole,
          createdAt: userSnap.exists() ? (userSnap.data().createdAt || serverTimestamp()) : serverTimestamp(),
          lastLogin: serverTimestamp()
        }, { merge: true });

        // Save detailed profile elements to match original schema layouts
        if (verifiedRole === 'teacher') {
          const tRef = doc(db, 'teachers', uid);
          const tSnap = await getDoc(tRef);
          if (!tSnap.exists()) {
            await setDoc(tRef, {
              id: uid,
              email: email,
              name: result.user.displayName || 'Trainer Office',
              role: 'teacher',
              department: 'Department of Computer Engineering',
              createdAt: serverTimestamp()
            });
          }
          const profileData = await getDoc(tRef);
          setProfile(profileData.data());
        } else if (verifiedRole === 'student') {
          const sRef = doc(db, 'students', uid);
          const sSnap = await getDoc(sRef);
          if (!sSnap.exists()) {
            await setDoc(sRef, {
              id: uid,
              email: email,
              name: matchedName,
              role: 'student',
              studentId: matchedStudentId || 'STD-' + Math.floor(100000 + Math.random() * 900000),
              createdAt: serverTimestamp()
            });
          }
          const profileData = await getDoc(sRef);
          setProfile(profileData.data());
        } else if (verifiedRole === 'admin') {
          setProfile({
            id: uid,
            email: email,
            name: result.user.displayName || 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString()
          });
        }

        setUser(result.user);
        setRole(verifiedRole);
        setErrorMessage(null);
      } else {
        await signOut(auth);
        throw new Error("Internal authorization routine failed.");
      }
    } catch (error: any) {
      console.error("Sign-In failure:", error);
      await signOut(auth).catch(() => {});
      setUser(null);
      setRole(null);
      setProfile(null);
      setErrorMessage(error?.message || "Google Authentication flow terminated by user or server policy.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = login; // Alias to satisfy both export patterns

  const logout = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      setProfile(null);
    } catch (error) {
      console.error("Sign-out failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      profile, 
      loading, 
      errorMessage, 
      login, 
      loginWithGoogle, 
      logout, 
      setRoleOverride, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
