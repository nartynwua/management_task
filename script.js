import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  "https://zwnaumwmdyiazrwwlhvk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bmF1bXdtZHlpYXpyd3dsaHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODIxNDQsImV4cCI6MjA2Njc1ODE0NH0.4Wf6lr9g2Vf4XV7Cf_5yiAgT_aPayHhya1VhgUq_prk"
);

document.addEventListener('DOMContentLoaded', function () {
  const taskInput = document.getElementById('taskInput');
  const taskDesc = document.getElementById('taskDesc');
  const taskDueDate = document.getElementById('taskDueDate');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');
  const searchInput = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const taskCounter = document.getElementById('taskCounter');

  let tasks = [];
  let currentFilter = 'all';

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Gagal mengambil data:', error);
    } else {
      tasks = data;
      renderTasks();
    }
  }

  function renderTasks() {
    taskList.innerHTML = '';

    let filteredTasks = tasks;

    if (currentFilter === 'active') {
      filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
      filteredTasks = tasks.filter(task => task.completed);
    }

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task =>
        task.text.toLowerCase().includes(searchTerm)
      );
    }

    filteredTasks.forEach((task, index) => {
      const taskItem = document.createElement('div');
      taskItem.className = `task-item bg-white rounded-xl shadow-sm p-4 flex items-center justify-between ${task.completed ? 'opacity-75' : ''}`;

      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const isOverdue = dueDate && !task.completed && dueDate < new Date();

      let alertClass = '';
      let daysUntilDue = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

      if (dueDate && !task.completed) {
        if (isOverdue) {
          alertClass = 'border-l-4 border-red-500 pl-3';
        } else if (daysUntilDue <= 3) {
          alertClass = 'border-l-4 border-yellow-500 pl-3';
        }
      }

      taskItem.innerHTML = `
        <div class="flex-1">
          <div class="flex gap-3 ${alertClass}">
            <input 
              type="checkbox" 
              class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-1" 
              ${task.completed ? 'checked' : ''}
              data-index="${index}"
            >
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-gray-800 ${task.completed ? 'checked' : ''} font-medium">${task.text}</div>
                  ${task.desc ? `<div class="text-gray-600 text-sm mt-1">${task.desc}</div>` : ''}
                </div>
                <button class="text-gray-400 hover:text-red-500 delete-btn ml-4" data-index="${index}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              ${dueDate ? `
                <div class="mt-2 flex items-center text-sm ${isOverdue ? 'text-red-500' : daysUntilDue <= 3 ? 'text-yellow-500' : 'text-gray-500'}">
                  <i class="fas fa-calendar-day mr-1"></i>
                  <span>${dueDate.toLocaleDateString('id-ID')}</span>
                  ${isOverdue
                    ? '<span class="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">MELEWATI BATAS</span>'
                    : daysUntilDue <= 3
                      ? `<span class="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">SEGERA</span>`
                      : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      taskList.appendChild(taskItem);
    });

    const remainingTasks = tasks.filter(task => !task.completed).length;
    const urgentTasks = tasks.filter(task => {
      if (!task.due_date || task.completed) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
      return daysUntilDue <= 3 && daysUntilDue >= 0;
    }).length;

    taskCounter.textContent = `${remainingTasks} tugas belum selesai` +
      (urgentTasks > 0 ? ` • ${urgentTasks} butuh perhatian!` : '');
  }

  async function addTask() {
    const text = taskInput.value.trim();
    const desc = taskDesc.value.trim();
    const due_date = taskDueDate.value;

    if (!text) {
      alert('Kolom judul tugas wajib diisi!');
      return;
    }

    if (due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(due_date);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        alert('Tanggal deadline harus setelah hari ini!');
        return;
      }
    }

    const { error } = await supabase
      .from('tasks')
      .insert([{
        text,
        desc,
        due_date,
        completed: false,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error adding task:', error);
    } else {
      taskInput.value = '';
      taskDesc.value = '';
      taskDueDate.value = '';
      await fetchTasks();
    }

    checkDeadlines();
  }

  function checkDeadlines() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
      if (task.due_date && !task.completed) {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue === 1) {
          const confirmed = confirm(`⏰ PERINGATAN: Tugas "${task.text}" akan fall due besok!\n\nKlik OK untuk melanjutkan atau Batalkan untuk melihat detail tugas.`);
          if (!confirmed) {
            taskInput.value = task.text;
            taskDesc.value = task.desc || '';
            taskDueDate.value = task.due_date;
            taskInput.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (daysUntilDue === 0) {
          const confirmed = confirm(`❗ PENTING: Tugas "${task.text}" deadline HARI INI!\n\nKlik OK untuk melanjutkan atau Batalkan untuk melihat detail tugas.`);
          if (!confirmed) {
            taskInput.value = task.text;
            taskDesc.value = task.desc || '';
            taskDueDate.value = task.due_date;
            taskInput.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (daysUntilDue < 0) {
          alert(`🚨 TUGAS TERLAMBAT: Tugas "${task.text}" sudah melebihi deadline ${Math.abs(daysUntilDue)} hari yang lalu!`);
        }
      }
    });
  }

  setInterval(checkDeadlines, 60000);

  async function toggleTask(index) {
    const task = tasks[index];
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id);

    if (error) {
      console.error('Error updating task:', error);
    } else {
      await fetchTasks();
    }
  }

  async function deleteTask(index) {
    const task = tasks[index];
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id);

    if (error) {
      console.error('Error deleting task:', error);
    } else {
      await fetchTasks();
    }
  }

  addTaskBtn.addEventListener('click', addTask);

  taskInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTask();
  });

  taskList.addEventListener('click', function (e) {
    const target = e.target;

    if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
      const btn = target.closest('.delete-btn');
      const index = btn.dataset.index;
      deleteTask(index);
    } else if (target.type === 'checkbox' || target.closest('input[type="checkbox"]')) {
      const checkbox = target.closest('input[type="checkbox"]');
      const index = checkbox.dataset.index;
      toggleTask(index);
    }
  });

  searchInput.addEventListener('input', renderTasks);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      filterBtns.forEach(b => {
        if (b === btn) {
          b.classList.remove('bg-white', 'text-gray-700', 'border');
          b.classList.add('bg-indigo-600', 'text-white');
        } else {
          b.classList.remove('bg-indigo-600', 'text-white');
          b.classList.add('bg-white', 'text-gray-700', 'border');
        }
      });

      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  fetchTasks();
});
