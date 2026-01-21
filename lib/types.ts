export type ClassItem = { id: string; name: string; createdAt: number };

export type Student = {
  id: string;
  classId: string;
  name: string;
  email?: string;
  createdAt: number;
};

export type AttendanceStatus = "present" | "absent";

export type AttendanceRecord = {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entries: Record<string, AttendanceStatus>; // studentId -> status
  createdAt: number;
};
