"use client";

import { useEffect, useMemo, useState } from "react";

type ClassItem = { id: string; name: string; createdAt: number };
type Student = { id: string; classId: string; name: string; email?: string; createdAt: number };
type AttendanceStatus = "present" | "absent";
type AttendanceRecord = {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entries: Record<string, AttendanceStatus>;
  createdAt: number;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function HomePage() {
  // In-memory fallback, works w/o firebase (for now at least)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [activeClassId, setActiveClassId] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  const [attendanceDate, setAttendanceDate] = useState<string>(todayISO());
  const [draftEntries, setDraftEntries] = useState<Record<string, AttendanceStatus>>({});

  // making sure theres at least one class, initalizing if needed (empty)
  useEffect(() => {
    if (classes.length === 0) {
      const c = { id: uid(), name: "Section 001", createdAt: Date.now() };
      setClasses([c]);
      setActiveClassId(c.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeClass = useMemo(
    () => classes.find((c) => c.id === activeClassId),
    [classes, activeClassId]
  );

  const classStudents = useMemo(
    () => students.filter((s) => s.classId === activeClassId),
    [students, activeClassId]
  );

  const classRecords = useMemo(
    () =>
      records
        .filter((r) => r.classId === activeClassId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, activeClassId]
  );

  // When date or roster changes, pre filling (seed draft entries, default absent)
  useEffect(() => {
    if (!activeClassId) return;
    const seeded: Record<string, AttendanceStatus> = {};
    for (const s of classStudents) seeded[s.id] = draftEntries[s.id] ?? "absent";
    setDraftEntries(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceDate, activeClassId, classStudents.length]);

  function createClass() {
    const name = newClassName.trim();
    if (!name) return;
    const c: ClassItem = { id: uid(), name, createdAt: Date.now() };
    setClasses((prev) => [...prev, c]);
    setActiveClassId(c.id);
    setNewClassName("");
  }

  function addStudent() {
    if (!activeClassId) return;
    const name = newStudentName.trim();
    if (!name) return;

    const s: Student = {
      id: uid(),
      classId: activeClassId,
      name,
      email: newStudentEmail.trim() || undefined,
      createdAt: Date.now(),
    };
    setStudents((prev) => [...prev, s]);
    setNewStudentName("");
    setNewStudentEmail("");
  }

  function toggleStatus(studentId: string) {
    setDraftEntries((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  }

  function saveAttendance() {
    if (!activeClassId) return;
    const id = uid();
    const rec: AttendanceRecord = {
      id,
      classId: activeClassId,
      date: attendanceDate,
      entries: draftEntries,
      createdAt: Date.now(),
    };

    // update/insert by (classId, date): if record exists for date, replace it
    setRecords((prev) => {
      const filtered = prev.filter((r) => !(r.classId === activeClassId && r.date === attendanceDate));
      return [...filtered, rec];
    });
    alert("Attendance saved.");
  }

  function attendancePct(studentId: string) {
    const relevant = classRecords;
    if (relevant.length === 0) return "—";
    let present = 0;
    for (const r of relevant) if (r.entries[studentId] === "present") present++;
    return `${Math.round((present / relevant.length) * 100)}%`;
  }

  function exportCSV() {
    // rows: date, studentName, status
    const header = ["date", "studentName", "studentEmail", "status"];
    const rows: string[] = [header.join(",")];

    const idToStudent = new Map(classStudents.map((s) => [s.id, s]));
    for (const r of classRecords.slice().reverse()) {
      for (const [studentId, status] of Object.entries(r.entries)) {
        const s = idToStudent.get(studentId);
        if (!s) continue;
        const row = [
          r.date,
          JSON.stringify(s.name),
          JSON.stringify(s.email ?? ""),
          status,
        ].join(",");
        rows.push(row);
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeClass?.name ?? "class"}-attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Attendance Tracker</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Create classes, add students, take attendance by date, and review history.
      </p>

      {/* CLASS SECTION */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Class / Section</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Active class:&nbsp;
            <select value={activeClassId} onChange={(e) => setActiveClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="New class name"
          />
          <button onClick={createClass}>Create</button>
        </div>
      </section>

      {/* STUDENTS */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Students</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="Student name (required)"
          />
          <input
            value={newStudentEmail}
            onChange={(e) => setNewStudentEmail(e.target.value)}
            placeholder="Email/ID (optional)"
          />
          <button onClick={addStudent} disabled={!activeClassId}>
            Add student
          </button>
        </div>

        <ul style={{ paddingLeft: 18 }}>
          {classStudents.map((s) => (
            <li key={s.id}>
              {s.name}
              {s.email ? ` (${s.email})` : ""} — Attendance: <b>{attendancePct(s.id)}</b>
            </li>
          ))}
        </ul>

        {classStudents.length === 0 && <p style={{ color: "#666" }}>No students yet.</p>}
      </section>

      {/* TAKE ATTENDANCE */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Take Attendance</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Date:&nbsp;
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </label>
          <button onClick={saveAttendance} disabled={classStudents.length === 0}>
            Save attendance
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {classStudents.map((s) => {
            const status = draftEntries[s.id] ?? "absent";
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span>{s.name}</span>
                <button onClick={() => toggleStatus(s.id)}>
                  {status === "present" ? "✅ Present" : "⬜ Absent"}
                </button>
              </div>
            );
          })}
        </div>

        {classStudents.length === 0 && <p style={{ color: "#666" }}>Add students first.</p>}
      </section>

      {/* HISTORY */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Attendance History</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <button onClick={exportCSV} disabled={classRecords.length === 0}>
            Export CSV
          </button>
        </div>

        {classRecords.length === 0 ? (
          <p style={{ color: "#666" }}>No records yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {classRecords.map((r) => (
              <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>{r.date}</b>
                  <span style={{ color: "#666" }}>{activeClass?.name}</span>
                </div>

                <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                  {classStudents.map((s) => (
                    <li key={s.id}>
                      {s.name}: {r.entries[s.id] === "present" ? "Present" : "Absent"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
