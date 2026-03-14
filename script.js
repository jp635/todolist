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

let tasks = [];
let currentFilter = "all";

// Real-time listener — syncs instantly across devices
const q = query(tasksCol, orderBy("createdAt", "asc"));
onSnapshot(q, (snapshot) => {
  tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  render();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  await addDoc(tasksCol, {
    text,
    due: dueInput.value || null,
    completed: false,
    createdAt: serverTimestamp(),
  });

  taskInput.value = "";
  dueInput.value = "";
  taskInput.focus();
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

async function editTask(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return false;
  await updateDoc(doc(db, "tasks", id), { text: trimmed });
  return true;
}

function startEdit(li, span, editInput, task) {
  if (task.completed) return;
  li.classList.add("editing");
  span.style.display = "none";
  editInput.style.display = "block";
  editInput.focus();
  editInput.select();
}

function stopEdit(li, span, editInput) {
  li.classList.remove("editing");
  span.style.display = "";
  editInput.style.display = "none";
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function render() {
  const visible = tasks.filter((t) => {
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  todoList.innerHTML = "";

  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (task.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleComplete(task.id, task.completed));

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = task.text;
    span.title = "Double-click to edit";
    span.addEventListener("dblclick", () => startEdit(li, span, editInput, task));

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "edit-input";
    editInput.value = task.text;
    editInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const ok = await editTask(task.id, editInput.value);
        if (ok) stopEdit(li, span, editInput);
      } else if (e.key === "Escape") {
        editInput.value = task.text;
        stopEdit(li, span, editInput);
      }
    });
    editInput.addEventListener("blur", async () => {
      if (li.classList.contains("editing")) {
        const ok = await editTask(task.id, editInput.value);
        if (!ok) editInput.value = task.text;
        stopEdit(li, span, editInput);
      }
    });

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Delete task";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(editInput);

    if (task.due) {
      const badge = document.createElement("span");
      badge.className =
        "due-badge" + (!task.completed && isOverdue(task.due) ? " overdue" : "");
      badge.textContent = formatDue(task.due);
      li.appendChild(badge);
    }

    li.appendChild(delBtn);
    todoList.appendChild(li);
  });

  emptyMsg.style.display = visible.length === 0 ? "block" : "none";
}
