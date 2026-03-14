const form = document.getElementById('todo-form');
const taskInput = document.getElementById('task-input');
const dueInput = document.getElementById('due-input');
const todoList = document.getElementById('todo-list');
const emptyMsg = document.getElementById('empty-msg');
const filterBtns = document.querySelectorAll('.filter-btn');

let tasks = [];
let currentFilter = 'all';

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  tasks.push({
    id: Date.now(),
    text,
    due: dueInput.value || null,
    completed: false,
  });

  taskInput.value = '';
  dueInput.value = '';
  taskInput.focus();
  render();
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  render();
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return due < today;
}

function render() {
  const visible = tasks.filter((t) => {
    if (currentFilter === 'active') return !t.completed;
    if (currentFilter === 'completed') return t.completed;
    return true;
  });

  todoList.innerHTML = '';

  visible.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (task.completed ? ' completed' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleComplete(task.id));

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = task.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'Delete task';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);

    if (task.due) {
      const badge = document.createElement('span');
      badge.className = 'due-badge' + (!task.completed && isOverdue(task.due) ? ' overdue' : '');
      badge.textContent = formatDue(task.due);
      li.appendChild(badge);
    }

    li.appendChild(delBtn);
    todoList.appendChild(li);
  });

  emptyMsg.style.display = visible.length === 0 ? 'block' : 'none';
}

render();
