const app = document.querySelector("#app");
const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};
const todayMonth = () => todayIso().slice(0, 7);
const state = {
  user: null, page: "overview", branches: [], students: [], classes: [], payments: [],
  fees: [], attendance: [], query: "", filterBranch: "all", feeMonth: todayMonth(),
  attendanceBranch: "", attendanceDate: todayIso()
};
const nav = [
  ["overview", "⌂", "Overview"],
  ["students", "♙", "Students"],
  ["classes", "◷", "Classes"],
  ["attendance", "◉", "Fees & attendance"],
  ["branches", "⌖", "Branches"],
  ["history", "↺", "History"]
];

const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const branchName = (id) => state.branches.find((branch) => branch.id === id)?.name || "Unassigned";
const activeStudents = () => state.students.filter((student) => student.status !== "left");
const monthLabel = (value) => value ? new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
function studentAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} yrs` : "—";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(result?.error || "Something went wrong. Please try again.");
  return result;
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 3200);
}

function loginView(error = "") {
  app.innerHTML = `<main class="login-screen"><section class="login-card">
    <div class="brand-mark" aria-hidden="true">ನೃತ್ಯ</div><p class="eyebrow">ಭರತನಾಟ್ಯ ತರಗತಿ</p>
    <h1>Welcome, teacher</h1><p class="muted">Sign in to your class sanctuary.</p>
    <form id="login-form" class="stack">
      <label>Admin username<input name="username" autocomplete="username" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-error" aria-live="polite">${esc(error)}</p>
      <button class="button button-gold" type="submit">Enter class <span>↗</span></button>
    </form><div class="login-ornament" aria-hidden="true">✦　❋　✦</div></section></main>`;
  document.querySelector("#login-form").addEventListener("submit", login);
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    state.user = true;
    await loadData();
    render();
  } catch (error) {
    form.querySelector(".form-error").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function loadData() {
  const [branches, students, classes, payments, fees, attendance] = await Promise.all([
    api("/api/data?kind=branches"), api("/api/data?kind=students"), api("/api/data?kind=classes"),
    api("/api/data?kind=payments"), api("/api/data?kind=fees"), api("/api/data?kind=attendance")
  ]);
  state.branches = branches;
  state.students = students;
  state.classes = classes;
  state.payments = payments;
  state.fees = fees;
  state.attendance = attendance;
  if (!state.attendanceBranch) state.attendanceBranch = branches.find((branch) => branch.status !== "closed")?.id || "";
}

function titleBlock(title, subtitle, button = "") {
  const quotes = {
    overview: "Let every step carry grace.",
    students: "Every dancer grows in her own rhythm.",
    classes: "Practice turns small steps into expression.",
    attendance: "Showing up is the first beautiful step.",
    branches: "A new beginning takes root in every branch.",
    history: "Every season leaves a rhythm behind."
  };
  return `<div class="page-title"><div><h1>${title}</h1><p>${subtitle}</p><p class="page-quote">“${quotes[state.page] || quotes.overview}”</p></div><span class="ornament" aria-hidden="true">❋</span>${button}</div>`;
}

function shell(content) {
  return `<div class="shell">
    <aside class="sidebar">
      <div class="side-brand"><div class="brand-mark">ನೃತ್ಯ</div><p class="eyebrow">ಭರತನಾಟ್ಯ ತರಗತಿ</p></div>
      <p class="nav-caption">Your sanctuary</p>
      <nav class="nav-list" aria-label="Main navigation">${nav.map(([id, icon, name]) => `<button class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span>${name}</button>`).join("")}</nav>
      <div class="sidebar-foot"><div class="teacher">Bhargavi</div><p class="teacher-note">Class administrator</p><button class="logout" data-action="logout">↗ &nbsp;Sign out</button></div>
    </aside>
    <main class="main">
      <div class="topline"><div style="display:flex;align-items:center"><button class="nav-toggle" data-action="menu" aria-label="Open navigation">☰</button><p class="eyebrow">Namaskaram, Bhargavi</p></div><span class="today">${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span></div>
      ${content}
    </main>
  </div>`;
}

function overviewPage() {
  const active = activeStudents();
  const openBranchIds = new Set(state.branches.filter((branch) => branch.status !== "closed").map((branch) => branch.id));
  const outstanding = active.filter((student) => openBranchIds.has(student.branchId)
    && !state.fees.some((fee) => fee.studentId === student.id && fee.month === todayMonth() && fee.paid)).length;
  const nextClass = [...state.classes].filter((item) => item.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const openBranches = state.branches.filter((branch) => branch.status !== "closed");
  const stats = [["Active students", active.filter((student) => openBranchIds.has(student.branchId)).length], ["Open branches", openBranches.length], ["Classes scheduled", state.classes.filter((item) => item.date >= todayIso()).length], ["Fees to follow up", outstanding]];
  return `${titleBlock("ನೃತ್ಯ ತರಗತಿ", "A graceful little overview of your Bharatanatyam classes.")}
    <section class="stats">${stats.map(([label, value]) => `<article class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></article>`).join("")}</section>
    <div class="grid-two">
      <section class="panel"><div class="panel-head"><h2>Your branches</h2><button class="text-action" data-page="branches">Manage branches ↗</button></div>
        <div class="branch-list">${state.branches.length ? state.branches.map((branch) => `<div class="branch-row"><div><div class="branch-name">${esc(branch.name)}</div><div class="branch-meta">Classes began ${dateLabel(branch.startDate)}${branch.closedAt ? ` · Closed ${dateLabel(branch.closedAt)}` : ""}</div></div><span class="pill ${branch.status === "closed" ? "" : "gold"}">${branch.status === "closed" ? "Closed" : `${active.filter((s) => s.branchId === branch.id).length} students`}</span></div>`).join("") : empty("Your first branch is waiting", "Create a branch to get started.")}</div>
      </section>
      <section class="panel"><div class="panel-head"><h2>Coming up</h2><button class="text-action" data-page="classes">All classes ↗</button></div>
        ${nextClass ? `<div class="activity-row"><div><div class="activity-name">${esc(nextClass.title || "Bharatanatyam class")}</div><div class="activity-meta">${dateLabel(nextClass.date)} · ${esc(branchName(nextClass.branchId))}</div></div><span class="pill gold">${(nextClass.attendance || []).length} marked</span></div>` : empty("A quiet calendar", "Add a class date to fill it with rhythm.")}
      </section>
      <section class="panel"><div class="panel-head"><h2>Fee follow-up</h2><button class="text-action" data-page="attendance">Open register ↗</button></div>
        ${outstanding ? `<div class="activity-list">${active.filter((student) => openBranchIds.has(student.branchId) && !state.fees.some((fee) => fee.studentId === student.id && fee.month === todayMonth() && fee.paid)).slice(0, 5).map((student) => `<div class="activity-row"><div><div class="activity-name">${esc(student.name)}</div><div class="activity-meta">${esc(branchName(student.branchId))}</div></div><span class="pill red">Pending · ${monthLabel(todayMonth())}</span></div>`).join("")}</div>` : empty("All caught up", `No outstanding fees for ${monthLabel(todayMonth())}.`)}
      </section>
      <section class="panel"><div class="panel-head"><h2>A small welcome</h2><span class="ornament">❋</span></div><p class="muted" style="font-family:'Cormorant Garamond',serif;font-size:20px;line-height:1.45;margin:0">“With each graceful step, devotion finds its rhythm.”</p><p class="branch-meta" style="margin-top:12px">A thought for today</p></section>
    </div>`;
}

function empty(title, message) {
  return `<div class="empty"><strong>${title}</strong>${message}</div>`;
}

function toolbar({ add, search = true, branch = true } = {}) {
  return `<div class="toolbar"><div class="toolbar-left">${search ? `<input type="search" placeholder="Search by name…" aria-label="Search records" value="${esc(state.query)}" data-action="search">` : ""}${branch ? branchSelect(state.filterBranch, "filter-branch", true) : ""}</div><div class="toolbar-right">${add ? `<button class="button button-gold button-small" data-action="${add.action}">＋ ${add.label}</button>` : ""}</div></div>`;
}

function branchSelect(selected = "", name = "branchId", all = false) {
  const branches = state.branches.filter((branch) => all || branch.status !== "closed" || branch.id === selected);
  return `<select name="${name}" ${name === "filter-branch" ? 'data-action="filter"' : ""} aria-label="Branch">${all ? `<option value="all">All branches</option>` : `<option value="">Choose branch</option>`}${branches.map((branch) => `<option value="${esc(branch.id)}" ${selected === branch.id ? "selected" : ""}>${esc(branch.name)}${branch.status === "closed" ? " (closed)" : ""}</option>`).join("")}</select>`;
}

function filteredStudents() {
  const query = state.query.toLowerCase().trim();
  return state.students.filter((student) => {
    const matchesText = !query || `${student.name} ${student.phone || ""} ${student.parentName || ""} ${student.place || ""}`.toLowerCase().includes(query);
    const matchesBranch = state.filterBranch === "all" || student.branchId === state.filterBranch;
    return matchesText && matchesBranch;
  });
}

function studentsPage() {
  const rows = filteredStudents();
  return `${titleBlock("Our students", "Every dancer, every step of the journey.", `<button class="button button-gold button-small" data-action="add-student">＋ Add student</button>`)}
    ${toolbar({ add: { action: "add-student", label: "Add student" } })}
    <div class="table-wrap"><table><thead><tr><th>Student</th><th>Age</th><th>Place</th><th>Branch</th><th>Date joined</th><th>Contact</th><th>WhatsApp group</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((student) => `<tr><td><strong>${esc(student.name)}</strong><div class="branch-meta">${esc(student.parentName || "")}</div></td><td>${studentAge(student.dateOfBirth)}</td><td>${esc(student.place || "—")}</td><td>${esc(branchName(student.branchId))}</td><td>${dateLabel(student.joinedAt)}</td><td>${esc(student.phone || "—")}</td><td><span class="pill ${student.whatsappGroup === true ? "green" : ""}">${student.whatsappGroup === true ? "Yes" : "No"}</span></td><td><span class="pill ${student.status === "left" ? "red" : "green"}">${student.status === "left" ? `Left ${dateLabel(student.leftAt)}` : "Active"}</span></td><td><div class="row-actions"><button class="link-action" data-action="edit-student" data-id="${student.id}">Edit</button>${student.status !== "left" ? `<button class="link-action" data-action="left-student" data-id="${student.id}">Mark left</button>` : ""}<button class="link-action danger" data-action="delete-student" data-id="${student.id}">Delete</button></div></td></tr>`).join("") : `<tr><td colspan="9">${empty("No dancers found", "Try another search, or add your first student.")}</td></tr>`}
    </tbody></table></div>`;
}

function classesPage() {
  const classes = [...state.classes].filter((item) => state.filterBranch === "all" || item.branchId === state.filterBranch).sort((a, b) => b.date.localeCompare(a.date));
  return `${titleBlock("Class calendar", "Set the date, and make room for the next adavu.", `<button class="button button-gold button-small" data-action="add-class">＋ Add class</button>`)}
    ${toolbar({ add: { action: "add-class", label: "Add class" } })}
    ${classes.length ? `<div class="class-cards">${classes.map((item) => `<article class="record-card"><div class="card-bottom"><span class="pill gold">${dateLabel(item.date)}</span><div class="row-actions"><button class="link-action" data-action="edit-class" data-id="${item.id}">Edit</button><button class="link-action danger" data-action="delete-class" data-id="${item.id}">Delete</button></div></div><h3>${esc(item.title || "Bharatanatyam class")}</h3><p>${esc(branchName(item.branchId))}${item.notes ? ` · ${esc(item.notes)}` : ""}</p><div class="card-bottom"><span class="activity-meta">${(item.attendance || []).filter((entry) => entry.present).length} present · ${(item.attendance || []).length} marked</span><button class="text-action" data-action="mark-attendance" data-id="${item.id}">Take attendance ↗</button></div></article>`).join("")}</div>` : empty("No classes on the calendar", "Add your first class date to begin.")}`;
}

function attendancePage() {
  const branchStudents = activeStudents()
    .filter((student) => state.filterBranch === "all" || student.branchId === state.filterBranch)
    .filter((student) => !state.query || student.name.toLowerCase().includes(state.query.toLowerCase().trim()));
  const monthFees = state.fees.filter((fee) => fee.month === state.feeMonth
    && (state.filterBranch === "all" || fee.branchId === state.filterBranch));
  const paidCount = branchStudents.filter((student) => monthFees.some((fee) => fee.studentId === student.id && fee.paid)).length;
  const branch = state.branches.find((entry) => entry.id === state.attendanceBranch);
  const attendanceStudents = activeStudents().filter((student) => student.branchId === state.attendanceBranch);
  const dailyRecord = state.attendance.find((record) => record.branchId === state.attendanceBranch && record.date === state.attendanceDate);
  const selectedBranch = state.branches.filter((entry) => entry.status !== "closed" || entry.id === state.attendanceBranch);
  return `${titleBlock("Fees & attendance", "A simple monthly fee list and a clear class register.")}
    <section class="panel"><div class="panel-head"><div><h2>Monthly fees</h2><p class="panel-note">Mark each student's fee paid or pending for the selected month.</p></div><span class="pill gold">${paidCount} / ${branchStudents.length} paid</span></div>
      <div class="register-toolbar">
        <label>Month<input type="month" value="${esc(state.feeMonth)}" data-action="fee-month"></label>
        ${branchSelect(state.filterBranch, "filter-branch", true)}
        <input type="search" placeholder="Find a student…" aria-label="Search fee register" value="${esc(state.query)}" data-action="search">
      </div>
      <div class="fee-register">${branchStudents.length ? branchStudents.map((student) => {
        const paid = monthFees.some((fee) => fee.studentId === student.id && fee.paid);
        const method = monthFees.find((fee) => fee.studentId === student.id && fee.paid)?.method;
        return `<div class="fee-row"><div><strong>${esc(student.name)}</strong><span>${esc(branchName(student.branchId))}</span></div><div class="fee-status-actions">${paid ? `<span class="fee-method">${method === "online" ? "Online" : "Cash"}</span>` : ""}<button class="fee-toggle ${paid ? "is-paid" : "is-pending"}" data-action="toggle-fee" data-id="${student.id}" aria-pressed="${paid}"><span class="fee-dot"></span>${paid ? "Paid" : "Pending"}</button></div></div>`;
      }).join("") : empty(branchStudents.length ? "No students found" : "No active students", "Add students to an open branch to see them here.")}</div>
      <p class="register-month">${monthLabel(state.feeMonth)} · ${paidCount} paid · ${branchStudents.length - paidCount} pending</p>
    </section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><div><h2>Class attendance</h2><p class="panel-note">Choose a branch and date, then mark each dancer present or absent.</p></div></div>
      <div class="register-toolbar">
        <label>Branch<select data-action="attendance-branch"><option value="">Choose a branch</option>${selectedBranch.map((entry) => `<option value="${esc(entry.id)}" ${state.attendanceBranch === entry.id ? "selected" : ""}>${esc(entry.name)}${entry.status === "closed" ? " (closed)" : ""}</option>`).join("")}</select></label>
        <label>Class date<input type="date" value="${esc(state.attendanceDate)}" data-action="attendance-date"></label>
        <span class="pill gold">${branch ? esc(branch.name) : "Select branch"} · ${attendanceStudents.length} students</span>
      </div>
      ${branch && attendanceStudents.length ? `<form id="attendance-form" class="attendance-register">${attendanceStudents.map((student) => {
        const saved = dailyRecord?.entries?.find((entry) => entry.studentId === student.id);
        const status = saved?.status || "absent";
        return `<div class="attendance-register-row"><div><strong>${esc(student.name)}</strong><span>${studentAge(student.dateOfBirth)}${student.place ? ` · ${esc(student.place)}` : ""}</span></div><div class="attendance-choice" role="group" aria-label="Attendance for ${esc(student.name)}"><label class="choice-present"><input type="radio" name="attendance-${esc(student.id)}" value="present" ${status === "present" ? "checked" : ""}><span>Present</span></label><label class="choice-absent"><input type="radio" name="attendance-${esc(student.id)}" value="absent" ${status === "absent" ? "checked" : ""}><span>Absent</span></label></div></div>`;
      }).join("")}<div class="attendance-save"><span class="form-error" aria-live="polite"></span><button class="button button-gold button-small" type="submit">Save attendance</button></div></form>` : empty(branch ? "No active students in this branch" : "Choose a branch", branch ? "Add students or check another branch." : "Select a branch to open its attendance list.")}
    </section>`;
}

function branchesPage() {
  return `${titleBlock("Our branches", "A home for every class and every dancer.", `<button class="button button-gold button-small" data-action="add-branch">＋ Add branch</button>`)}
    ${toolbar({ search: false, branch: false, add: { action: "add-branch", label: "Add branch" } })}
    ${state.branches.length ? `<div class="class-cards">${state.branches.map((branch) => {
      const studentCount = state.students.filter((student) => student.branchId === branch.id).length;
      const classCount = state.classes.filter((item) => item.branchId === branch.id).length;
      return `<article class="record-card"><div class="card-bottom"><span class="ornament">⌖</span><span class="pill ${branch.status === "closed" ? "" : "green"}">${branch.status === "closed" ? "Closed" : "Open"}</span></div><h3>${esc(branch.name)}</h3><p>Classes began ${dateLabel(branch.startDate)}${branch.closedAt ? ` · Closed ${dateLabel(branch.closedAt)}` : ""}</p><div class="card-bottom"><span class="activity-meta">${studentCount} students · ${classCount} classes</span><div class="row-actions"><button class="link-action" data-action="edit-branch" data-id="${branch.id}">Edit</button><button class="link-action" data-action="${branch.status === "closed" ? "reopen-branch" : "close-branch"}" data-id="${branch.id}">${branch.status === "closed" ? "Reopen" : "Close branch"}</button>${studentCount === 0 && classCount === 0 && !state.payments.some((payment) => payment.branchId === branch.id) ? `<button class="link-action danger" data-action="delete-branch" data-id="${branch.id}">Delete</button>` : ""}</div></div></article>`;
    }).join("")}</div>` : empty("No branches yet", "Add your first class branch.")}`;
}

function historyPage() {
  const matchesBranch = (item) => state.filterBranch === "all" || item.branchId === state.filterBranch;
  const closedBranches = state.branches.filter((branch) => branch.status === "closed" && (state.filterBranch === "all" || branch.id === state.filterBranch));
  const oldClasses = state.classes.filter((item) => item.date < todayIso() && matchesBranch(item)).sort((a, b) => b.date.localeCompare(a.date));
  const leftStudents = state.students.filter((student) => student.status === "left" && matchesBranch(student)).sort((a, b) => (b.leftAt || "").localeCompare(a.leftAt || ""));
  const payments = state.payments.filter(matchesBranch).sort((a, b) => b.date.localeCompare(a.date));
  const dailyAttendance = state.attendance.filter(matchesBranch).sort((a, b) => b.date.localeCompare(a.date));
  const fees = state.fees.filter(matchesBranch).sort((a, b) => b.month.localeCompare(a.month));
  return `${titleBlock("Class history", "Past classes, former students, attendance, and fee records.")}
    ${toolbar({ search: false, branch: true })}
    <section class="panel"><div class="panel-head"><h2>Closed branches</h2><span class="pill">${closedBranches.length} archived</span></div>
      ${closedBranches.length ? `<div class="branch-list">${closedBranches.map((branch) => `<div class="branch-row"><div><div class="branch-name">${esc(branch.name)}</div><div class="branch-meta">Opened ${dateLabel(branch.startDate)} · Closed ${dateLabel(branch.closedAt)}</div></div><span class="pill gold">${state.students.filter((student) => student.branchId === branch.id).length} students · ${state.classes.filter((item) => item.branchId === branch.id).length} classes</span></div>`).join("")}</div>` : empty("No closed branches", "When you close a branch, its records stay here.")}</section>
    <section class="panel"><div class="panel-head"><h2>Past classes & attendance</h2><span class="pill gold">${oldClasses.length} classes</span></div>
      ${oldClasses.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Class</th><th>Branch</th><th>Present</th><th>Attendance record</th></tr></thead><tbody>${oldClasses.map((item) => {
        const present = (item.attendance || []).filter((entry) => entry.present);
        const names = present.map((entry) => state.students.find((student) => student.id === entry.studentId)?.name).filter(Boolean);
        return `<tr><td>${dateLabel(item.date)}</td><td>${esc(item.title || "Bharatanatyam class")}</td><td>${esc(branchName(item.branchId))}</td><td>${present.length}</td><td>${names.length ? esc(names.join(", ")) : "No attendance saved"}</td></tr>`;
      }).join("")}</tbody></table></div>` : empty("No past classes yet", "Completed classes will appear here.")}</section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><h2>Former students</h2><span class="pill">${leftStudents.length} records</span></div>
      ${leftStudents.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Branch</th><th>Date joined</th><th>Left class</th></tr></thead><tbody>${leftStudents.map((student) => `<tr><td>${esc(student.name)}</td><td>${esc(branchName(student.branchId))}</td><td>${dateLabel(student.joinedAt)}</td><td>${dateLabel(student.leftAt)}</td></tr>`).join("")}</tbody></table></div>` : empty("No former students", "Students marked as left will be kept here.")}</section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><h2>Daily attendance register</h2><span class="pill">${dailyAttendance.length} registers</span></div>
      ${dailyAttendance.length ? `<div class="attendance-list">${dailyAttendance.map((record) => `<article class="history-register"><div class="card-bottom"><strong>${dateLabel(record.date)} · ${esc(branchName(record.branchId))}</strong><span class="pill green">${record.entries.filter((entry) => entry.status === "present").length} present</span></div><p>${record.entries.map((entry) => `${esc(entry.name)} — ${entry.status}`).join(" · ")}</p></article>`).join("")}</div>` : empty("No daily registers yet", "Saved branch attendance will appear here.")}</section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><h2>Monthly fee status history</h2><span class="pill">${fees.length} entries</span></div>
      ${fees.length ? `<div class="table-wrap"><table><thead><tr><th>Month</th><th>Student</th><th>Branch</th><th>Status</th><th>Payment method</th></tr></thead><tbody>${fees.map((fee) => `<tr><td>${monthLabel(fee.month)}</td><td>${esc(state.students.find((student) => student.id === fee.studentId)?.name || fee.studentName || "Former student")}</td><td>${esc(branchName(fee.branchId))}</td><td><span class="pill ${fee.paid ? "green" : "red"}">${fee.paid ? "Paid" : "Pending"}</span></td><td>${fee.paid ? esc(fee.method || "Not recorded") : "—"}</td></tr>`).join("")}</tbody></table></div>` : empty("No monthly fee statuses yet", "Monthly paid or pending changes will appear here.")}</section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><h2>Payment history</h2><span class="pill gold">${payments.length} payments</span></div>
      ${payments.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Date</th><th>Branch</th><th>Months</th><th>Received</th><th>Change</th><th>Balance</th></tr></thead><tbody>${payments.map((payment) => `<tr><td>${esc(state.students.find((student) => student.id === payment.studentId)?.name || "Former student")}</td><td>${dateLabel(payment.date)}</td><td>${esc(branchName(payment.branchId))}</td><td>${payment.months}</td><td>₹${Number(payment.amountReceived).toLocaleString("en-IN")}</td><td>₹${Number(payment.changeReturned || 0).toLocaleString("en-IN")}</td><td>₹${Number(payment.balance || 0).toLocaleString("en-IN")}</td></tr>`).join("")}</tbody></table></div>` : empty("No payments recorded", "Recorded payments will appear here.")}</section>`;
}

function render() {
  if (!state.user) return loginView();
  const pages = { overview: overviewPage, students: studentsPage, classes: classesPage, attendance: attendancePage, branches: branchesPage, history: historyPage };
  app.innerHTML = shell(pages[state.page]());
  document.querySelectorAll("[data-page]").forEach((element) => element.addEventListener("click", () => {
    state.page = element.dataset.page;
    state.query = "";
    document.querySelector(".sidebar")?.classList.remove("open");
    render();
  }));
  document.querySelectorAll("[data-action]").forEach((element) => {
    const action = element.dataset.action;
    if (action === "search") element.addEventListener("input", () => {
      state.query = element.value;
      const start = element.selectionStart;
      render();
      const replacement = document.querySelector('[data-action="search"]');
      replacement?.focus();
      replacement?.setSelectionRange(start, start);
    });
    else if (action === "filter") element.addEventListener("change", () => { state.filterBranch = element.value; render(); });
    else if (action === "fee-month") element.addEventListener("change", () => { state.feeMonth = element.value || todayMonth(); render(); });
    else if (action === "attendance-branch") element.addEventListener("change", () => { state.attendanceBranch = element.value; render(); });
    else if (action === "attendance-date") element.addEventListener("change", () => { state.attendanceDate = element.value || todayIso(); render(); });
    else if (action === "menu") element.addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
    else element.addEventListener("click", () => handleAction(action, element.dataset.id));
  });
  document.querySelector("#attendance-form")?.addEventListener("submit", saveDailyAttendance);
}

async function save(kind, id, payload) {
  const record = await api(`/api/data?kind=${kind}${id ? `&id=${encodeURIComponent(id)}` : ""}`, {
    method: id ? "PATCH" : "POST", body: JSON.stringify(payload)
  });
  const collection = state[kind];
  const index = collection.findIndex((item) => item.id === record.id);
  if (index >= 0) collection[index] = record; else collection.push(record);
  return record;
}

async function saveDailyAttendance(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const entries = activeStudents()
    .filter((student) => student.branchId === state.attendanceBranch)
    .map((student) => ({
      studentId: student.id,
      name: student.name,
      status: new FormData(form).get(`attendance-${student.id}`) || "absent"
    }));
  const existing = state.attendance.find((record) => record.branchId === state.attendanceBranch && record.date === state.attendanceDate);
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const record = await save("attendance", existing?.id, {
      branchId: state.attendanceBranch,
      date: state.attendanceDate,
      entries
    });
    const index = state.attendance.findIndex((entry) => entry.id === record.id);
    if (index >= 0) state.attendance[index] = record;
    else state.attendance.push(record);
    render();
    toast("Attendance saved to the branch history.");
  } catch (error) {
    form.querySelector(".form-error").textContent = error.message;
    button.disabled = false;
  }
}

async function toggleMonthlyFee(student, paid, method = "") {
  const existing = state.fees.find((fee) => fee.studentId === student.id && fee.month === state.feeMonth);
  const record = await save("fees", existing?.id, {
    studentId: student.id,
    studentName: student.name,
    branchId: student.branchId,
    month: state.feeMonth,
    paid,
    method
  });
  const index = state.fees.findIndex((fee) => fee.id === record.id);
  if (index >= 0) state.fees[index] = record;
  else state.fees.push(record);
}

function chooseFeeMethod(student) {
  const existing = state.fees.find((fee) => fee.studentId === student.id && fee.month === state.feeMonth);
  openDialog(`Mark ${student.name}'s fee paid`, [
    { name: "method", label: "Payment method", type: "select", required: true, options: [["cash", "Cash"], ["online", "Online"]] }
  ], { method: existing?.method || "cash" }, async ({ method }) => {
    await toggleMonthlyFee(student, true, method);
  }, "Mark as paid");
}

function openDialog(title, fields, initial = {}, onSave, submitLabel = "Save details") {
  const html = fields.map((field) => {
    const value = initial[field.name] ?? field.default ?? "";
    const full = field.full ? "full" : "";
    if (field.type === "select") return `<label class="${full}">${field.label}<select name="${field.name}" ${field.required ? "required" : ""}>${field.options.map(([key, label]) => `<option value="${esc(key)}" ${String(value) === String(key) ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>`;
    return `<label class="${full}">${field.label}<input name="${field.name}" type="${field.type || "text"}" value="${esc(value)}" ${field.required ? "required" : ""} ${field.placeholder ? `placeholder="${esc(field.placeholder)}"` : ""}></label>`;
  }).join("");
  app.insertAdjacentHTML("beforeend", `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="dialog-close" data-action="close-dialog" aria-label="Close">×</button></div><form class="dialog-form">${html}<p class="form-error" aria-live="polite"></p><div class="form-actions"><button type="button" class="button button-quiet button-small" data-action="close-dialog">Cancel</button><button type="submit" class="button button-gold button-small">${submitLabel}</button></div></form></section></div>`);
  const overlay = document.querySelector(".overlay");
  overlay.querySelectorAll('[data-action="close-dialog"]').forEach((button) => button.addEventListener("click", () => overlay.remove()));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
  overlay.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await onSave(Object.fromEntries(new FormData(form)));
      overlay.remove();
      render();
      toast("Your class records are in step.");
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
      submit.disabled = false;
    }
  });
}

function branchOptions(currentBranchId = "") {
  return state.branches
    .filter((branch) => branch.status !== "closed" || branch.id === currentBranchId)
    .map((branch) => [branch.id, `${branch.name}${branch.status === "closed" ? " (closed)" : ""}`]);
}

async function handleAction(action, id) {
  const student = state.students.find((item) => item.id === id);
  const branch = state.branches.find((item) => item.id === id);
  const item = state.classes.find((record) => record.id === id);
  if (action === "toggle-fee" && student) {
    const fee = state.fees.find((entry) => entry.studentId === student.id && entry.month === state.feeMonth);
    if (fee?.paid) {
      try {
        await toggleMonthlyFee(student, false);
        render();
        toast("Fee marked pending.");
      } catch (error) {
        toast(error.message);
      }
    } else chooseFeeMethod(student);
  } else if (action === "logout") {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    state.user = null; state.branches = []; state.students = []; state.classes = []; state.payments = []; state.fees = []; state.attendance = [];
    loginView();
  } else if (action === "add-student" || action === "edit-student") {
    if (action === "edit-student" && !student) return;
    if (!state.branches.some((entry) => entry.status !== "closed")) return toast("Please open a branch before adding students.");
    openDialog(action === "edit-student" ? "Edit student details" : "Welcome a new dancer", [
      { name: "name", label: "Student name", required: true },
      { name: "dateOfBirth", label: "Date of birth", type: "date" },
      { name: "place", label: "Place / locality", placeholder: "Optional" },
      { name: "parentName", label: "Parent name", placeholder: "Optional" },
      { name: "phone", label: "Parent / WhatsApp number", type: "tel", placeholder: "Optional" },
      { name: "whatsappGroup", label: "In WhatsApp group?", type: "select", options: [["false", "No"], ["true", "Yes"]] },
      { name: "branchId", label: "Branch", type: "select", required: true, options: branchOptions(student?.branchId) },
      { name: "joinedAt", label: "Date joined", type: "date", required: true, default: todayIso() }
    ], { whatsappGroup: "false", ...student }, async (values) => save("students", student?.id, {
      ...student,
      ...values,
      whatsappGroup: values.whatsappGroup === "true",
      status: student?.status || "active",
      leftAt: student?.leftAt || ""
    }));
  } else if (action === "left-student" && student) {
    if (!confirm(`Mark ${student.name} as having left class? Their record will be kept.`)) return;
    await save("students", student.id, { ...student, status: "left", leftAt: todayIso() });
    render(); toast("Student marked as left; their history is preserved.");
  } else if (action === "delete-student" && student) {
    if (!confirm(`Permanently delete ${student.name}'s record?`)) return;
    await api(`/api/data?kind=students&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    state.students = state.students.filter((record) => record.id !== id);
    render(); toast("Student record deleted.");
  } else if (action === "add-branch" || action === "edit-branch") {
    if (action === "edit-branch" && !branch) return;
    openDialog(action === "edit-branch" ? "Edit branch" : "Open a new branch", [
      { name: "name", label: "Branch name", required: true },
      { name: "startDate", label: "Classes began", type: "date", required: true, default: todayIso() }
    ], branch || {}, async (values) => save("branches", branch?.id, { ...branch, ...values, status: branch?.status || "open" }));
  } else if ((action === "close-branch" || action === "reopen-branch") && branch) {
    const closing = action === "close-branch";
    if (!confirm(`${closing ? "Close" : "Reopen"} ${branch.name}? ${closing ? "Its students, classes, and payment history will be kept; no new students or classes can be added." : "New students and classes can be added again."}`)) return;
    await save("branches", branch.id, {
      ...branch,
      status: closing ? "closed" : "open",
      closedAt: closing ? todayIso() : ""
    });
    render();
    toast(closing ? "Branch closed. Its history is preserved." : "Branch reopened.");
  } else if (action === "delete-branch" && branch) {
    if (state.students.some((entry) => entry.branchId === id) || state.classes.some((entry) => entry.branchId === id)
      || state.payments.some((entry) => entry.branchId === id) || state.fees.some((entry) => entry.branchId === id)
      || state.attendance.some((entry) => entry.branchId === id)) return toast("This branch has history. Close it instead to preserve its records.");
    if (!confirm(`Delete the ${branch.name} branch?`)) return;
    await api(`/api/data?kind=branches&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    state.branches = state.branches.filter((entry) => entry.id !== id);
    render(); toast("Branch deleted.");
  } else if (action === "add-class" || action === "edit-class") {
    if (action === "edit-class" && !item) return;
    if (!state.branches.some((entry) => entry.status !== "closed")) return toast("Please open a branch before scheduling a class.");
    openDialog(action === "edit-class" ? "Edit class" : "Add a class date", [
      { name: "title", label: "Class title", placeholder: "e.g. Saturday practice" },
      { name: "date", label: "Class date", type: "date", required: true, default: todayIso() },
      { name: "branchId", label: "Branch", type: "select", required: true, options: branchOptions(item?.branchId) },
      { name: "notes", label: "Notes", full: true, placeholder: "Optional details" }
    ], item || {}, async (values) => save("classes", item?.id, { ...item, ...values, attendance: item?.attendance || [] }));
  } else if (action === "delete-class" && item) {
    if (!confirm("Delete this class and its attendance record?")) return;
    await api(`/api/data?kind=classes&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    state.classes = state.classes.filter((entry) => entry.id !== id);
    render(); toast("Class deleted.");
  } else if (action === "mark-attendance" && item) {
    const students = activeStudents().filter((entry) => entry.branchId === item.branchId);
    if (!students.length) return toast("There are no active students at this branch yet.");
    const attendance = item.attendance || [];
    const fields = students.map((entry) => ({
      name: `present:${entry.id}`, label: entry.name, type: "select",
      options: [["absent", "Not marked / absent"], ["present", "Present"]],
      default: attendance.find((record) => record.studentId === entry.id)?.present ? "present" : "absent"
    }));
    openDialog(`Attendance · ${dateLabel(item.date)}`, fields, {}, async (values) => {
      const next = students.map((entry) => ({ studentId: entry.id, present: values[`present:${entry.id}`] === "present" }));
      await save("classes", item.id, { ...item, attendance: next });
    }, "Save attendance");
  }
}

async function start() {
  try {
    const result = await api("/api/auth/me");
    if (result.authenticated) {
      state.user = true;
      await loadData();
      render();
    } else loginView();
  } catch {
    loginView("Could not reach the portal API. Check the local Vercel server and Supabase setup.");
  }
}

start();
