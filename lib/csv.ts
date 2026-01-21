import type { AttendanceRecord, Student } from "./types";

export function downloadAttendanceCSV(params: {
  filename: string;
  records: AttendanceRecord[];
  students: Student[];
}) {
  const { filename, records, students } = params;

  const header = ["date", "studentName", "studentEmail", "status"];
  const rows: string[] = [header.join(",")];

  const idToStudent = new Map(students.map((s) => [s.id, s]));

  // oldest -> newest
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));

  for (const r of ordered) {
    for (const [studentId, status] of Object.entries(r.entries)) {
      const s = idToStudent.get(studentId);
      if (!s) continue;
      rows.push([r.date, JSON.stringify(s.name), JSON.stringify(s.email ?? ""), status].join(","));
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}
