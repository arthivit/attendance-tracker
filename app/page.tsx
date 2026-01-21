"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./components/Modal";
import type { AttendanceRecord, AttendanceStatus, ClassItem, Student } from "../lib/types";
import { classNames, todayISO, uid } from "../lib/utils";
import { downloadAttendanceCSV } from "../lib/csv";

export default function Page() {
  // In-memory state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [activeClassId, setActiveClassId] = useState<string>("");

  // Attendance date & draft
  const [attendanceDate, setAttendanceDate] = useState<string>(todayISO());
  const [draftEntries, setDraftEntries] = useState<Record<string, AttendanceStatus>>({});

  // Modals
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // Form fields (modal)
  const [newClassName, setNewClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  const classInputRef = useRef<HTMLInputElement | null>(null);
  const studentNameRef = useRef<HTMLInputElement | null>(null);

  // Ensure at least one class exists
  useEffect(() => {
    if (classes.length === 0) {
      const c: ClassItem = { id: uid(), name: "Section 001", createdAt: Date.now() };
      setClasses([c]);
      setActiveClassId(c.id);
    }
    // run once for initialization
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

  // Seed draft entries when roster/date changes
  useEffect(() => {
    if (!activeClassId) return;
    const seeded: Record<string, AttendanceStatus> = {};
    for (const s of classStudents) {
      seeded[s.id] = draftEntries[s.id] ?? "absent";
    }
    setDraftEntries(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId, attendanceDate, classStudents.length]);

  // Focus first input when opening modals
  useEffect(() => {
    if (classModalOpen) setTimeout(() => classInputRef.current?.focus(), 0);
  }, [classModalOpen]);

  useEffect(() => {
    if (studentModalOpen) setTimeout(() => studentNameRef.current?.focus(), 0);
  }, [studentModalOpen]);

  function openCreateClass() {
    setNewClassName("");
    setClassModalOpen(true);
  }

  function openAddStudent() {
    if (!activeClassId) return;
    setNewStudentName("");
    setNewStudentEmail("");
    setStudentModalOpen(true);
  }

  function handleCreateClassSubmit(e: React.FormEvent) {
    e.preventDefault(); // Enter submits
    const name = newClassName.trim();
    if (!name) return;

    const c: ClassItem = { id: uid(), name, createdAt: Date.now() };
    setClasses((prev) => [...prev, c]);
    setActiveClassId(c.id);
    setClassModalOpen(false);
  }

  function handleAddStudentSubmit(e: React.FormEvent) {
    e.preventDefault(); // Enter submits
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
    setStudentModalOpen(false);
  }

 function setStatus(studentId: string, status: AttendanceStatus) {
  setDraftEntries((prev) => ({
    ...prev,
    [studentId]: status,
  }));
}


  function saveAttendance() {
    if (!activeClassId) return;

    const rec: AttendanceRecord = {
      id: uid(),
      classId: activeClassId,
      date: attendanceDate,
      entries: { ...draftEntries },
      createdAt: Date.now(),
    };

    // Upsert by classId+date
    setRecords((prev) => {
      const filtered = prev.filter((r) => !(r.classId === activeClassId && r.date === attendanceDate));
      return [...filtered, rec];
    });
  }

  function attendancePercent(studentId: string) {
    if (classRecords.length === 0) return "—";
    let present = 0;
    for (const r of classRecords) if (r.entries[studentId] === "present") present++;
    return `${Math.round((present / classRecords.length) * 100)}%`;
  }

  function exportCSV() {
    downloadAttendanceCSV({
      filename: `${(activeClass?.name ?? "class").replaceAll(" ", "_")}_attendance.csv`,
      records: classRecords,
      students: classStudents,
    });
  }

  return (
    <>
      <main className="page">
        <header className="topbar">
          <div>
            <h1 className="h1">Attendance Tracker</h1>
            <p className="muted">Created by av1066, CSES'29 </p>
          </div>
          <div className="topbarActions">
            <button className="btn btnPrimary" onClick={openCreateClass}>
              + New Class
            </button>
            <button className="btn btnSecondary" onClick={openAddStudent} disabled={!activeClassId}>
              + New Student
            </button>
          </div>
        </header>

        <div className="grid">
          {/* LEFT: Classes + Students */}
          <section className="card">
            <div className="cardHeader">
              <div>
                <h2 className="h2">Class & Roster</h2>
                <p className="muted">Switch classes and manage students' attendance with ease.</p>
              </div>
            </div>
            
            <div className="fieldRow">
              <label className="muted">Selected Class</label>

              <div className="classSelectRow">
                <select
                  className="select"
                  value={activeClassId}
                  onChange={(e) => setActiveClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btnSecondary"
                  onClick={openCreateClass}
                  type="button"
                >
                  + Add Class
                </button>
              </div>
            </div>

            <div className="divider" />

            <div className="rowBetween">
              <div>
                <h3 className="h3">Students</h3>
                <p className="muted">Roster for the selected class.</p>
              </div>
              <button className="btn btnSecondary" onClick={openAddStudent} disabled={!activeClassId}>
                + Add
              </button>
            </div>

            {classStudents.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">No students yet</div>
                <div className="muted">Add students to start taking attendance.</div>
                <button className="btn btnPrimary" onClick={openAddStudent} disabled={!activeClassId}>
                  + Add your first student
                </button>
              </div>
            ) : (
              <ul className="list">
                {classStudents.map((s) => (
                  <li key={s.id} className="listItem">
                    <div>
                      <div className="listTitle">{s.name}</div>
                      <div className="muted">{s.email ? s.email : "No email/ID"}</div>
                    </div>
                    <div className="pill">{attendancePercent(s.id)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* RIGHT: Take Attendance + History */}
          <section className="card">
            <div className="cardHeader">
              <div>
                <h2 className="h2">Take Attendance</h2>
                <p className="muted">
                  {activeClass ? (
                    <>
                      Recording for <b>{activeClass.name}</b>
                    </>
                  ) : (
                    "Select a class to begin."
                  )}
                </p>
              </div>

              <div className="rightHeaderActions">
                <div className="dateWrap">
                  <span className="labelInline">Date</span>
                  <input
                    className="input"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                <button className="btn btnPrimary" onClick={saveAttendance} disabled={classStudents.length === 0}>
                  Save
                </button>
              </div>
            </div>

            {classStudents.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">Add students to take attendance</div>
                <div className="muted">Use “New Student” to add students to this class.</div>
              </div>
            ) : (
              <div className="attendanceList">
                {classStudents.map((s) => {
                  const status = draftEntries[s.id] ?? "absent";
                  return (
                    <div key={s.id} className="attendanceRow">
                      <div className="attendanceName">
                        <div className="listTitle">{s.name}</div>
                        <div className="muted">{s.email ? s.email : "—"}</div>
                      </div>
                      <div className="btnGroup" role="group" aria-label={`Mark ${s.name}`}>
                      <button
                        className={classNames(
                          "btn",
                          "btnSmall",
                          status === "present" && "btnPillOn"
                        )}
                        onClick={() => setStatus(s.id, "present")}
                        aria-pressed={status === "present"}
                        type="button"
                      >
                        Present
                      </button>

                      <button
                        className={classNames(
                          "btn",
                          "btnSmall",
                          status === "absent" && "btnPillAbsent"
                        )}
                        onClick={() => setStatus(s.id, "absent")}
                        aria-pressed={status === "absent"}
                        type="button"
                      >
                        Absent
                      </button>
                    </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="divider" />

            <div className="rowBetween">
              <div>
                <h3 className="h3">History</h3>
                <p className="muted">Saved attendance records for this class.</p>
              </div>
              <button className="btn btnSecondary" onClick={exportCSV} disabled={classRecords.length === 0}>
                Export CSV
              </button>
            </div>

            {classRecords.length === 0 ? (
              <div className="empty compact">
                <div className="muted">No saved records yet. Take attendance and press Save.</div>
              </div>
            ) : (
              <div className="history">
                {classRecords.map((r) => (
                  <div key={r.id} className="historyCard">
                    <div className="historyTop">
                      <div className="historyDate">{r.date}</div>
                      <div className="muted">{activeClass?.name}</div>
                    </div>

                    <div className="historyGrid">
                      {classStudents.map((s) => (
                        <div key={s.id} className="historyItem">
                          <div className="muted">{s.name}</div>
                          <div className={classNames("status", r.entries[s.id] === "present" ? "ok" : "bad")}>
                            {r.entries[s.id] === "present" ? "Present" : "Absent"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Create Class Modal */}
      <Modal
        open={classModalOpen}
        title="Create a new class"
        description="Give your class/section a name. Press Enter to create."
        onClose={() => setClassModalOpen(false)}
      >
        <form onSubmit={handleCreateClassSubmit} className="form">
          <label className="label">Class name</label>
          <input
            ref={classInputRef}
            className="input"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="e.g., COSC1020 - Section 1"
          />

          <div className="formActions">
            <button type="button" className="btn btnGhost" onClick={() => setClassModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btnPrimary" disabled={!newClassName.trim()}>
              Create class
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Student Modal */}
      <Modal
        open={studentModalOpen}
        title="Add a new student"
        description="Enter a name (required) and an optional email/NetID. Press Enter to add."
        onClose={() => setStudentModalOpen(false)}
      >
        <form onSubmit={handleAddStudentSubmit} className="form">
          <label className="label">Student name</label>
          <input
            ref={studentNameRef}
            className="input"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="e.g., Jane Doe"
          />

          <label className="label" style={{ marginTop: 10 }}>
            Email / NetID (optional)
          </label>
          <input
            className="input"
            value={newStudentEmail}
            onChange={(e) => setNewStudentEmail(e.target.value)}
            placeholder="e.g., jd12(@georgetown.edu)"
          />

          <div className="formActions">
            <button type="button" className="btn btnGhost" onClick={() => setStudentModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btnPrimary" disabled={!newStudentName.trim()}>
              Add student
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
