const STORAGE_KEY = 'homeScheduleBoardSchedules';

let schedules = loadSchedules();
let lastAlarmKey = '';
let alarmTimeoutId = null;
let selectedAudioUrl = null;
let audioElement = null;

function loadSchedules() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('스케줄 불러오기 실패:', error);
    }
  }

  return [
    { time: '06:30', job: '엄마 기상' },
    { time: '07:00', job: '주희 기상' },
    { time: '08:00', job: '엄마, 주희, 주하 등교' },
    { time: '21:00', job: '주희 세수, 양치질' },
    { time: '21:30', job: '취침' }
  ];
}

function saveSchedulesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function sortSchedules(list) {
  return [...list].sort((a, b) => a.time.localeCompare(b.time));
}

function updateClockAndJob() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  document.getElementById('clock').textContent = currentTime;
  document.getElementById('date').textContent = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  updateCurrentJob(currentTime);
  checkAlarm(currentTime);
}

function updateCurrentJob(currentTime) {
  const sorted = sortSchedules(schedules).filter(item => item.time && item.job);

  if (sorted.length === 0) {
    document.getElementById('currentJob').textContent = '스케줄을 입력해주세요';
    document.getElementById('currentJobTime').textContent = '';
    return;
  }

  let current = null;

  for (const item of sorted) {
    if (item.time <= currentTime) {
      current = item;
    }
  }

  // 아직 오늘 첫 스케줄 전이면, 전날 마지막 스케줄을 계속 표시합니다.
  if (!current) {
    current = sorted[sorted.length - 1];
  }

  document.getElementById('currentJob').textContent = current.job;
  document.getElementById('currentJobTime').textContent = current.time;
}

function checkAlarm(currentTime) {
  const today = new Date().toISOString().slice(0, 10);
  const matched = schedules.find(item => item.time === currentTime && item.job);

  if (!matched) return;

  const alarmKey = `${today}-${matched.time}-${matched.job}`;
  if (lastAlarmKey === alarmKey) return;

  lastAlarmKey = alarmKey;
  showAlarm(matched);
}

function showAlarm(schedule) {
  document.getElementById('alarmTime').textContent = schedule.time;
  document.getElementById('alarmJob').textContent = schedule.job;
  document.getElementById('alarmScreen').classList.add('show');

  playAlarmSound();

  clearTimeout(alarmTimeoutId);
  alarmTimeoutId = setTimeout(() => {
    hideAlarm();
  }, 30000);
}

function hideAlarm() {
  document.getElementById('alarmScreen').classList.remove('show');
  stopAlarmSound();
  clearTimeout(alarmTimeoutId);
}

function playAlarmSound() {
  stopAlarmSound();

  if (selectedAudioUrl) {
    audioElement = new Audio(selectedAudioUrl);
    audioElement.loop = true;
    audioElement.play().catch(() => {
      playBasicBeep();
    });
  } else {
    playBasicBeep();
  }
}

function stopAlarmSound() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement = null;
  }
}

function playBasicBeep() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.15;

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();

  audioElement = {
    pause: () => {
      oscillator.stop();
      context.close();
    },
    currentTime: 0
  };
}

function openEditor() {
  renderScheduleRows();
  document.getElementById('editorPanel').classList.add('open');
}

function closeEditor() {
  document.getElementById('editorPanel').classList.remove('open');
}

function renderScheduleRows() {
  const list = document.getElementById('scheduleList');
  list.innerHTML = '';

  sortSchedules(schedules).forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'schedule-row';
    row.innerHTML = `
      <input type="time" value="${item.time}" data-index="${index}" data-field="time" />
      <input type="text" value="${escapeHtml(item.job)}" placeholder="할 일" data-index="${index}" data-field="job" />
      <button class="delete-button" onclick="deleteScheduleRow(${index})">×</button>
    `;
    list.appendChild(row);
  });
}

function addScheduleRow() {
  schedules = sortSchedules(readRowsFromEditor());
  schedules.push({ time: '07:00', job: '' });
  renderScheduleRows();
}

function deleteScheduleRow(index) {
  schedules = sortSchedules(readRowsFromEditor());
  schedules.splice(index, 1);
  renderScheduleRows();
}

function readRowsFromEditor() {
  const rows = document.querySelectorAll('.schedule-row');
  return Array.from(rows).map(row => {
    const timeInput = row.querySelector('input[data-field="time"]');
    const jobInput = row.querySelector('input[data-field="job"]');
    return {
      time: timeInput.value,
      job: jobInput.value.trim()
    };
  });
}

function saveSchedules() {
  schedules = sortSchedules(readRowsFromEditor()).filter(item => item.time && item.job);
  saveSchedulesToStorage();
  closeEditor();
  updateClockAndJob();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.getElementById('soundFile').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  if (selectedAudioUrl) {
    URL.revokeObjectURL(selectedAudioUrl);
  }

  selectedAudioUrl = URL.createObjectURL(file);
});

saveSchedulesToStorage();
updateClockAndJob();
setInterval(updateClockAndJob, 1000);