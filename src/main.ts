import './style.css';
import { initMap, centerOnUser, showHistoryRoute, clearHistoryRoute, savePosition } from './map.ts';
import {
  startTracking,
  pauseTracking,
  finishRun,
  getState,
  getElapsedTime,
  getLastPosition,
  setOnDistanceUpdate,
  setOnStateChange,
  type RunState,
} from './run-tracker.ts';
import { formatDistance, formatDuration, formatDate, formatTime } from './units.ts';
import { getRuns } from './storage.ts';

// DOM Elements
const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
const playIcon = document.getElementById('play-icon') as HTMLElement;
const pauseIcon = document.getElementById('pause-icon') as HTMLElement;
const finishBtn = document.getElementById('finish-btn') as HTMLButtonElement;
const recenterBtn = document.getElementById('recenter-btn') as HTMLButtonElement;
const historyToggle = document.getElementById('history-toggle') as HTMLButtonElement;
const historyPanel = document.getElementById('history-panel') as HTMLElement;
const historyClose = document.getElementById('history-close') as HTMLButtonElement;
const historyList = document.getElementById('history-list') as HTMLElement;
const durationDisplay = document.getElementById('duration') as HTMLElement;
const distanceDisplay = document.getElementById('distance') as HTMLElement;

// Animation frame ID for timer
let timerFrameId: number | null = null;

/**
 * Update the timer display
 */
function updateTimer(): void {
  if (getState() === 'running') {
    durationDisplay.textContent = formatDuration(getElapsedTime());
    timerFrameId = requestAnimationFrame(updateTimer);
  }
}

/**
 * Start the timer animation loop
 */
function startTimer(): void {
  if (timerFrameId) cancelAnimationFrame(timerFrameId);
  timerFrameId = requestAnimationFrame(updateTimer);
}

/**
 * Stop the timer animation loop
 */
function stopTimer(): void {
  if (timerFrameId) {
    cancelAnimationFrame(timerFrameId);
    timerFrameId = null;
  }
}

/**
 * Update UI based on run state
 */
function updateUI(state: RunState): void {
  playPauseBtn.dataset.state = state;

  switch (state) {
    case 'stopped':
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      finishBtn.style.display = 'none';
      playPauseBtn.setAttribute('aria-label', 'Start run');
      durationDisplay.textContent = '00:00:00';
      distanceDisplay.textContent = formatDistance(0);
      stopTimer();
      break;

    case 'running':
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      finishBtn.style.display = 'block';
      playPauseBtn.setAttribute('aria-label', 'Pause run');
      startTimer();
      break;

    case 'paused':
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      finishBtn.style.display = 'block';
      playPauseBtn.setAttribute('aria-label', 'Resume run');
      stopTimer();
      // Keep showing current values
      durationDisplay.textContent = formatDuration(getElapsedTime());
      break;
  }
}

/**
 * Handle play/pause button click
 */
function handlePlayPause(): void {
  const state = getState();

  if (state === 'stopped' || state === 'paused') {
    startTracking();
  } else if (state === 'running') {
    pauseTracking();
  }
}

/**
 * Handle finish button click
 */
function handleFinish(): void {
  if (confirm('Finish this run?')) {
    finishRun();
    renderHistory();
  }
}

/**
 * Handle re-center button click
 */
function handleRecenter(): void {
  const pos = getLastPosition();
  if (pos) {
    centerOnUser(pos.lng, pos.lat);
  } else {
    // Try to get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        savePosition(longitude, latitude);
        centerOnUser(longitude, latitude);
      },
      (error) => {
        console.error('Could not get position:', error.message);
      },
      { enableHighAccuracy: true }
    );
  }
}

/**
 * Toggle history panel
 */
function toggleHistory(): void {
  historyPanel.classList.toggle('open');
  if (historyPanel.classList.contains('open')) {
    renderHistory();
    clearHistoryRoute();
  }
}

/**
 * Close history panel
 */
function closeHistory(clearRoute = true): void {
  historyPanel.classList.remove('open');
  if (clearRoute) {
    clearHistoryRoute();
  }
}

/**
 * Render run history list
 */
function renderHistory(): void {
  const runs = getRuns();

  if (runs.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No runs yet. Start your first run!</p>';
    return;
  }

  historyList.innerHTML = runs
    .map(
      (run) => `
    <article class="run-card" data-run-id="${run.id}" role="listitem" aria-label="Run on ${formatDate(run.startTime)}">
      <div class="run-card-info">
        <span class="run-card-date">${formatDate(run.startTime)}</span>
        <span class="run-card-time">${formatTime(run.startTime)}</span>
      </div>
      <div class="run-card-stats">
        <div class="run-card-stat">
          <span class="run-card-stat-value" aria-label="Distance">${formatDistance(run.distance)}</span>
          <span class="run-card-stat-label">Distance</span>
        </div>
        <div class="run-card-stat">
          <span class="run-card-stat-value" aria-label="Duration">${formatDuration(run.duration)}</span>
          <span class="run-card-stat-label">Duration</span>
        </div>
      </div>
    </article>
  `
    )
    .join('');

  // Add click handlers to show routes
  historyList.querySelectorAll<HTMLElement>('.run-card').forEach((card) => {
    card.addEventListener('click', () => {
      const runId = card.dataset.runId;
      const run = runs.find((r) => r.id === runId);
      if (run && run.coordinates) {
        showHistoryRoute(run.coordinates);
        closeHistory(false); // Don't clear the route we just drew
      }
    });
  });
}

/**
 * Handle distance updates from tracker
 */
function handleDistanceUpdate(distance: number): void {
  distanceDisplay.textContent = formatDistance(distance);
}

/**
 * Initialize the app
 */
async function init(): Promise<void> {
  // Initialize map
  await initMap();

  // Set up tracker callbacks
  setOnDistanceUpdate(handleDistanceUpdate);
  setOnStateChange(updateUI);

  // Set up event listeners
  playPauseBtn.addEventListener('click', handlePlayPause);
  finishBtn.addEventListener('click', handleFinish);
  recenterBtn.addEventListener('click', handleRecenter);
  historyToggle.addEventListener('click', toggleHistory);
  historyClose.addEventListener('click', closeHistory);

  // Enable buttons now that listeners are attached
  playPauseBtn.disabled = false;
  finishBtn.disabled = false;
  recenterBtn.disabled = false;
  historyToggle.disabled = false;
  historyClose.disabled = false;

  // Initial UI state
  updateUI('stopped');

  // Reveal the UI now that everything is ready
  document.body.classList.add('ready');

  console.log('Run Tracker initialized!');
}

// Start the app
init();
