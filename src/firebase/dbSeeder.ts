import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedInitialData() {
  try {
    // List of official students preset in the organization directory
    const seedStudents = [
      {
        id: 'seed-student-1',
        email: 'student@example.com',
        name: 'John Doe BU',
        studentId: 'STD-100452',
        role: 'student'
      },
      {
        id: 'seed-student-2',
        email: 'student@bu.ac.th',
        name: 'Thana Viroch',
        studentId: 'STD-202601',
        role: 'student'
      },
      {
        id: 'seed-student-3',
        email: 'trainee@bu.ac.th',
        name: 'Kitti Somboon',
        studentId: 'STD-256902',
        role: 'student'
      },
      {
        id: 'seed-student-4',
        email: 'chutimavadee.student@bu.ac.th',
        name: 'Chutimavadee Student Account',
        studentId: 'STD-998877',
        role: 'student'
      }
    ];

    for (const student of seedStudents) {
      const studentDocRef = doc(db, 'students', student.id);
      const studentSnap = await getDoc(studentDocRef);
      if (!studentSnap.exists()) {
        await setDoc(studentDocRef, {
          id: student.id,
          email: student.email,
          name: student.name,
          studentId: student.studentId,
          role: student.role,
          createdAt: serverTimestamp()
        });
        console.log(`Seeded student: ${student.email}`);
      }
    }

    // Seed default admin access
    const adminDocRef = doc(db, 'admins', 'chutimavadee-t-admin-placeholder');
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      await setDoc(adminDocRef, {
        email: 'chutimavadee.t@bu.ac.th',
        role: 'admin',
        createdAt: serverTimestamp()
      });
      console.log(`Seeded admin placeholder for: chutimavadee.t@bu.ac.th`);
    }

  } catch (error) {
    console.warn('Seeding initial data skipped or failed:', error);
  }
}
