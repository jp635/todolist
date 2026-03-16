import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIzmki7VSi2Vk88PFNQve5puLa8vmWUYs",
  authDomain: "todolist-d187b.firebaseapp.com",
  projectId: "todolist-d187b",
  storageBucket: "todolist-d187b.firebasestorage.app",
  messagingSenderId: "84198006139",
  appId: "1:84198006139:web:997bde75084b951c1031de",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCol = collection(db, "tasks");

const form = document.getElementById("todo-form");
const taskInput = document.getElementById("task-input");
const dueInput = document.getElementById("due-input");
const todoList = document.getElementById("todo-list");
const emptyMsg = document.getElementById("empty-msg");
const filterBtns = document.querySelectorAll(".filter-btn");
const quickBtns = document.querySelectorAll(".quick-btn");

let tasks = [];
let currentFilter = "active";
let selectedDue = null;
let sortByDate = false;

const sortBtn = document.getElementById("sort-btn");
sortBtn.addEventListener("click", () => {
  sortByDate = !sortByDate;
  sortBtn.classList.toggle("active", sortByDate);
  render();
});

quickBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.dataset.value;
    if (selectedDue === val || (val === "tomorrow" && selectedDue === tomorrowDate())) {
      selectedDue = null;
      btn.classList.remove("selected");
    } else {
      selectedDue = val === "tomorrow" ? tomorrowDate() : val;
      quickBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      dueInput.value = "";
    }
  });
});

function tomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

dueInput.addEventListener("change", () => {
  if (dueInput.value) {
    selectedDue = dueInput.value;
    quickBtns.forEach((b) => b.classList.remove("selected"));
  }
});

// Real-time listener — syncs instantly across devices
const q = query(tasksCol, orderBy("createdAt", "asc"));
onSnapshot(q, (snapshot) => {
  tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  render();
}, (error) => {
  console.error("Firestore read error:", error.code, error.message);
  alert("Could not load tasks: " + error.message);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  try {
    await addDoc(tasksCol, {
      text,
      due: selectedDue || null,
      completed: false,
      createdAt: serverTimestamp(),
    });
    taskInput.value = "";
    dueInput.value = "";
    selectedDue = null;
    quickBtns.forEach((b) => b.classList.remove("selected"));
    taskInput.focus();
  } catch (error) {
    console.error("Firestore write error:", error.code, error.message);
    alert("Could not save task: " + error.message);
  }
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

async function toggleComplete(id, current) {
  await updateDoc(doc(db, "tasks", id), { completed: !current });
}

async function deleteTask(id) {
  await deleteDoc(doc(db, "tasks", id));
}

async function toggleSnooze(id, task) {
  if (task.snoozed) {
    await updateDoc(doc(db, "tasks", id), { snoozed: false, snoozeUntil: null });
  } else {
    const until = dueDateToAbsolute(task.due);
    await updateDoc(doc(db, "tasks", id), { snoozed: true, snoozeUntil: until });
  }
}

function dueDateToAbsolute(due) {
  if (!due) return null;
  if (due === "today" || due === "afternoon") return new Date().toISOString().slice(0, 10);
  if (due === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return due;
}

function isSnoozed(task) {
  if (!task.snoozed || !task.snoozeUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.snoozeUntil > today;
}

function dueSortValue(due) {
  if (!due) return "9999-12-31";
  if (due === "today" || due === "afternoon") return new Date().toISOString().slice(0, 10);
  if (due === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return due;
}

function formatDue(due) {
  if (!due) return null;
  if (due === "today") return "Today";
  if (due === "afternoon") return "This afternoon";
  if (due === "tomorrow") return "Tomorrow";
  const today = new Date().toISOString().slice(0, 10);
  if (due === today) return "Today";
  if (due === tomorrowDate()) return "Tomorrow";
  const [year, month, day] = due.split("-");
  return `${day}/${month}/${year}`;
}

function isOverdue(due) {
  if (!due || due === "today" || due === "afternoon" || due === "tomorrow") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(due) < today;
}

function render() {
  let visible = tasks.filter((t) => {
    if (currentFilter === "active") return !t.completed && !isSnoozed(t);
    if (currentFilter === "completed") return t.completed;
    if (currentFilter === "snoozed") return isSnoozed(t);
    return true;
  });

  if (sortByDate) {
    visible = [...visible].sort((a, b) =>
      dueSortValue(a.due).localeCompare(dueSortValue(b.due))
    );
  }

  todoList.innerHTML = "";

  visible.forEach((task) => {
    const li = document.createElement("li");
    const overdueTask = !task.completed && isOverdue(task.due);
    li.className = "todo-item" + (task.completed ? " completed" : "") + (overdueTask ? " overdue" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      if (!task.completed && currentFilter === "active") {
        li.classList.add("hiding");
        setTimeout(() => toggleComplete(task.id, task.completed), 300);
      } else {
        toggleComplete(task.id, task.completed);
      }
    });

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = task.text;

    li.appendChild(checkbox);
    li.appendChild(span);

    if (task.due) {
      const badge = document.createElement("span");
      badge.className =
        "due-badge" + (!task.completed && isOverdue(task.due) ? " overdue" : "");
      badge.textContent = formatDue(task.due);
      li.appendChild(badge);

      const snoozeBtn = document.createElement("button");
      snoozeBtn.className = "snooze-btn" + (isSnoozed(task) ? " snoozed" : "");
      snoozeBtn.textContent = isSnoozed(task) ? "Wake" : "Snooze";
      snoozeBtn.title = isSnoozed(task) ? "Click to unsnooze" : "Hide until due date";
      snoozeBtn.addEventListener("click", () => toggleSnooze(task.id, task));
      li.appendChild(snoozeBtn);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Delete task";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.appendChild(delBtn);
    todoList.appendChild(li);
  });

  emptyMsg.style.display = visible.length === 0 ? "block" : "none";
}
