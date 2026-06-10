import { StudentRankingResult } from './scoringService';
import { CourseAnalyticsRow } from '../components/Analytics/CourseAnalyticsTable';

/**
 * Service to prepare data formats for exports (CSV, Google Sheets, Excel).
 */

/**
 * Prepares and formats Student Progress data to CSV representation.
 */
export function exportStudentProgressCSV(data: StudentRankingResult[], plannedSessions: number, maxPoints: number): string {
  const headers = ['Rank', 'Student ID', 'Student Name', 'Email', 'Attended Sessions', 'Planned Sessions', 'Attendance Rate (%)', 'Score', 'Max Points', 'Warning Threshold Status (<80%)'];
  
  const rows = data.map((row) => {
    const isAtRisk = row.attendanceRate < 80 ? 'FLAGGED AT-RISK' : 'SAFE';
    return [
      row.rank,
      `"${row.student.studentId}"`,
      `"${row.student.name.replace(/"/g, '""')}"`,
      `"${row.student.email}"`,
      row.attendanceCount,
      plannedSessions,
      row.attendanceRate.toFixed(2),
      row.score.toFixed(2),
      maxPoints,
      isAtRisk
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Prepares Student Progress data as a clean raw array of objects suitable for Google Sheets / Google Sheets API.
 */
export function exportStudentProgressSheetsData(data: StudentRankingResult[], plannedSessions: number, maxPoints: number) {
  return data.map((row) => ({
    Rank: row.rank,
    'Student ID': row.student.studentId,
    'Student Name': row.student.name,
    Email: row.student.email,
    'Attended Sessions': row.attendanceCount,
    'Planned Sessions': plannedSessions,
    'Attendance Rate (%)': parseFloat(row.attendanceRate.toFixed(2)),
    Score: parseFloat(row.score.toFixed(2)),
    'Max Points': maxPoints,
    Status: row.attendanceRate < 80 ? 'At Risk' : 'Satisfactory'
  }));
}

/**
 * Prepares and formats Course Portfolio analytics to CSV representation.
 */
export function exportCourseAnalyticsCSV(coursesData: CourseAnalyticsRow[]): string {
  const headers = ['Course Code', 'Course Title', 'Planned Sessions', 'Completed Sessions', 'Class Average Attendance Rate (%)', 'Class Average Score', 'Max Points'];

  const rows = coursesData.map((row) => {
    return [
      `"${row.courseCode}"`,
      `"${row.courseName.replace(/"/g, '""')}"`,
      row.plannedSessions,
      row.completedSessions,
      row.attendanceRate.toFixed(2),
      row.averageScore.toFixed(2),
      row.maxPoints
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Prepares Course Analytics data as a clean raw array of objects suitable for Google Sheets API.
 */
export function exportCourseAnalyticsSheetsData(coursesData: CourseAnalyticsRow[]) {
  return coursesData.map((row) => ({
    'Course Code': row.courseCode,
    'Course Name': row.courseName,
    'Planned Sessions': row.plannedSessions,
    'Completed Sessions': row.completedSessions,
    'Class Average Attendance Rate (%)': parseFloat(row.attendanceRate.toFixed(2)),
    'Class Average Score': parseFloat(row.averageScore.toFixed(2)),
    'Max Points': row.maxPoints
  }));
}
