# Security Specification: Training Management & Certification System

## 1. Data Invariants

1. **Self-Ownership & Role Pinning**: A student profile (`/students/{uid}`) or teacher profile (`/teachers/{uid}`) must have their UID matching the Auth UID (`request.auth.uid`), and their system `role` can never be dynamically changed after creation.
2. **Access Control Hierarchy**: A class session and registrations are children of a `Course`. Access to write/delete sessions or approve registrations is derived from checking that the current user matches the `teacherId` listed in the parent Course document.
3. **Immutability of Completion Records**: Issued course completion certificates (`/certificates/{id}`) are completely immutable (no updates allowed) to prevent credential counterfeit.
4. **Verified Credentials**: All writes (create, update, delete) require verified email status (`request.auth.token.email_verified == true`).
5. **Clean Temporal Logic**: All timestamp parameters (`createdAt`, `updatedAt`, `timestamp`, `registeredAt`) must enforce temporal integrity relative to Firestore's server-generated `request.time`.

---

## 2. The "Dirty Dozen" Malicious Payloads (Vulnerability Scenarios)

The following 12 payloads represent malicious attempts to bypass identity, integrity, state, or privilege scopes, and must be strictly denied by the rules.

### Scenario 1: Profile Hijacking (Identity Spoofing)
*   **Target**: `/students/malicious_attacker_uid`
*   **Payload**: User `victim_user_uid` tries to write student details for themselves inside `malicious_attacker_uid`.
*   **Result**: `PERMISSION_DENIED`

### Scenario 2: Privilege Escalation (Role Injection)
*   **Target**: `/students/victim_user_uid`
*   **Payload**: Setting `"role": "teacher"` or `"role": "admin"`.
*   **Result**: `PERMISSION_DENIED`

### Scenario 3: Unauthorized Course Creation
*   **Target**: `/courses/cs101`
*   **Payload**: Attacker logged in as a Student tries to create a Course document.
*   **Result**: `PERMISSION_DENIED`

### Scenario 4: Hijacking Someone Else's Course
*   **Target**: `/courses/cs101`
*   **Payload**: Teacher B tries to modify the details of Teacher A's Course cs101.
*   **Result**: `PERMISSION_DENIED`

### Scenario 5: Session Injection
*   **Target**: `/courses/courseA/sessions/sessionX`
*   **Payload**: A non-authorized student tries to schedule an arbitrary attendance session under courseA.
*   **Result**: `PERMISSION_DENIED`

### Scenario 6: Unauthorized Registration Approval (State Shortcutting)
*   **Target**: `/courses/courseA/registrations/registrationX`
*   **Payload**: Student sets their own approval status to `"approved"`.
*   **Result**: `PERMISSION_DENIED`

### Scenario 7: Proxy QR Check-In Fraud
*   **Target**: `/attendance/attendanceY`
*   **Payload**: Student attempts to mark attendance on behalf of another student (`studentId: "victim_student_uid"`).
*   **Result**: `PERMISSION_DENIED`

### Scenario 8: Counterfeit Certificate Issuance
*   **Target**: `/certificates/fakeCert`
*   **Payload**: Student drafts and uploads an arbitrary Certificate declaring they've completed cs101.
*   **Result**: `PERMISSION_DENIED`

### Scenario 9: Certificate Tampering
*   **Target**: `/certificates/validCert`
*   **Payload**: Student attempts to edit a previously issued certificate to change the `"studentId"` or `"courseId"`.
*   **Result**: `PERMISSION_DENIED`

### Scenario 10: Denial-Of-Wallet Injection
*   **Target**: `/courses/courseA`
*   **Payload**: Attacker tries to write a 1MB string into the `"code"` field to consume Firestore storage.
*   **Result**: `PERMISSION_DENIED` (enforced by size limits on strings)

### Scenario 11: Future/Past Timestamp Manipulation
*   **Target**: `/attendance/attZ`
*   **Payload**: User submits a client-generated date in the future or past for `timestamp`.
*   **Result**: `PERMISSION_DENIED` (only `request.time` server timestamps allowed)

### Scenario 12: Unverified User Bypass
*   **Target**: `/students/unverifiedUid`
*   **Payload**: An authenticated user whose email is not verified attempts to register a profile.
*   **Result**: `PERMISSION_DENIED`

---

## 3. Test Suite Verification (firestore.rules.test.ts Structure)

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, getDoc, doc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'training-mgmt-cert-sys',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Zero-Trust Security Verification', () => {
  test('rejects profile creation if ID matches other user', async () => {
    const context = testEnv.authenticatedContext('userA');
    const db = context.firestore();
    const studentDoc = doc(db, 'students', 'userB'); // ID does not match
    await expect(setDoc(studentDoc, {
      id: 'userB',
      email: 'userb@school.edu',
      name: 'User B',
      role: 'student',
      studentId: 'STU1122',
      createdAt: new Date()
    })).rejects.toThrow();
  });
});
```
