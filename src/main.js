const app = document.querySelector("#app");
const state = { user: null, page: "overview", branches: [], students: [], classes: [], payments: [], query: "", filterBranch: "all" };
const nav = [
  ["overview", "⌂", "Overview"],
  ["students", "♙", "Students"],
  ["classes", "◷", "Classes"],
  ["attendance", "◉", "Attendance & fees"],
  ["branches", "⌖", "Branches"],
  ["history", "↺", "History"]
];

const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const branchName = (id) => state.branches.find((branch) => branch.id === id)?.name || "Unassigned";
const activeStudents = () => state.students.filter((student) => student.status !== "left");
const todayIso = () => new Date().toISOString().slice(0, 10);

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
    <div class="brand-mark" aria-hidden="true">नृत्य</div><p class="eyebrow">A Bharatanatyam studio</p>
    <h1>Welcome, teacher</h1><p class="muted">Sign in to your class sanctuary.</p>
    <form id="login-form" class="stack">
      <label>Admin username<input name="username" autocomplete="username" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-error" aria-live="polite">${esc(error)}</p>
      <button class="button button-gold" type="submit">Enter the studio <span>↗</span></button>
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
  const [branches, students, classes, payments] = await Promise.all([
    api("/api/data?kind=branches"), api("/api/data?kind=students"), api("/api/data?kind=classes"), api("/api/data?kind=payments")
  ]);
  state.branches = branches;
  state.students = students;
  state.classes = classes;
  state.payments = payments;
}

function titleBlock(title, subtitle, button = "") {
  return `<div class="page-title"><div><h1>${title}</h1><p>${subtitle}</p></div><span class="ornament" aria-hidden="true">❋</span>${button}</div>`;
}

function shell(content) {
  return `<div class="shell">
    <aside class="sidebar">
      <div class="side-brand"><div class="brand-mark">नृत्य</div><p class="eyebrow">Bharatanatyam studio</p></div>
      <p class="nav-caption">Your sanctuary</p>
      <nav class="nav-list" aria-label="Main navigation">${nav.map(([id, icon, name]) => `<button class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span>${name}</button>`).join("")}</nav>
      <div class="sidebar-foot"><div class="teacher">Bhargavi</div><p class="teacher-note">Studio administrator</p><button class="logout" data-action="logout">↗ &nbsp;Sign out</button></div>
    </aside>
    <main class="main">
      <div class="topline"><div style="display:flex;align-items:center"><button class="nav-toggle" data-action="menu" aria-label="Open navigation">☰</button><p class="eyebrow">Namaskaram, Bhargavi</p></div><span class="today">${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span></div>
      ${content}
    </main>
  </div>`;
}

function overviewPage() {
  const active = activeStudents();
  const outstanding = active.filter((student) => student.feeStatus !== "paid").length;
  const nextClass = [...state.classes].filter((item) => item.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const openBranches = state.branches.filter((branch) => branch.status !== "closed");
  const stats = [["Active students", active.filter((student) => openBranches.some((branch) => branch.id === student.branchId)).length], ["Open branches", openBranches.length], ["Classes scheduled", state.classes.filter((item) => item.date >= todayIso()).length], ["Fees to follow up", outstanding]];
  return `${titleBlock("Studio at a glance", "A graceful little overview of your growing practice.")}
    <section class="stats">${stats.map(([label, value]) => `<article class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></article>`).join("")}</section>
    <div class="grid-two">
      <section class="panel"><div class="panel-head"><h2>Your branches</h2><button class="text-action" data-page="branches">Manage branches ↗</button></div>
        <div class="branch-list">${state.branches.length ? state.branches.map((branch) => `<div class="branch-row"><div><div class="branch-name">${esc(branch.name)}</div><div class="branch-meta">Classes began ${dateLabel(branch.startDate)}${branch.closedAt ? ` · Closed ${dateLabel(branch.closedAt)}` : ""}</div></div><span class="pill ${branch.status === "closed" ? "" : "gold"}">${branch.status === "closed" ? "Closed" : `${active.filter((s) => s.branchId === branch.id).length} students`}</span></div>`).join("") : empty("Your first branch is waiting", "Create a branch to get started.")}</div>
      </section>
      <section class="panel"><div class="panel-head"><h2>Coming up</h2><button class="text-action" data-page="classes">All classes ↗</button></div>
        ${nextClass ? `<div class="activity-row"><div><div class="activity-name">${esc(nextClass.title || "Bharatanatyam class")}</div><div class="activity-meta">${dateLabel(nextClass.date)} · ${esc(branchName(nextClass.branchId))}</div></div><span class="pill gold">${(nextClass.attendance || []).length} marked</span></div>` : empty("A quiet calendar", "Add a class date to fill it with rhythm.")}
      </section>
      <section class="panel"><div class="panel-head"><h2>Fee follow-up</h2><button class="text-action" data-page="attendance">Open register ↗</button></div>
        ${outstanding ? `<div class="activity-list">${active.filter((student) => student.feeStatus !== "paid").slice(0, 5).map((student) => `<div class="activity-row"><div><div class="activity-name">${esc(student.name)}</div><div class="activity-meta">${esc(branchName(student.branchId))}</div></div><span class="pill red">Pending</span></div>`).join("")}</div>` : empty("All caught up", "No outstanding class fees.")}
      </section>
      <section class="panel"><div class="panel-head"><h2>A small welcome</h2><span class="ornament">❋</span></div><p class="muted" style="font-family:'Cormorant Garamond',serif;font-size:20px;line-height:1.45;margin:0">“Where the hands speak, the eyes follow; where the eyes go, the mind follows.”</p><p class="branch-meta" style="margin-top:12px">Natyashastra</p></section>
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
    const matchesText = !query || `${student.name} ${student.phone || ""} ${student.guardian || ""}`.toLowerCase().includes(query);
    const matchesBranch = state.filterBranch === "all" || student.branchId === state.filterBranch;
    return matchesText && matchesBranch;
  });
}

function studentsPage() {
  const rows = filteredStudents();
  return `${titleBlock("Our students", "Every dancer, every step of the journey.", `<button class="button button-gold button-small" data-action="add-student">＋ Add student</button>`)}
    ${toolbar({ add: { action: "add-student", label: "Add student" } })}
    <div class="table-wrap"><table><thead><tr><th>Student</th><th>Branch</th><th>Date joined</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map((student) => `<tr><td><strong>${esc(student.name)}</strong></td><td>${esc(branchName(student.branchId))}</td><td>${dateLabel(student.joinedAt)}</td><td>${esc(student.phone || "—")}</td><td><span class="pill ${student.status === "left" ? "red" : "green"}">${student.status === "left" ? `Left ${dateLabel(student.leftAt)}` : "Active"}</span></td><td><div class="row-actions"><button class="link-action" data-action="edit-student" data-id="${student.id}">Edit</button>${student.status !== "left" ? `<button class="link-action" data-action="left-student" data-id="${student.id}">Mark left</button>` : ""}<button class="link-action danger" data-action="delete-student" data-id="${student.id}">Delete</button></div></td></tr>`).join("") : `<tr><td colspan="6">${empty("No dancers found", "Try another search, or add your first student.")}</td></tr>`}
    </tbody></table></div>`;
}

function classesPage() {
  const classes = [...state.classes].filter((item) => state.filterBranch === "all" || item.branchId === state.filterBranch).sort((a, b) => b.date.localeCompare(a.date));
  return `${titleBlock("Class calendar", "Set the date, and make room for the next adavu.", `<button class="button button-gold button-small" data-action="add-class">＋ Add class</button>`)}
    ${toolbar({ add: { action: "add-class", label: "Add class" } })}
    ${classes.length ? `<div class="class-cards">${classes.map((item) => `<article class="record-card"><div class="card-bottom"><span class="pill gold">${dateLabel(item.date)}</span><div class="row-actions"><button class="link-action" data-action="edit-class" data-id="${item.id}">Edit</button><button class="link-action danger" data-action="delete-class" data-id="${item.id}">Delete</button></div></div><h3>${esc(item.title || "Bharatanatyam class")}</h3><p>${esc(branchName(item.branchId))}${item.notes ? ` · ${esc(item.notes)}` : ""}</p><div class="card-bottom"><span class="activity-meta">${(item.attendance || []).filter((entry) => entry.present).length} present · ${(item.attendance || []).length} marked</span><button class="text-action" data-action="mark-attendance" data-id="${item.id}">Take attendance ↗</button></div></article>`).join("")}</div>` : empty("No classes on the calendar", "Add your first class date to begin.")}`;
}

function attendancePage() {
  const students = activeStudents().filter((student) => state.filterBranch === "all" || student.branchId === state.filterBranch);
  const query = state.query.toLowerCase().trim();
  const matching = students.filter((student) => student.name.toLowerCase().includes(query));
  const payments = [...state.payments].filter((payment) => state.filterBranch === "all" || payment.branchId === state.filterBranch).sort((a, b) => b.date.localeCompare(a.date));
  return `${titleBlock("Attendance & fees", "Keep the class register and fee status in one place.")}
    ${toolbar({ search: true, branch: true })}
    <section class="panel"><div class="panel-head"><h2>Current student register</h2><span class="pill gold">${matching.length} dancers</span></div>
    ${matching.length ? `<div class="attendance-list">${matching.map((student) => `<div class="attendance-entry"><strong>${esc(student.name)}</strong><span class="attendance-date">${esc(branchName(student.branchId))} · ${student.monthlyFee ? `₹${Number(student.monthlyFee).toLocaleString("en-IN")}/month` : "Fee not set"}</span><span class="pill ${student.feeStatus === "paid" ? "green" : "red"}">${student.feeStatus === "paid" ? "Paid" : "Pending"}</span><button class="link-action" data-action="record-payment" data-id="${student.id}">Record payment</button></div>`).join("")}</div>` : empty("No students in this view", "Add a student or choose another branch.")}</section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><h2>Recent payments</h2><span class="pill gold">${payments.length} recorded</span></div>
    ${payments.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Date</th><th>Months covered</th><th>Fee due</th><th>Amount received</th><th>Change returned</th><th>Status</th></tr></thead><tbody>${payments.slice(0, 30).map((payment) => `<tr><td>${esc(state.students.find((student) => student.id === payment.studentId)?.name || "Former student")}</td><td>${dateLabel(payment.date)}</td><td>${payment.months}</td><td>₹${Number(payment.amountDue).toLocaleString("en-IN")}</td><td>₹${Number(payment.amountReceived).toLocaleString("en-IN")}</td><td>₹${Number(payment.changeReturned || 0).toLocaleString("en-IN")}</td><td><span class="pill ${payment.status === "paid" ? "green" : "red"}">${payment.status === "paid" ? "Paid" : "Balance pending"}</span></td></tr>`).join("")}</tbody></table></div>` : empty("No payments recorded yet", "Record a payment from a student's register entry.")}</section>
    <section class="panel" style="margin-top:15px"><div class="panel-head"><h2>Mark class attendance</h2><span class="pill">${state.classes.length} classes</span></div>
    ${state.classes.length ? `<div class="attendance-list">${[...state.classes].sort((a, b) => b.date.localeCompare(a.date)).map((item) => `<div class="attendance-entry"><strong>${esc(item.title || "Bharatanatyam class")}</strong><span class="attendance-date">${dateLabel(item.date)} · ${esc(branchName(item.branchId))}</span><span class="pill">${(item.attendance || []).filter((entry) => entry.present).length} present</span><button class="link-action" data-action="mark-attendance" data-id="${item.id}">Take register ↗</button></div>`).join("")}</div>` : empty("No class dates yet", "Add a class before taking attendance.")}</section>`;
}

function branchesPage() {
  return `${titleBlock("Our branches", "A home for every class and every dancer.", `<button class="button button-gold button-small" data-action="add-branch">＋ Add branch</button>`)}
    ${toolbar({ search: false, branch: false, add: { action: "add-branch", label: "Add branch" } })}
    ${state.branches.length ? `<div class="class-cards">${state.branches.map((branch) => {
      const studentCount = state.students.filter((student) => student.branchId === branch.id).length;
      const classCount = state.classes.filter((item) => item.branchId === branch.id).length;
      return `<article class="record-card"><div class="card-bottom"><span class="ornament">⌖</span><span class="pill ${branch.status === "closed" ? "" : "green"}">${branch.status === "closed" ? "Closed" : "Open"}</span></div><h3>${esc(branch.name)}</h3><p>Classes began ${dateLabel(branch.startDate)}${branch.closedAt ? ` · Closed ${dateLabel(branch.closedAt)}` : ""}</p><div class="card-bottom"><span class="activity-meta">${studentCount} students · ${classCount} classes</span><div class="row-actions"><button class="link-action" data-action="edit-branch" data-id="${branch.id}">Edit</button><button class="link-action" data-action="${branch.status === "closed" ? "reopen-branch" : "close-branch"}" data-id="${branch.id}">${branch.status === "closed" ? "Reopen" : "Close branch"}</button>${studentCount === 0 && classCount === 0 && !state.payments.some((payment) => payment.branchId === branch.id) ? `<button class="link-action danger" data-action="delete-branch" data-id="${branch.id}">Delete</button>` : ""}</div></div></article>`;
    }).join("")}</div>` : empty("No branches yet", "Add your first studio branch.")}`;
}

function historyPage() {
  const matchesBranch = (item) => state.filterBranch === "all" || item.branchId === state.filterBranch;
  const closedBranches = state.branches.filter((branch) => branch.status === "closed" && (state.filterBranch === "all" || branch.id === state.filterBranch));
  const oldClasses = state.classes.filter((item) => item.date < todayIso() && matchesBranch(item)).sort((a, b) => b.date.localeCompare(a.date));
  const leftStudents = state.students.filter((student) => student.status === "left" && matchesBranch(student)).sort((a, b) => (b.leftAt || "").localeCompare(a.leftAt || ""));
  const payments = state.payments.filter(matchesBranch).sort((a, b) => b.date.localeCompare(a.date));
  return `${titleBlock("Studio history", "Past classes, former students, and every recorded payment.")}
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
    else if (action === "menu") element.addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
    else element.addEventListener("click", () => handleAction(action, element.dataset.id));
  });
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
      toast("Your studio records are in step.");
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
  if (action === "logout") {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    state.user = null; state.branches = []; state.students = []; state.classes = []; state.payments = [];
    loginView();
  } else if (action === "add-student" || action === "edit-student") {
    if (action === "edit-student" && !student) return;
    if (!state.branches.some((entry) => entry.status !== "closed")) return toast("Please open a branch before adding students.");
    openDialog(action === "edit-student" ? "Edit student details" : "Welcome a new dancer", [
      { name: "name", label: "Student name", required: true },
      { name: "phone", label: "Phone number", placeholder: "Optional" },
      { name: "guardian", label: "Parent / guardian", placeholder: "Optional" },
      { name: "branchId", label: "Branch", type: "select", required: true, options: branchOptions(student?.branchId) },
      { name: "joinedAt", label: "Date joined", type: "date", required: true, default: todayIso() },
      { name: "monthlyFee", label: "Monthly fee (₹)", type: "number", placeholder: "0", default: "0" },
      { name: "feeStatus", label: "Fee status", type: "select", options: [["pending", "Fee pending"], ["paid", "Fee paid"]] }
    ], student || {}, async (values) => save("students", student?.id, { ...student, ...values, monthlyFee: Number(values.monthlyFee || 0), status: student?.status || "active", leftAt: student?.leftAt || "" }));
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
    if (state.students.some((entry) => entry.branchId === id) || state.classes.some((entry) => entry.branchId === id) || state.payments.some((entry) => entry.branchId === id)) return toast("This branch has history. Close it instead to preserve its records.");
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
  } else if (action === "record-payment" && student) {
    if (!(Number(student.monthlyFee) > 0)) return toast("Add this student's monthly fee in their details before recording payment.");
    paymentDialog(student);
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

function paymentDialog(student) {
  const monthlyFee = Number(student.monthlyFee);
  const previousPayments = state.payments.filter((payment) => payment.studentId === student.id);
  const previousBalance = Number(previousPayments.at(-1)?.balance || 0);
  app.insertAdjacentHTML("beforeend", `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <div class="dialog-head"><h2 id="dialog-title">Record a fee payment</h2><button class="dialog-close" data-action="close-payment" aria-label="Close">×</button></div>
    <p class="muted" style="margin:0 0 16px;font-size:12px">${esc(student.name)} · ₹${monthlyFee.toLocaleString("en-IN")} per month</p>
    <form class="dialog-form">
      <label>Months covered<select name="months"><option value="1">1 month</option><option value="2">2 months together</option><option value="3">3 months</option></select></label>
      <label>Date received<input name="date" type="date" value="${todayIso()}" required></label>
      <label class="full">Amount received (₹)<input name="amountReceived" type="number" min="0.01" step="0.01" placeholder="Enter amount received" required></label>
      <div class="payment-summary full" aria-live="polite"></div>
      <p class="form-error" aria-live="polite"></p>
      <div class="form-actions"><button type="button" class="button button-quiet button-small" data-action="close-payment">Cancel</button><button type="submit" class="button button-gold button-small">Save payment</button></div>
    </form>
  </section></div>`);
  const overlay = document.querySelector(".overlay");
  const form = overlay.querySelector("form");
  const summary = form.querySelector(".payment-summary");
  const updateSummary = () => {
    const tuitionDue = monthlyFee * Number(form.elements.months.value);
    const due = tuitionDue + previousBalance;
    const received = Number(form.elements.amountReceived.value || 0);
    const change = Math.max(0, received - due);
    const balance = Math.max(0, due - received);
    summary.innerHTML = `${previousBalance ? `<div>Previous balance <strong>₹${previousBalance.toLocaleString("en-IN")}</strong></div>` : ""}<div>Fee due <strong>₹${due.toLocaleString("en-IN")}</strong></div><div>Change to return <strong>₹${change.toLocaleString("en-IN")}</strong></div>${balance ? `<div>Balance remaining <strong>₹${balance.toLocaleString("en-IN")}</strong></div>` : ""}`;
  };
  overlay.querySelectorAll('[data-action="close-payment"]').forEach((button) => button.addEventListener("click", () => overlay.remove()));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
  form.addEventListener("input", updateSummary);
  form.addEventListener("change", updateSummary);
  updateSummary();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const months = Number(form.elements.months.value);
    const amountReceived = Number(form.elements.amountReceived.value);
    const tuitionDue = monthlyFee * months;
    const amountDue = tuitionDue + previousBalance;
    if (!(amountReceived > 0)) {
      form.querySelector(".form-error").textContent = "Enter an amount greater than zero.";
      return;
    }
    submit.disabled = true;
    try {
      const status = amountReceived >= amountDue ? "paid" : "pending";
      await save("payments", null, {
        studentId: student.id,
        branchId: student.branchId,
        date: form.elements.date.value,
        months,
        monthlyFee,
        tuitionDue,
        previousBalance,
        amountDue,
        amountReceived,
        amountPaid: Math.min(amountDue, amountReceived),
        changeReturned: Math.max(0, amountReceived - amountDue),
        balance: Math.max(0, amountDue - amountReceived),
        status
      });
      await save("students", student.id, { ...student, feeStatus: status });
      overlay.remove();
      render();
      toast(status === "paid" ? "Payment recorded; change returned is shown in the register." : "Partial payment recorded; the remaining balance is pending.");
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
      submit.disabled = false;
    }
  });
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
