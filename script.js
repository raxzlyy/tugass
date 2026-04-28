const STORAGE_KEYS = {
  tasks: "studymate-tasks",
  schedules: "studymate-schedules",
  alarms: "studymate-alarms"
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const memoryStore = {};

const state = {
  tasks: loadData(STORAGE_KEYS.tasks),
  schedules: loadData(STORAGE_KEYS.schedules),
  alarms: loadData(STORAGE_KEYS.alarms)
};

const navButtons = document.querySelectorAll("[data-screen]");
const screenPanels = document.querySelectorAll("[data-screen-panel]");
const screenTitle = document.getElementById("screenTitle");
const notifyButton = document.getElementById("notifyButton");
const liveClock = document.getElementById("liveClock");
const liveDate = document.getElementById("liveDate");
const appNotice = document.getElementById("appNotice");

const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskEmptyState = document.getElementById("taskEmptyState");
const taskCount = document.getElementById("taskCount");
const taskTemplate = document.getElementById("taskTemplate");

const scheduleForm = document.getElementById("scheduleForm");
const scheduleBoard = document.getElementById("scheduleBoard");
const scheduleCount = document.getElementById("scheduleCount");
const scheduleEditId = document.getElementById("scheduleEditId");
const cancelScheduleEdit = document.getElementById("cancelScheduleEdit");

const alarmForm = document.getElementById("alarmForm");
const alarmList = document.getElementById("alarmList");
const alarmEmptyState = document.getElementById("alarmEmptyState");
const alarmCount = document.getElementById("alarmCount");
const alarmTemplate = document.getElementById("alarmTemplate");

const searchForm = document.getElementById("searchForm");
const openChatGPTButton = document.getElementById("openChatGPT");
const browserFrame = document.getElementById("browserFrame");
const browserStatus = document.getElementById("browserStatus");
const browserBack = document.getElementById("browserBack");
const browserForward = document.getElementById("browserForward");
const browserHome = document.getElementById("browserHome");
const browserOpenExternal = document.getElementById("browserOpenExternal");

let browserCurrentUrl = "";

initialize();

function initialize() {
  seedDefaultSchedules();
  setDefaultTaskDateTime();
  setDefaultAlarmDateTime();
  bindEvents();
  updateClock();
  renderAll();
  updateNotificationButton();
  checkReminders();
  window.setInterval(updateClock, 1000);
  window.setInterval(checkReminders, 30000);
}

function bindEvents() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => activateScreen(button.dataset.screen));
  });

  document.querySelectorAll("[data-screen-jump]").forEach((button) => {
    button.addEventListener("click", () => activateScreen(button.dataset.screenJump));
  });

  document.querySelectorAll("[data-url]").forEach((button) => {
    button.addEventListener("click", () => loadBrowserUrl(button.dataset.url));
  });

  taskForm.addEventListener("submit", handleTaskSubmit);
  scheduleForm.addEventListener("submit", handleScheduleSubmit);
  cancelScheduleEdit.addEventListener("click", resetScheduleForm);
  alarmForm.addEventListener("submit", handleAlarmSubmit);
  searchForm.addEventListener("submit", handleGoogleSearch);
  openChatGPTButton.addEventListener("click", () => loadBrowserUrl("https://chat.openai.com"));
  notifyButton.addEventListener("click", requestNotifications);
  browserBack.addEventListener("click", handleBrowserBack);
  browserForward.addEventListener("click", handleBrowserForward);
  browserHome.addEventListener("click", handleBrowserHome);
  browserOpenExternal.addEventListener("click", () => {
    if (browserCurrentUrl) {
      openExternalUrl(browserCurrentUrl);
    }
  });
}

function activateScreen(screen) {
  const titleMap = {
    home: "Home",
    tasks: "Tugas",
    schedule: "Jadwal",
    alarms: "Alarm",
    ai: "AI / Search"
  };

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === screen);
  });

  screenPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.screenPanel === screen);
  });

  screenTitle.textContent = titleMap[screen] || "Home";
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const formData = new FormData(taskForm);
  const title = toText(formData.get("title"));
  const description = toText(formData.get("description"));
  const date = toText(formData.get("date"));
  const time = toText(formData.get("time"));
  const remindAt = new Date(`${date}T${time}`);

  if (!title || Number.isNaN(remindAt.getTime())) {
    showInlineMessage("Isi judul, tanggal, dan waktu tugas dengan benar.");
    return;
  }

  state.tasks.unshift({
    id: createId(),
    title,
    description,
    remindAt: remindAt.toISOString(),
    completed: false,
    notified: false
  });

  saveData(STORAGE_KEYS.tasks, state.tasks);
  taskForm.reset();
  setDefaultTaskDateTime();
  renderTasks();
  renderHomeMetrics();
}

function handleScheduleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(scheduleForm);
  const entry = {
    id: scheduleEditId.value || createId(),
    day: toText(formData.get("day")),
    period: toText(formData.get("period")),
    teacher: toText(formData.get("teacher")),
    time: toText(formData.get("time"))
  };

  if (!entry.day || !entry.period || !entry.teacher || !entry.time) {
    showInlineMessage("Lengkapi semua kolom jadwal terlebih dahulu.");
    return;
  }

  if (scheduleEditId.value) {
    state.schedules = state.schedules.map((item) => (item.id === entry.id ? entry : item));
  } else {
    state.schedules.push(entry);
  }

  saveData(STORAGE_KEYS.schedules, state.schedules);
  resetScheduleForm();
  renderSchedules();
  renderHomeMetrics();
}

function handleAlarmSubmit(event) {
  event.preventDefault();

  const formData = new FormData(alarmForm);
  const label = toText(formData.get("label"));
  const date = toText(formData.get("date"));
  const time = toText(formData.get("time"));
  const remindAt = new Date(`${date}T${time}`);

  if (!label || Number.isNaN(remindAt.getTime())) {
    showInlineMessage("Isi judul, tanggal, dan waktu alarm dengan benar.");
    return;
  }

  state.alarms.unshift({
    id: createId(),
    label,
    remindAt: remindAt.toISOString(),
    fired: false
  });

  saveData(STORAGE_KEYS.alarms, state.alarms);
  alarmForm.reset();
  setDefaultAlarmDateTime();
  renderAlarms();
  renderHomeMetrics();
}

function handleGoogleSearch(event) {
  event.preventDefault();
  const query = toText(document.getElementById("searchQuery").value);
  const url = query
    ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
    : "https://www.google.com";
  loadBrowserUrl(url);
}

function renderAll() {
  renderTasks();
  renderSchedules();
  renderAlarms();
  renderHomeMetrics();
}

function renderTasks() {
  taskList.innerHTML = "";
  const sortedTasks = state.tasks
    .slice()
    .sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));

  taskEmptyState.hidden = sortedTasks.length !== 0;
  taskCount.textContent = `${sortedTasks.length} tugas`;

  sortedTasks.forEach((task) => {
    const fragment = taskTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".list-card");
    const title = fragment.querySelector(".list-card-title");
    const copy = fragment.querySelector(".list-card-copy");
    const meta = fragment.querySelector(".list-card-meta");
    const status = fragment.querySelector(".badge-status");
    const completeButton = fragment.querySelector(".complete-action");
    const deleteButton = fragment.querySelector(".delete-action");

    const remindAt = new Date(task.remindAt);
    const overdue = remindAt < new Date() && !task.completed;

    title.textContent = task.title;
    copy.textContent = task.description || "Tanpa catatan tambahan.";
    meta.textContent = `Pengingat: ${formatDateTime(remindAt)}`;
    status.textContent = task.completed ? "Selesai" : overdue ? "Terlewat" : "Aktif";
    completeButton.textContent = task.completed ? "Aktifkan Lagi" : "Selesai";

    if (task.completed) {
      card.classList.add("is-completed");
    }

    completeButton.addEventListener("click", () => {
      state.tasks = state.tasks.map((item) => {
        if (item.id !== task.id) {
          return item;
        }

        return {
          ...item,
          completed: !item.completed,
          notified: item.completed ? item.notified : true
        };
      });

      saveData(STORAGE_KEYS.tasks, state.tasks);
      renderTasks();
      renderHomeMetrics();
    });

    deleteButton.addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveData(STORAGE_KEYS.tasks, state.tasks);
      renderTasks();
      renderHomeMetrics();
    });

    taskList.appendChild(fragment);
  });
}

function renderSchedules() {
  scheduleBoard.innerHTML = "";
  scheduleCount.textContent = `${state.schedules.length} item`;

  DAYS.forEach((day) => {
    const column = document.createElement("section");
    column.className = "day-column";

    const heading = document.createElement("h4");
    heading.textContent = day;
    column.appendChild(heading);

    const items = state.schedules
      .filter((item) => item.day === day)
      .sort((a, b) => String(a.period).localeCompare(String(b.period), "id", { numeric: true }));

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "list-card-meta";
      empty.textContent = "Belum ada jadwal.";
      column.appendChild(empty);
    } else {
      items.forEach((item) => {
        const card = document.createElement("article");
        card.className = "schedule-item";

        const title = document.createElement("strong");
        title.textContent = `Jam ${item.period} • ${item.time}`;

        const teacher = document.createElement("span");
        teacher.textContent = item.teacher;

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "ghost-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => fillScheduleForm(item));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "ghost-button";
        deleteButton.textContent = "Hapus";
        deleteButton.addEventListener("click", () => {
          state.schedules = state.schedules.filter((entry) => entry.id !== item.id);
          saveData(STORAGE_KEYS.schedules, state.schedules);
          renderSchedules();
          renderHomeMetrics();
          if (scheduleEditId.value === item.id) {
            resetScheduleForm();
          }
        });

        actions.append(editButton, deleteButton);
        card.append(title, teacher, actions);
        column.appendChild(card);
      });
    }

    scheduleBoard.appendChild(column);
  });
}

function renderAlarms() {
  alarmList.innerHTML = "";
  const sortedAlarms = state.alarms
    .slice()
    .sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));

  alarmEmptyState.hidden = sortedAlarms.length !== 0;
  alarmCount.textContent = `${sortedAlarms.length} alarm`;

  sortedAlarms.forEach((alarm) => {
    const fragment = alarmTemplate.content.cloneNode(true);
    const title = fragment.querySelector(".list-card-title");
    const meta = fragment.querySelector(".list-card-meta");
    const status = fragment.querySelector(".badge-status");
    const deleteButton = fragment.querySelector(".delete-action");

    title.textContent = alarm.label;
    meta.textContent = formatDateTime(new Date(alarm.remindAt));
    status.textContent = alarm.fired ? "Selesai" : "Aktif";

    deleteButton.addEventListener("click", () => {
      state.alarms = state.alarms.filter((item) => item.id !== alarm.id);
      saveData(STORAGE_KEYS.alarms, state.alarms);
      renderAlarms();
      renderHomeMetrics();
    });

    alarmList.appendChild(fragment);
  });
}

function renderHomeMetrics() {
  document.getElementById("homeTaskCount").textContent = String(state.tasks.length);
  document.getElementById("homeAlarmCount").textContent = String(
    state.alarms.filter((alarm) => !alarm.fired).length
  );
  document.getElementById("homeScheduleCount").textContent = String(state.schedules.length);
}

function fillScheduleForm(item) {
  scheduleEditId.value = item.id;
  document.getElementById("scheduleDay").value = item.day;
  document.getElementById("schedulePeriod").value = item.period;
  document.getElementById("scheduleTeacher").value = item.teacher;
  document.getElementById("scheduleTime").value = item.time;
  cancelScheduleEdit.hidden = false;
  activateScreen("schedule");
}

function resetScheduleForm() {
  scheduleForm.reset();
  scheduleEditId.value = "";
  cancelScheduleEdit.hidden = true;
}

function updateClock() {
  const now = new Date();
  liveClock.textContent = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);

  liveDate.textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(now);
}

function setDefaultTaskDateTime() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  document.getElementById("taskDate").value = formatDateInput(nextHour);
  document.getElementById("taskTime").value = formatTimeInput(nextHour);
}

function setDefaultAlarmDateTime() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  document.getElementById("alarmDate").value = formatDateInput(nextHour);
  document.getElementById("alarmTime").value = formatTimeInput(nextHour);
}

function checkReminders() {
  const now = new Date();
  let changed = false;

  state.alarms = state.alarms.map((alarm) => {
    if (!alarm.fired && new Date(alarm.remindAt) <= now) {
      changed = true;
      showNotification(alarm.label, "Alarm StudyMate AI sudah waktunya.");
      return { ...alarm, fired: true };
    }
    return alarm;
  });

  state.tasks = state.tasks.map((task) => {
    if (!task.completed && !task.notified && new Date(task.remindAt) <= now) {
      changed = true;
      showNotification(task.title, task.description || "Waktunya mengerjakan tugas ini.");
      return { ...task, notified: true };
    }
    return task;
  });

  if (changed) {
    saveData(STORAGE_KEYS.alarms, state.alarms);
    saveData(STORAGE_KEYS.tasks, state.tasks);
    renderTasks();
    renderAlarms();
    renderHomeMetrics();
  }
}

function seedDefaultSchedules() {
  if (state.schedules.length > 0) {
    return;
  }

  state.schedules = [
    { id: createId(), day: "Senin", period: "0", teacher: "UPACARA", time: "06:45 - 09:00" },
    { id: createId(), day: "Senin", period: "1", teacher: "(47) Robi Setiawan, S.Pd.", time: "09:00 - 09:35" },
    { id: createId(), day: "Selasa", period: "0", teacher: "DO'A PAGI", time: "06:45 - 07:00" },
    { id: createId(), day: "Selasa", period: "1", teacher: "(2) Dra. Lusetya Marhaeni, M.MPd.", time: "07:00 - 07:40" },
    { id: createId(), day: "Rabu", period: "0", teacher: "DO'A PAGI", time: "06:45 - 07:00" },
    { id: createId(), day: "Kamis", period: "0", teacher: "DO'A PAGI", time: "06:45 - 07:00" },
    { id: createId(), day: "Jumat", period: "0", teacher: "DO'A PAGI", time: "06:45 - 07:10" }
  ];

  saveData(STORAGE_KEYS.schedules, state.schedules);
}

function loadData(key) {
  const raw = readStorage(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveData(key, value) {
  writeStorage(key, JSON.stringify(value));
}

function readStorage(key) {
  try {
    if (window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    return memoryStore[key] || null;
  }

  return memoryStore[key] || null;
}

function writeStorage(key, value) {
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    memoryStore[key] = value;
    return;
  }

  memoryStore[key] = value;
}

function formatDateInput(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatTimeInput(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    notifyButton.textContent = "Mode Pengingat Lokal";
    showNotice("Perangkat ini tidak mendukung notifikasi browser. Aplikasi akan memakai alert lokal.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    updateNotificationButton(permission);
    if (permission !== "granted") {
      showNotice("Notifikasi browser tidak aktif. Pengingat tetap akan muncul sebagai alert di dalam aplikasi.");
    }
  } catch {
    notifyButton.textContent = "Mode Pengingat Lokal";
    showNotice("Notifikasi browser diblokir. Aplikasi akan memakai alert lokal.");
  }
}

function updateNotificationButton(permission) {
  if (!("Notification" in window)) {
    notifyButton.textContent = "Mode Pengingat Lokal";
    return;
  }

  const currentPermission = permission || Notification.permission;
  if (currentPermission === "granted") {
    notifyButton.textContent = "Notifikasi Aktif";
  } else if (currentPermission === "denied") {
    notifyButton.textContent = "Mode Pengingat Lokal";
  } else {
    notifyButton.textContent = "Aktifkan Pengingat";
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
      showNotice(`${title}: ${body}`);
      return;
    } catch {
      // Fallback handled below.
    }
  }

  if (navigator.vibrate) {
    try {
      navigator.vibrate([200, 120, 200]);
    } catch {
      // Ignore vibration errors.
    }
  }

  showNotice(`${title}: ${body}`);
  window.alert(`${title}\n${body}`);
}

function openExternalUrl(url) {
  try {
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

function loadBrowserUrl(url) {
  browserCurrentUrl = url;
  browserFrame.src = url;
  browserStatus.textContent = `Membuka: ${url}`;
  activateScreen("ai");
}

function handleBrowserBack() {
  try {
    if (browserFrame.contentWindow) {
      browserFrame.contentWindow.history.back();
      browserStatus.textContent = "Kembali ke halaman sebelumnya.";
      return;
    }
  } catch {
    browserStatus.textContent = "Navigasi balik dibatasi situs ini. Gunakan tombol Home atau Buka Eksternal.";
    return;
  }

  browserStatus.textContent = "Belum ada halaman sebelumnya.";
}

function handleBrowserForward() {
  try {
    if (browserFrame.contentWindow) {
      browserFrame.contentWindow.history.forward();
      browserStatus.textContent = "Maju ke halaman berikutnya.";
      return;
    }
  } catch {
    browserStatus.textContent = "Navigasi maju dibatasi situs ini.";
    return;
  }

  browserStatus.textContent = "Belum ada halaman berikutnya.";
}

function handleBrowserHome() {
  loadBrowserUrl("https://www.google.com");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function toText(value) {
  return String(value || "").trim();
}

function showInlineMessage(message) {
  window.alert(message);
}

function showNotice(message) {
  if (!appNotice) {
    return;
  }

  appNotice.textContent = message;
  appNotice.hidden = false;
  window.clearTimeout(showNotice.timeoutId);
  showNotice.timeoutId = window.setTimeout(() => {
    appNotice.hidden = true;
  }, 5000);
}
