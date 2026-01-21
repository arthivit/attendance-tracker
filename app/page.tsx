"use client";

import React, { useEffect, useMemo, useState } from "react";

type ClassItem = { id: string; name: string; createdAt: number };
type Student = { id: string; classId: string; name: string; email?: string; createdAt: number };
type AttendanceStatus = "present" | "absent";
type AttendanceRecord = {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entries: Record<string, AttendanceStatus>; // studentId -> status
  createdAt: number;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayISO() {
  // YYYY-MM-DD in local time
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Page() {
  // In-memory state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [activeClassId, setActiveClassId] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  const [attendanceDate, setAttendanceDate] = useState<string>(todayISO());
  const [draftEntries, setDraftEntries] = useState<Record<string, AttendanceStatus>>({});

  // Ensure at least one class exists on first load
  useEffect(() => {
    if (classes.length === 0) {
      const c: ClassItem = { id: uid(), name: "Section 001", createdAt: Date.now() };
      setClasses([c]);
      setActiveClassId(c.id);
    }
    // Intentionally run once (initialize default class)
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

  const classRecords = useMemo(() => {
    return records
      .filter((r) => r.classId === activeClassId)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [records, activeClassId]);

  // Seed draft entries when class/date/students change.
  // Default absent unless already set in draft.
  useEffect(() => {
    if (!activeClassId) return;
    const seeded: Record<string, AttendanceStatus> = {};
    for (const s of classStudents) {
      seeded[s.id] = draftEntries[s.id] ?? "absent";
    }
    setDraftEntries(seeded);
    // We depend on length rather than full array to avoid reseeding on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId, attendanceDate, classStudents.length]);

  function handleCreateClass() {
    const name = newClassName.trim();
    if (!name) return;

    const c: ClassItem = { id: uid(), name, createdAt: Date.now() };
    setClasses((prev) => [...prev, c]);
    setActiveClassId(c.id);
    setNewClassName("");
  }

  function handleAddStudent() {
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

  function handleSaveAttendance() {
    if (!activeClassId) return;

    const rec: AttendanceRecord = {
      id: uid(),
      classId: activeClassId,
      date: attendanceDate,
      entries: { ...draftEntries },
      createdAt: Date.now(),
    };

    // Upsert by classId+date: replace existing record for that date
    setRecords((prev) => {
      const filtered = prev.filter((r) => !(r.classId === activeClassId && r.date === attendanceDate));
      return [...filtered, rec];
    });

    alert("Attendance saved!");
  }

  function attendancePercent(studentId: string) {
    if (classRecords.length === 0) return "—";
    let present = 0;
    for (const r of classRecords) {
      if (r.entries[studentId] === "present") present++;
    }
    return `${Math.round((present / classRecords.length) * 100)}%`;
  }

  function exportCSV() {
    // date, studentName, studentEmail, status
    const header = ["date", "studentName", "studentEmail", "status"];
    const rows: string[] = [header.join(",")];

    const idToStudent = new Map(classStudents.map((s) => [s.id, s]));

    // export oldest -> newest
    const ordered = [...classRecords].sort((a, b) => a.date.localeCompare(b.date));
    for (const r of ordered) {
      for (const [studentId, status] of Object.entries(r.entries)) {
        const s = idToStudent.get(studentId);
        if (!s) continue;
        rows.push(
          [
            r.date,
            JSON.stringify(s.name),
            JSON.stringify(s.email ?? ""),
            status,
          ].join(",")
        );
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeClass?.name ?? "class").replaceAll(" ", "_")}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Attendance Tracker</h1>
      <p style={{ marginTop: 6, color: "#555" }}>
        Basic working version (in-memory). Refreshing the page resets data.
      </p>

      {/* CLASS SECTION */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Class / Section</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Active class:
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
          <button onClick={handleCreateClass}>Create class</button>
        </div>
      </section>

      {/* STUDENTS SECTION */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Students</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
          <button onClick={handleAddStudent} disabled={!activeClassId}>
            Add student
          </button>
        </div>

        {classStudents.length === 0 ? (
          <p style={{ color: "#666" }}>No students yet — add at least one.</p>
        ) : (
          <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
            {classStudents.map((s) => (
              <li key={s.id}>
                {s.name}
                {s.email ? ` (${s.email})` : ""} — Attendance: <b>{attendancePercent(s.id)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* TAKE ATTENDANCE */}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Take Attendance</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Date:
            <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </label>

          <button onClick={handleSaveAttendance} disabled={classStudents.length === 0}>
            Save attendance
          </button>
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid #eee" }}>
          {classStudents.map((s) => {
            const status = draftEntries[s.id] ?? "absent";
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 6px",
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button onClick={exportCSV} disabled={classRecords.length === 0}>
            Export CSV
          </button>
        </div>

        {classRecords.length === 0 ? (
          <p style={{ color: "#666" }}>No attendance records saved yet.</p>
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
