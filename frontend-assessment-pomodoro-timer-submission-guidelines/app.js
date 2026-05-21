const STORAGE_KEY = "pomodoroDailyHistory.v1";
const RING_CIRCUMFERENCE = 2 * Math.PI * 106;

const elements = {
  stage: document.querySelector("#timer-stage"),
  statePill: document.querySelector("#state-pill"),
  modeLabel: document.querySelector("#mode-label"),
  timeDisplay: document.querySelector("#time-display"),
  statusText: document.querySelector("#status-text"),
  progress: document.querySelector("#progress-circle"),
  startPause: document.querySelector("#start-pause"),
  reset: document.querySelector("#reset"),
  focusMinutes: document.querySelector("#focus-minutes"),
  breakMinutes: document.querySelector("#break-minutes"),
  historyList: document.querySelector("#history-list"),
  emptyHistory: document.querySelector("#empty-history"),
  historyCount: document.querySelector("#history-count"),
};

let mode = "focus";
let isRunning = false;
let durationSeconds = minutesToSeconds(elements.focusMinutes.value);
let remainingSeconds = durationSeconds;
let expectedEnd = null;
let intervalId = null;
let activeDayKey = formatDayKey(new Date());
let audioContext = null;
let history = loadHistory();

elements.progress.style.strokeDasharray = RING_CIRCUMFERENCE;

render();
renderHistory();

elements.startPause.addEventListener("click", () => {
  isRunning ? pauseTimer() : startTimer();
});

elements.reset.addEventListener("click", resetTimer);

[elements.focusMinutes, elements.breakMinutes].forEach((input) => {
  input.addEventListener("change", () => {
    input.value = clamp(Number(input.value), Number(input.min), Number(input.max));
    if (!isRunning) {
      durationSeconds = getCurrentDuration();
      remainingSeconds = durationSeconds;
      render();
    }
  });
});

function startTimer() {
  if (remainingSeconds <= 0) {
    remainingSeconds = getCurrentDuration();
  }

  ensureAudioContext();
  isRunning = true;
  expectedEnd = Date.now() + remainingSeconds * 1000;
  intervalId = window.setInterval(tick, 250);
  render();
}

function pauseTimer() {
  isRunning = false;
  window.clearInterval(intervalId);
  intervalId = null;
  render();
}

function resetTimer() {
  pauseTimer();
  durationSeconds = getCurrentDuration();
  remainingSeconds = durationSeconds;
  render();
}

function tick() {
  remainingSeconds = Math.max(0, Math.ceil((expectedEnd - Date.now()) / 1000));
  render();

  if (remainingSeconds === 0) {
    completeCycle();
  }
}

function completeCycle() {
  window.clearInterval(intervalId);
  intervalId = null;
  const finishedMode = mode;
  playCue();

  if (finishedMode === "focus") {
    addHistory(durationSeconds);
  }

  mode = finishedMode === "focus" ? "break" : "focus";
  durationSeconds = getCurrentDuration();
  remainingSeconds = durationSeconds;
  expectedEnd = Date.now() + remainingSeconds * 1000;
  intervalId = window.setInterval(tick, 250);
  elements.stage.classList.remove("celebrate");
  void elements.stage.offsetWidth;
  elements.stage.classList.add("celebrate");
  render();
}

function render() {
  const isBreak = mode === "break";
  const isPaused = !isRunning && remainingSeconds !== durationSeconds;
  const elapsed = durationSeconds - remainingSeconds;
  const progress = durationSeconds === 0 ? 0 : elapsed / durationSeconds;

  elements.timeDisplay.textContent = formatTime(remainingSeconds);
  elements.modeLabel.textContent = isBreak ? "Break time" : "Focus time";
  elements.startPause.textContent = isRunning ? "Pause" : isPaused ? "Resume" : "Start";
  elements.statusText.textContent = getStatusText(isBreak, isPaused);
  elements.statePill.textContent = isPaused ? "Paused" : isBreak ? "Break" : "Focus";
  elements.statePill.className = `state-pill ${isPaused ? "paused" : mode}`;
  elements.stage.classList.toggle("break-mode", isBreak);
  elements.progress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
}

function getStatusText(isBreak, isPaused) {
  if (isPaused) return "Paused. Your place is saved.";
  if (!isRunning) return "Set your rhythm, then start.";
  return isBreak ? "Breathe, stretch, and come back ready." : "Keep the window clear and the next step small.";
}

function addHistory(seconds) {
  syncHistoryDay();
  history.unshift({
    seconds,
    completedAt: new Date().toISOString(),
  });
  saveHistory();
  renderHistory();
}

function renderHistory() {
  syncHistoryDay();
  elements.historyList.innerHTML = "";
  elements.historyCount.textContent = history.length;
  elements.emptyHistory.hidden = history.length > 0;

  history.forEach((entry) => {
    const item = document.createElement("li");
    const session = document.createElement("span");
    const time = document.createElement("time");

    session.className = "history-session";
    session.textContent = `\u2713 ${formatTime(entry.seconds)} focus`;
    time.className = "history-time";
    time.dateTime = entry.completedAt;
    time.textContent = formatClock(entry.completedAt);

    item.append(session, time);
    elements.historyList.append(item);
  });
}

function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.day === activeDayKey && Array.isArray(stored.items) ? stored.items : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: activeDayKey, items: history }));
}

function syncHistoryDay() {
  const today = formatDayKey(new Date());
  if (today === activeDayKey) return;

  activeDayKey = today;
  history = [];
  saveHistory();
}

function getCurrentDuration() {
  return minutesToSeconds(mode === "focus" ? elements.focusMinutes.value : elements.breakMinutes.value);
}

function minutesToSeconds(value) {
  return clamp(Number(value) || 1, 1, 120) * 60;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatClock(isoString) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString)).toLowerCase();
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function playCue() {
  const context = ensureAudioContext();
  if (!context) return;

  const now = context.currentTime;
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.22, now + index * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.13);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * 0.16);
    oscillator.stop(now + index * 0.16 + 0.15);
  });
}

function ensureAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}
