import './style.css';
import { initMap, centerOnUser, showHistoryRoute, clearHistoryRoute } from './map.js';
import { 
  startTracking, 
  pauseTracking, 
  finishRun, 
  getState, 
  getElapsedTime,
  getCurrentDistance,
  getLastPosition,
  setOnDistanceUpdate, 
  setOnStateChange 
} from './run-tracker.js';
import { formatDistance, formatDuration, formatDate, formatTime } from './units.js';
import { getRuns } from './storage.js';

// DOM Elements
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const finishBtn = document.getElementById('finish-btn');
const recenterBtn = document.getElementById('recenter-btn');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const historyClose = document.getElementById('history-close');
const historyList = document.getElementById('history-list');
const durationDisplay = document.getElementById('duration');
const distanceDisplay = document.getElementById('distance');

// Animation frame ID for timer
let timerFrameId = null;

/**
 * Update the timer display
 */
function updateTimer() {
  if (getState() === 'running') {
    durationDisplay.textContent = formatDuration(getElapsedTime());
    timerFrameId = requestAnimationFrame(updateTimer);
  }
}

/**
 * Start the timer animation loop
 */
function startTimer() {
  if (timerFrameId) cancelAnimationFrame(timerFrameId);
  timerFrameId = requestAnimationFrame(updateTimer);
}

/**
 * Stop the timer animation loop
 */
function stopTimer() {
  if (timerFrameId) {
    cancelAnimationFrame(timerFrameId);
    timerFrameId = null;
  }
}

/**
 * Update UI based on run state
 */
function updateUI(state) {
  playPauseBtn.dataset.state = state;
  
  switch (state) {
    case 'stopped':
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      finishBtn.style.display = 'none';
      durationDisplay.textContent = '00:00:00';
      distanceDisplay.textContent = formatDistance(0);
      stopTimer();
      break;
      
    case 'running':
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      finishBtn.style.display = 'block';
      startTimer();
      break;
      
    case 'paused':
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      finishBtn.style.display = 'block';
      stopTimer();
      // Keep showing current values
      durationDisplay.textContent = formatDuration(getElapsedTime());
      break;
  }
}

/**
 * Handle play/pause button click
 */
function handlePlayPause() {
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
function handleFinish() {
  if (confirm('Finish this run?')) {
    finishRun();
    renderHistory();
  }
}

/**
 * Handle re-center button click
 */
function handleRecenter() {
  const pos = getLastPosition();
  if (pos) {
    centerOnUser(pos.lng, pos.lat);
  } else {
    // Try to get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        centerOnUser(position.coords.longitude, position.coords.latitude);
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
function toggleHistory() {
  historyPanel.classList.toggle('open');
  if (historyPanel.classList.contains('open')) {
    renderHistory();
    clearHistoryRoute();
  }
}

/**
 * Close history panel
 */
function closeHistory() {
  historyPanel.classList.remove('open');
  clearHistoryRoute();
}

/**
 * Render run history list
 */
function renderHistory() {
  const runs = getRuns();
  
  if (runs.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No runs yet. Start your first run!</p>';
    return;
  }
  
  historyList.innerHTML = runs.map(run => `
    <div class="run-card" data-run-id="${run.id}">
      <div class="run-card-info">
        <span class="run-card-date">${formatDate(run.startTime)}</span>
        <span class="run-card-time">${formatTime(run.startTime)}</span>
      </div>
      <div class="run-card-stats">
        <div class="run-card-stat">
          <span class="run-card-stat-value">${formatDistance(run.distance)}</span>
          <span class="run-card-stat-label">Distance</span>
        </div>
        <div class="run-card-stat">
          <span class="run-card-stat-value">${formatDuration(run.duration)}</span>
          <span class="run-card-stat-label">Duration</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers to show routes
  historyList.querySelectorAll('.run-card').forEach(card => {
    card.addEventListener('click', () => {
      const runId = card.dataset.runId;
      const run = runs.find(r => r.id === runId);
      if (run && run.coordinates) {
        showHistoryRoute(run.coordinates);
        closeHistory();
      }
    });
  });
}

/**
 * Handle distance updates from tracker
 */
function handleDistanceUpdate(distance) {
  distanceDisplay.textContent = formatDistance(distance);
}

/**
 * Initialize the app
 */
async function init() {
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
  
  // Initial UI state
  updateUI('stopped');
  
  console.log('Run Tracker initialized!');
}

// Start the app
init();

