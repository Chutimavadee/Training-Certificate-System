import { Attendance, StudentProfile } from '../types';

/**
 * Calculates the number of successful attendances (only 'present', 'late', or 'manual').
 * Do NOT count 'absent' or other statuses.
 */
export function calculateAttendanceCount(records: Attendance[]): number {
  if (!records || !Array.isArray(records)) return 0;
  return records.filter(
    (r) => r.status === 'present' || r.status === 'late' || r.status === 'manual'
  ).length;
}

/**
 * Calculates the percentage attendance rate.
 * Formula: (attendedSessions / plannedSessions) * 100
 */
export function calculateAttendanceRate(
  attendedSessions: number,
  plannedSessions: number
): number {
  if (!plannedSessions || plannedSessions <= 0) return 0;
  if (attendedSessions < 0) return 0;
  
  const rate = (attendedSessions / plannedSessions) * 100;
  // Ensure we round to two decimal places and cap at 100% just in case
  return Math.min(100, Math.round(rate * 100) / 100);
}

/**
 * Calculates the proportional attendance score.
 * Formula: score = (actualAttendance / plannedSessions) * maxPoints
 * Stored to 2 decimal places.
 */
export function calculateAttendanceScore(
  actualAttendance: number,
  plannedSessions: number,
  maxPoints: number
): number {
  if (!plannedSessions || plannedSessions <= 0) return 0;
  if (!maxPoints || maxPoints <= 0) return 0;
  if (actualAttendance < 0) return 0;

  const score = (actualAttendance / plannedSessions) * maxPoints;
  // Hold 2 decimal places and cap at maxPoints
  return Math.min(maxPoints, Math.round(score * 100) / 100);
}

export interface StudentRankingResult {
  rank: number;
  student: StudentProfile;
  attendanceCount: number;
  attendanceRate: number;
  score: number;
}

/**
 * Calculates and ranks students based on Attendance Rate first, and then Score.
 */
export function calculateStudentRanking(
  students: StudentProfile[],
  allRecords: Attendance[],
  plannedSessions: number,
  maxPoints: number
): StudentRankingResult[] {
  if (!students || !Array.isArray(students)) return [];

  // Group attendance records by studentId
  const recordsByStudent = allRecords.reduce<Record<string, Attendance[]>>((acc, rec) => {
    if (!acc[rec.studentId]) {
      acc[rec.studentId] = [];
    }
    acc[rec.studentId].push(rec);
    return acc;
  }, {});

  const results = students.map((student) => {
    const studentRecords = recordsByStudent[student.id] || [];
    const attendanceCount = calculateAttendanceCount(studentRecords);
    const attendanceRate = calculateAttendanceRate(attendanceCount, plannedSessions);
    const score = calculateAttendanceScore(attendanceCount, plannedSessions, maxPoints);

    return {
      student,
      attendanceCount,
      attendanceRate,
      score,
    };
  });

  // Sort by Attendance Rate Descending, then by Score Descending
  results.sort((a, b) => {
    if (b.attendanceRate !== a.attendanceRate) {
      return b.attendanceRate - a.attendanceRate;
    }
    return b.score - a.score;
  });

  // Assign ranks (handle ties nicely if they have identical statistics, but simple incremental rank fits standard tables)
  return results.map((item, index) => ({
    rank: index + 1,
    student: item.student,
    attendanceCount: item.attendanceCount,
    attendanceRate: item.attendanceRate,
    score: item.score,
  }));
}
