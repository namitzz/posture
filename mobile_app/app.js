// Global error logging — surface silent failures to the console
window.addEventListener('error', (e) => {
  console.error('[GlobalError]', e.message, 'at', e.filename + ':' + e.lineno + ':' + e.colno, e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledPromise]', e.reason);
});

const POSTUR_BUILD = 'v15-exercises-voice-doubletap';
console.log('[Init] postur', POSTUR_BUILD, 'app.js parsing started');

const POSTUR_DEV_RESET_ON_RELOAD = true;

if (POSTUR_DEV_RESET_ON_RELOAD) {
  try {
    [
      'postur_settings',
      'postur_history',
      'postur_records',
      'postur_streak',
      'postur_achievements',
      'postur_onboarded',
      'postur_cam_asked',
    ].forEach((key) => localStorage.removeItem(key));

    sessionStorage.removeItem('postur_session_started');
    console.log('[DevReset] Cleared Postur local/session state on reload');
  } catch (err) {
    console.warn('[DevReset] Failed to clear state:', err);
  }
}

/* ---------- DOM helpers ------------------------------------- */

const $ = (id) => document.getElementById(id);
const D = $;

function on(id, event, handler) {
  const el = D(id);
  if (el) el.addEventListener(event, handler);
  else console.warn(`[DOM] #${id} not found for ${event} listener`);
}

function safeText(id, value) {
  const el = D(id);
  if (el) el.textContent = value;
}

function safeHTML(id, value) {
  const el = D(id);
  if (el) el.innerHTML = value;
}

function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}

function loadJ(k) {
  try {
    return JSON.parse(localStorage.getItem(k)) || {};
  } catch {
    return {};
  }
}

function saveJ(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}

/* ---------- Camera permission modal fallback ---------------- */

window.showCamPermission = function showCamPermission() {
  const modal = D('camPermission');
  if (modal) modal.classList.remove('hidden');
  else console.warn('[showCamPermission] #camPermission element not found');
};

function _resolveStartWorkout() {
  if (typeof posturBeginWorkout === 'function') return posturBeginWorkout;
  if (typeof window !== 'undefined' && typeof window.posturBeginWorkout === 'function') return window.posturBeginWorkout;
  if (typeof window !== 'undefined' && typeof window.startWorkout === 'function') return window.startWorkout;
  if (typeof globalThis !== 'undefined' && typeof globalThis.posturBeginWorkout === 'function') return globalThis.posturBeginWorkout;
  return null;
}

document.addEventListener('click', (e) => {
  const allow = e.target.closest && e.target.closest('#camPermAllow');
  const cancel = e.target.closest && e.target.closest('#camPermCancel');

  if (allow) {
    console.log('[CamPerm] allow clicked');
    localStorage.setItem('postur_cam_asked', '1');

    const modal = D('camPermission');
    if (modal) modal.classList.add('hidden');

    const sw = _resolveStartWorkout();
    if (sw) {
      sw().catch((err) => console.error('[CamPerm] startWorkout threw:', err));
    } else {
      console.error('[CamPerm] posturBeginWorkout/startWorkout is not defined yet');
      alert('Workout function missing — reload the page and check console.');
    }
  }

  if (cancel) {
    console.log('[CamPerm] cancel clicked');
    const modal = D('camPermission');
    if (modal) modal.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.posturBuild = POSTUR_BUILD;
});

/* ---------- DOM refs ----------------------------------------- */

const splash = D('splash');
const appEl = D('app');
const video = D('camera');
const canvas = D('overlay');
const ctx = canvas ? canvas.getContext('2d') : null;
const cameraWrap = D('cameraWrap');
const placeholder = D('cameraPlaceholder');
const placeholderText = D('cameraPlaceholderText');
const countdownEl = D('countdown');
const countdownNum = D('countdownNum');
const framingHint = D('framingHint');
const toastEl = D('toast');

const hudStatus = D('hudStatus');
const hudTimer = D('hudTimer');
const hudScore = D('hudScore');
const scoreRing = D('scoreRing');
const scoreValue = D('scoreValue');
const cueOverlay = D('cueOverlay');
const cueText = D('cueText');
const repFlash = D('repFlash');
const repFlashNum = D('repFlashNum');
const hudTempo = D('hudTempo');
const tempoValue = D('tempoValue');

const repsEl = D('reps');
const depthEl = D('depth');
const phaseEl = D('phase');
const angleEl = D('angle');
const depthCard = document.querySelector('.stat-depth');

const startBtn = D('startBtn');
const startNoCameraBtn = D('startNoCameraBtn') || {
  disabled: false,
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {},
};
const workoutCtrl = D('workoutControls');
const pauseBtn = D('pauseBtn');
const finishBtn = D('finishBtn');
const audioToggle = D('audioToggle');
const manualRepBtn = D('manualRepBtn');

const summaryEl = D('summary');
const summaryGrade = D('summaryGrade');
const summaryStats = D('summaryStats');
const summaryReps = D('summaryReps');
const summaryTempo = D('summaryTempo');
const newSetBtn = D('newSetBtn');

const historyBtn = D('historyBtn');
const historyPanel = D('historyPanel');
const closeHistory = D('closeHistory');
const historyList = D('historyList');

const settingsBtn = D('settingsBtn');
const settingsPanel = D('settingsPanel');
const closeSettings = D('closeSettings');

const onboardingEl = D('onboarding');
const onboardingNext = D('onboardingNext');
const camFlipBtn = D('camFlipBtn');

const streakBtn = D('streakBtn');
const streakCount = D('streakCount');
const recordsPanel = D('recordsPanel');
const closeRecords = D('closeRecords');
const recordsBody = D('recordsBody');

const confettiCanvas = D('confetti');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

const pbBanner = D('pbBanner');
const pbText = D('pbText');

const aiCoachBtn = D('aiCoachBtn');
const aiCoachBtnText = D('aiCoachBtnText');
const aiCoaching = D('aiCoaching');
const aiCoachingText = D('aiCoachingText');

/* ---------- Utilities ---------------------------------------- */

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function calcAngle(a, b, c) {
  const ba = [a.x - b.x, a.y - b.y];
  const bc = [c.x - b.x, c.y - b.y];
  const dot = ba[0] * bc[0] + ba[1] * bc[1];
  const mag = Math.hypot(...ba) * Math.hypot(...bc) + 1e-6;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

/* ---------- Settings ----------------------------------------- */

const DEFS = {
  frontCam: true,
  voice: true,
  haptic: true,
  countdown: false,
  depthTarget: 90,
  restDuration: 60,
  userName: '',
  exercise: 'bodyweight_squat',
};

const EXERCISE_FALLBACK = [
  { id: 'bodyweight_squat', label: 'Bodyweight Squat', category: 'legs', equipment: 'none', equipmentType: 'none', trackingMode: 'camera', supported: true, primaryMetric: 'kneeAngle' },
  { id: 'plank', label: 'Plank', category: 'core', equipment: 'none', equipmentType: 'none', trackingMode: 'timer', supported: false, primaryMetric: 'holdTime' },
  { id: 'lunge', label: 'Lunge', category: 'legs', equipment: 'none', equipmentType: 'none', trackingMode: 'manual', supported: false },
  { id: 'pushup', label: 'Push-up', category: 'chest', equipment: 'none', equipmentType: 'none', trackingMode: 'manual', supported: false },
];
let EXERCISE_LIST = [...EXERCISE_FALLBACK];
let EXERCISES = Object.fromEntries(EXERCISE_LIST.map((e) => [e.id, e]));
function getExercise() {
  return EXERCISES[settings.exercise] || EXERCISES.bodyweight_squat || EXERCISE_FALLBACK[0];
}
function getExerciseLabel(id) { return (EXERCISES[id] && EXERCISES[id].label) || 'Exercise'; }
function isCameraExercise(ex) { return ex && ex.trackingMode === 'camera' && ex.supported; }
async function loadExercises() {
  try {
    const res = await fetch('./data/exercises.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`exercise load failed: ${res.status}`);
    const list = await res.json();
    if (Array.isArray(list) && list.length) {
      EXERCISE_LIST = list;
      EXERCISES = Object.fromEntries(list.filter((e) => e && e.id).map((e) => [e.id, e]));
    }
  } catch (err) {
    console.warn('[Exercise] using fallback dataset:', err);
  }
}

// Load + safe migration. Existing users may have postur_settings without
// `frontCam` or `exercise`. Don't overwrite anything they explicitly set.
const _storedSettings = loadJ('postur_settings');
const _hadStoredSettings = _storedSettings && Object.keys(_storedSettings).length > 0;
let settings = { ...DEFS, ..._storedSettings };
if (_hadStoredSettings) {
  if (!Object.prototype.hasOwnProperty.call(_storedSettings, 'frontCam')) settings.frontCam = true;
  if (!Object.prototype.hasOwnProperty.call(_storedSettings, 'exercise')) settings.exercise = 'bodyweight_squat';
}
let audioOn = true;

function saveSets() {
  saveJ('postur_settings', settings);
}

// ── Voice ───────────────────────────────────────────────────
// Cache the chosen voice (voices load asynchronously in some browsers).
let _posturVoice = null;
let _voiceTried = false;
const _PREFERRED_VOICE_NAMES = [
  // Most natural-sounding neural voices first (Edge/Windows 11)
  'Microsoft Ava Online (Natural) - English (United States)',
  'Microsoft Ava Online (Natural)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Aria Online (Natural)',
  'Microsoft Emma Online (Natural)',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Microsoft Sonia Online (Natural)',
  'Microsoft Libby Online (Natural)',
  'Microsoft Guy Online (Natural)',
  'Microsoft Ryan Online (Natural)',
  // Apple enhanced/premium voices (iOS/macOS) — much more natural than default
  'Samantha (Enhanced)', 'Ava (Premium)', 'Evan (Enhanced)', 'Allison (Enhanced)',
  'Serena (Premium)', 'Daniel (Enhanced)', 'Karen (Enhanced)', 'Moira (Enhanced)',
  // Google / fallbacks
  'Google UK English Female', 'Google US English', 'Google UK English Male',
  'Microsoft Sonia', 'Microsoft Aria', 'Microsoft Ryan',
  'Samantha', 'Daniel', 'Karen', 'Moira', 'Tessa',
];

let _voicesLogged = false;
function _pickVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  if (!_voicesLogged) {
    _voicesLogged = true;
    try {
      console.table(voices.map((v) => ({ name: v.name, lang: v.lang, localService: v.localService })));
    } catch (_e) {}
  }

  // 1) Exact name match in preferred order
  for (const name of _PREFERRED_VOICE_NAMES) {
    const v = voices.find((x) => x.name === name);
    if (v) { console.log('[Voice] selected:', v.name, v.lang); return v; }
  }

  // 2) Fuzzy match for natural/neural/enhanced/premium voices, English first
  const NATURAL_KEYWORDS = ['Natural', 'Neural', 'Enhanced', 'Premium', 'Ava', 'Jenny', 'Aria', 'Sonia', 'Libby'];
  const isEnUS = (v) => /^en-US/i.test(v.lang);
  const isEnGB = (v) => /^en-GB/i.test(v.lang);
  const isEn   = (v) => /^en/i.test(v.lang);
  const hasNaturalKeyword = (v) =>
    !!v.name && NATURAL_KEYWORDS.some((k) => v.name.indexOf(k) !== -1);

  let v =
    voices.find((x) => hasNaturalKeyword(x) && isEnUS(x)) ||
    voices.find((x) => hasNaturalKeyword(x) && isEnGB(x)) ||
    voices.find((x) => hasNaturalKeyword(x) && isEn(x))   ||
    voices.find((x) => hasNaturalKeyword(x));

  // 3) Any English voice
  v = v ||
    voices.find(isEnUS) ||
    voices.find(isEnGB) ||
    voices.find(isEn);

  // 4) Last-resort fallback
  v = v || voices[0];

  if (v) console.log('[Voice] selected:', v.name, v.lang);
  return v;
}

function _ensureVoice() {
  if (_posturVoice || !window.speechSynthesis) return _posturVoice;
  _posturVoice = _pickVoice();
  if (!_posturVoice && !_voiceTried) {
    _voiceTried = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      _posturVoice = _pickVoice();
    });
  }
  return _posturVoice;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Trigger voice list load early
  try { window.speechSynthesis.getVoices(); } catch {}
  _ensureVoice();
}

// Throttle: ignore identical cues within 600ms to prevent spam.
let _lastSpoken = '';
let _lastSpokenAt = 0;
let _lastAnySpokenAt = 0;
function say(t, opts = {}) {
  if (!settings.voice || !audioOn || !window.speechSynthesis) return;
  const text = String(t || '').trim();
  if (!text) return;
  const now = Date.now();
  if (!opts.force && text === _lastSpoken && now - _lastSpokenAt < 2500) return;
  if (!opts.force && now - _lastAnySpokenAt < 900) return;
  _lastSpoken = text;
  _lastSpokenAt = now;
  _lastAnySpokenAt = now;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = _ensureVoice();
    if (v) u.voice = v;
    u.rate = 0.92;
    u.pitch = 1.05;
    u.volume = 1.0;
    u.lang = (v && v.lang) || 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (err) {
    console.warn('[say] speech failed:', err);
  }
}

function haptic(p) {
  if (settings.haptic && navigator.vibrate) navigator.vibrate(p);
}

function applyUI() {
  const set = (id, prop, val) => {
    const el = D(id);
    if (el) el[prop] = val;
  };

  set('setFrontCam', 'checked', settings.frontCam);
  set('setVoice', 'checked', settings.voice);
  set('setHaptic', 'checked', settings.haptic);
  set('setCountdown', 'checked', settings.countdown);
  set('setDepth', 'value', settings.depthTarget);
  set('setRest', 'value', settings.restDuration);
}

applyUI();
setTimeout(updateGreeting, 0);

for (const [id, key] of [
  ['setFrontCam', 'frontCam'],
  ['setVoice', 'voice'],
  ['setHaptic', 'haptic'],
  ['setCountdown', 'countdown'],
]) {
  on(id, 'change', (e) => {
    settings[key] = e.target.checked;
    saveSets();
  });
}

on('setDepth', 'change', (e) => {
  settings.depthTarget = Math.max(60, Math.min(120, +e.target.value || 90));
  e.target.value = settings.depthTarget;
  saveSets();
});

on('setRest', 'change', (e) => {
  settings.restDuration = Math.max(10, Math.min(300, +e.target.value || 60));
  e.target.value = settings.restDuration;
  saveSets();
});

// Voice test button — gives the user immediate feedback that voice works.
on('testVoiceBtn', 'click', () => {
  // Force-bypass throttle for the test by clearing the dedup state.
  _lastSpoken = '';
  _lastSpokenAt = 0;
  if (!window.speechSynthesis) {
    if (typeof showToast === 'function') showToast('Voice not supported on this browser', 'error', 3000);
    return;
  }
  if (!settings.voice) {
    if (typeof showToast === 'function') showToast('Voice cues are turned off', 'info', 3000);
    return;
  }
  say('Postur voice feedback is ready.', { force: true });
});

/* ---------- Exercise selector ------------------------------- */

function renderExerciseChips() {
  const wrap = D('exerciseOptions');
  if (wrap) {
    wrap.innerHTML = EXERCISE_LIST.map((ex) => `<button type="button" class="exercise-chip" data-exercise="${ex.id}">${ex.label}</button>`).join('');
  }
  const chips = document.querySelectorAll('.exercise-chip');
  chips.forEach((chip) => {
    const isSelected = chip.dataset.exercise === settings.exercise;
    chip.classList.toggle('selected', isSelected);
    chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

document.addEventListener('click', (e) => {
  const chip = e.target && e.target.closest && e.target.closest('.exercise-chip');
  if (!chip) return;
  const ex = chip.dataset.exercise;
  if (!ex || !EXERCISES[ex]) return;
  settings.exercise = ex;
  saveSets();
  renderExerciseChips();
});

loadExercises().then(() => {
  if (!EXERCISES[settings.exercise]) settings.exercise = 'bodyweight_squat';
  renderExerciseChips();
});

/* ---------- State -------------------------------------------- */

let FilesetResolver, PoseLandmarker;
const MEDIAPIPE_VERSION = '0.10.14';
const MEDIAPIPE_CDN_TIMEOUT_MS = 8000;
const MEDIAPIPE_BUNDLES = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.js`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.js`,
  `https://fastly.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.js`,
];

let landmarker = null;
let stream = null;
let running = false;
let paused = false;
let phase = 'standing';
let repCount = 0;
let minAngle = 180;
let hadValgus = false;
let hadLean = false;
let setData = [];
let timerStart = 0;
let timerInterval = null;
let lastCueTime = 0;
let lastCueMsg = '';
let formScore = 100;
let repStartTime = 0;
let restInterval = null;
let restRemaining = 0;
let standingHipY = null;
let standingKneeY = null;
let depthGuideY = null;
let noCameraMode = false;
let manualMode = false;
let elapsedMsBeforePause = 0;
let lastPersonSeenAt = 0;
let wakeLock = null;
let splashHidden = false;
let audioUnlocked = false;

const THRESH = {
  descent: 170,
  bottom: 150,
  ascent: 155,
  stand: 168,
  valgus: 0.12,
};

/* ---------- Name screen -------------------------------------- */

function showNameScreenIfNeeded() {
  if (settings.userName) return false;
  const nameScreen = D('nameScreen');
  if (nameScreen) nameScreen.classList.remove('hidden');
  return true;
}

function finishNameScreen() {
  const nameScreen = D('nameScreen');
  if (nameScreen) nameScreen.classList.add('hidden');
  if (appEl) appEl.classList.remove('hidden');
  updateGreeting();
}

on('nameInput', 'input', (e) => {
  const submit = D('nameSubmit');
  if (submit) submit.disabled = !e.target.value.trim();
});

on('nameSubmit', 'click', () => {
  const input = D('nameInput');
  const name = input ? input.value.trim() : '';
  if (name) {
    settings.userName = name;
    saveSets();
  }
  finishNameScreen();
});

on('nameSkip', 'click', finishNameScreen);

function updateGreeting() {
  const el = D('topbarGreeting');
  const nameDisp = D('settingsNameDisplay');

  if (settings.userName) {
    if (el) {
      el.textContent = 'hey, ' + settings.userName;
      el.classList.remove('hidden');
    }
    if (nameDisp) nameDisp.textContent = settings.userName;
  } else {
    if (el) el.classList.add('hidden');
    if (nameDisp) nameDisp.textContent = 'not set';
  }
}

function updateHomeCard() {
  const card = D('homeCard');
  if (!card) return;

  const sets = loadJ('postur_history').sets || [];
  const streak = loadJ('postur_streak');
  const totalSets = sets.length;
  const avg = totalSets ? Math.round(sets.reduce((sum, s) => sum + (s.score || s.avgScore || 0), 0) / totalSets) : null;

  safeText('homeStreak', streak.current || 0);
  safeText('homeSets', totalSets);
  safeText('homeAvg', avg !== null ? avg : '--');
}

setTimeout(() => {
  updateHomeCard();
  updateStreak();
}, 0);

on('changeNameBtn', 'click', () => {
  const name = prompt('Enter your name:', settings.userName || '');
  if (name !== null) {
    settings.userName = name.trim();
    saveSets();
    updateGreeting();
  }
});

/* ---------- Onboarding --------------------------------------- */

let onboardPage = 0;

function showOnboarding() {
  if (localStorage.getItem('postur_onboarded')) return false;
  if (onboardingEl) onboardingEl.classList.remove('hidden');
  return true;
}

if (onboardingNext && onboardingEl) {
  onboardingNext.addEventListener('click', () => {
    onboardPage++;

    if (onboardPage >= 3) {
      localStorage.setItem('postur_onboarded', '1');
      onboardingEl.classList.add('hidden');

      if (!showNameScreenIfNeeded()) {
        if (appEl) appEl.classList.remove('hidden');
        updateGreeting();
      }
      return;
    }

    onboardingEl.querySelectorAll('.onboarding-page').forEach((p, i) => {
      p.classList.toggle('active', i === onboardPage);
    });

    onboardingEl.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === onboardPage);
    });

    if (onboardPage === 2) onboardingNext.textContent = "let's gooo";
  });
}

function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;

  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.classList.add('hidden'), 500);
  }

  if (!showOnboarding() && !showNameScreenIfNeeded()) {
    if (appEl) appEl.classList.remove('hidden');
  }
}

window.addEventListener('load', () => {
  setTimeout(hideSplash, 800);
});

setTimeout(hideSplash, 3500);

/* ---------- Wake lock + audio unlock ------------------------- */

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;

  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch (err) {
    console.warn('[WakeLock] Failed to acquire:', err);
  }
}

function unlockAudio() {
  if (audioUnlocked || !window.speechSynthesis) return;

  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    audioUnlocked = true;
  } catch (err) {
    console.warn('[Audio] Failed to unlock audio context:', err);
  }
}

/* ---------- Toast -------------------------------------------- */

let toastTimeout = null;

function showToast(msg, kind = 'info', duration = 3500) {
  if (!toastEl) return;

  toastEl.textContent = msg;
  toastEl.className = 'toast ' + kind;
  toastEl.classList.remove('hidden');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

function diagToast(msg, kind = 'info') {
  showToast(msg, kind, 4000);
  console.log('[Diag]', msg);
}

/* ---------- Panel navigation --------------------------------- */

function openPanel(panel) {
  if (!panel) return;
  panel.classList.remove('hidden', 'closing');
}

function closePanel(panel) {
  if (!panel) return;
  panel.classList.add('closing');
  setTimeout(() => {
    panel.classList.add('hidden');
    panel.classList.remove('closing');
  }, 250);
}

on('historyBtn', 'click', () => {
  renderHistory();
  openPanel(historyPanel);
});

on('closeHistory', 'click', () => closePanel(historyPanel));

on('streakBtn', 'click', () => {
  renderRecords();
  openPanel(recordsPanel);
});

on('closeRecords', 'click', () => closePanel(recordsPanel));

on('settingsBtn', 'click', () => openPanel(settingsPanel));
on('closeSettings', 'click', () => closePanel(settingsPanel));

on('openGuide', 'click', () => {
  closePanel(settingsPanel);
  setTimeout(() => openPanel(D('guidePanel')), 300);
});

on('closeGuide', 'click', () => closePanel(D('guidePanel')));

on('clearDataBtn', 'click', () => {
  if (confirm('Clear all workout data? This cannot be undone.')) {
    localStorage.removeItem('postur_history');
    localStorage.removeItem('postur_records');
    localStorage.removeItem('postur_streak');
    localStorage.removeItem('postur_achievements');
    updateHomeCard();
    updateStreak();
    alert('Data cleared.');
  }
});

/* ---------- Streak ------------------------------------------- */

function getStreak() {
  return loadJ('postur_streak');
}

function updateStreak() {
  const s = getStreak();
  if (streakCount) streakCount.textContent = s.current || 0;
  if (streakBtn) streakBtn.classList.toggle('inactive', !(s.current > 0));
}

function bumpStreak() {
  const s = getStreak();
  const today = new Date().toDateString();

  if (s.lastDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (s.lastDate === yesterday) s.current = (s.current || 0) + 1;
  else s.current = 1;

  s.best = Math.max(s.best || 0, s.current);
  s.lastDate = today;
  saveJ('postur_streak', s);
  updateStreak();
}

/* ---------- History ------------------------------------------ */

function loadHistory() {
  return loadJ('postur_history').sets || [];
}

function saveHist(sets) {
  saveJ('postur_history', { sets });
}

function renderHistory() {
  const sets = loadHistory();
  const el = D('historyList');
  if (!el) return;

  if (!sets.length) {
    el.innerHTML = '<p class="empty-state">No workouts yet. Start your first set!</p>';
    return;
  }

  el.innerHTML = sets.slice().reverse().map((s) => {
    const g = String(s.grade || 'C').toLowerCase();
    // exerciseLabel may be missing on old history entries — fall back gracefully.
    const exLabel = s.exerciseLabel || (s.exercise && EXERCISES[s.exercise] && EXERCISES[s.exercise].label) || '';
    const dateText = new Date(s.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `
      <div class="history-item">
        <div class="history-item-top">
          <span class="history-date">${exLabel ? `${exLabel} · ` : ''}${dateText}</span>
          <span class="history-grade ${g}">${s.grade || '-'}</span>
        </div>
        <div class="history-item-stats">
          <span>Reps<strong>${s.reps || 0}</strong></span>
          <span>Avg Depth<strong>${s.avgDepth || '--'}°</strong></span>
          <span>Duration<strong>${s.duration || '00:00'}</strong></span>
        </div>
      </div>`;
  }).join('');
}

/* ---------- Records ------------------------------------------ */

function getRecords() {
  return loadJ('postur_records');
}

function checkPB(setResult) {
  const r = getRecords();
  const pbs = [];

  if (!r.bestRepScore || setResult.bestRep > r.bestRepScore) {
    r.bestRepScore = setResult.bestRep;
    r.bestRepDate = new Date().toISOString();
    pbs.push('Best Single Rep Score');
  }

  if (!r.bestAvgScore || setResult.avgScore > r.bestAvgScore) {
    r.bestAvgScore = setResult.avgScore;
    r.bestAvgDate = new Date().toISOString();
    pbs.push('Best Avg Set Score');
  }

  if (!r.mostReps || setResult.reps > r.mostReps) {
    r.mostReps = setResult.reps;
    r.mostRepsDate = new Date().toISOString();
    pbs.push('Most Reps in a Set');
  }

  const streak = getStreak();
  if (!r.longestStreak || (streak.current || 0) > r.longestStreak) {
    r.longestStreak = streak.current;
  }

  saveJ('postur_records', r);
  return pbs;
}

function renderRecords() {
  const r = getRecords();
  const body = D('recordsBody');
  if (!body) return;

  const cards = [
    { icon: '⚡', bg: 'var(--green-dim)', label: 'Best Rep Score', value: r.bestRepScore || '--', meta: r.bestRepDate ? new Date(r.bestRepDate).toLocaleDateString() : '' },
    { icon: '🎯', bg: 'var(--yellow-dim)', label: 'Best Avg Set Score', value: r.bestAvgScore || '--', meta: r.bestAvgDate ? new Date(r.bestAvgDate).toLocaleDateString() : '' },
    { icon: '💪', bg: 'var(--orange-dim)', label: 'Most Reps in a Set', value: r.mostReps || '--', meta: r.mostRepsDate ? new Date(r.mostRepsDate).toLocaleDateString() : '' },
    { icon: '🔥', bg: 'var(--red-dim)', label: 'Longest Streak', value: (r.longestStreak || 0) + ' days', meta: '' },
  ];

  body.innerHTML = cards.map((c) => `
    <div class="record-card">
      <div class="record-icon" style="background:${c.bg}">${c.icon}</div>
      <div class="record-info">
        <div class="record-label">${c.label}</div>
        <div class="record-value">${c.value}</div>
        ${c.meta ? `<div class="record-meta">${c.meta}</div>` : ''}
      </div>
    </div>`).join('');
}

/* ---------- Confetti ----------------------------------------- */

function fireConfetti() {
  if (!confettiCanvas || !confettiCtx) return;

  confettiCanvas.classList.remove('hidden');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#45b5ff', '#a855f7', '#ffffff'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10 - Math.random() * 200,
      w: 4 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    });
  }

  function draw() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rot += p.rv;
      p.life -= 0.005;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rot * Math.PI) / 180);
      confettiCtx.globalAlpha = Math.max(0, p.life);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      confettiCtx.restore();
    }

    if (alive) requestAnimationFrame(draw);
    else {
      confettiCanvas.classList.add('hidden');
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  requestAnimationFrame(draw);
}

/* ---------- Achievements ------------------------------------- */

const ACHIEVEMENTS = [
  { id: 'first_set', name: 'First Steps', desc: 'Complete your first set', icon: '👶', bg: 'var(--green-dim)' },
  { id: 'perfect_rep', name: 'Flawless', desc: 'Score 100 on a single rep', icon: '💎', bg: 'var(--yellow-dim)' },
  { id: 'clean_5', name: 'Clean Machine', desc: '5 reps with no form issues', icon: '✨', bg: 'var(--green-dim)' },
  { id: 'ten_rep_set', name: 'Marathon', desc: 'Complete a 10-rep set', icon: '🏃', bg: 'var(--orange-dim)' },
  { id: 'streak_3', name: 'On a Roll', desc: '3-day workout streak', icon: '🔥', bg: 'var(--orange-dim)' },
  { id: 'streak_7', name: 'Locked In', desc: '7-day workout streak', icon: '🔒', bg: 'var(--red-dim)' },
  { id: 'avg_90', name: 'Elite Form', desc: 'Average score 90+ in a set', icon: '👑', bg: 'var(--yellow-dim)' },
  { id: 'reps_50', name: 'Grinder', desc: '50 lifetime reps', icon: '💪', bg: 'var(--orange-dim)' },
  { id: 'reps_100', name: 'Centurion', desc: '100 lifetime reps', icon: '🏆', bg: 'var(--green-dim)' },
];

function getAchievements() {
  return loadJ('postur_achievements');
}

function checkAchievements(setResult) {
  const a = getAchievements();
  const hist = loadHistory();
  const streak = getStreak();
  const lifetimeReps = hist.reduce((s, h) => s + (h.reps || 0), 0);
  const lifetimeSets = hist.length;
  const cleanInSet = setResult.setData.filter((r) => !r.hadValgus && !r.hadLean && r.minAngle <= settings.depthTarget + 15).length;
  const bestRepInSet = setResult.setData.length ? Math.max(...setResult.setData.map((r) => r.score || 0)) : 0;

  const ctxObj = {
    lifetimeSets,
    lifetimeReps,
    cleanInSet,
    bestRepInSet,
    avgScoreInSet: setResult.avgScore,
    repsInSet: setResult.reps,
    currentStreak: streak.current || 0,
  };

  const checks = {
    first_set: () => ctxObj.lifetimeSets >= 1,
    perfect_rep: () => ctxObj.bestRepInSet >= 100,
    clean_5: () => ctxObj.cleanInSet >= 5,
    ten_rep_set: () => ctxObj.repsInSet >= 10,
    streak_3: () => ctxObj.currentStreak >= 3,
    streak_7: () => ctxObj.currentStreak >= 7,
    avg_90: () => ctxObj.avgScoreInSet >= 90,
    reps_50: () => ctxObj.lifetimeReps >= 50,
    reps_100: () => ctxObj.lifetimeReps >= 100,
  };

  const newUnlocks = [];

  for (const ach of ACHIEVEMENTS) {
    if (a[ach.id]) continue;
    if (checks[ach.id] && checks[ach.id]()) {
      a[ach.id] = { unlocked: true, date: new Date().toISOString() };
      newUnlocks.push(ach);
    }
  }

  saveJ('postur_achievements', a);
  return newUnlocks;
}

function showAchievementToast(ach) {
  const toast = D('achieveToast');
  if (!toast) return;

  safeText('achieveToastIcon', ach.icon);
  safeText('achieveToastTitle', ach.name);
  safeText('achieveToastDesc', ach.desc);

  toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function renderAchievements() {
  const a = getAchievements();
  const unlocked = ACHIEVEMENTS.filter((ach) => a[ach.id]);

  safeHTML('achieveSummary', `
    <div>
      <div class="achieve-summary-count">${unlocked.length}/${ACHIEVEMENTS.length}</div>
      <div class="achieve-summary-label">unlocked</div>
    </div>
    <div class="achieve-summary-bar">
      <div class="achieve-summary-fill" style="width:${(unlocked.length / ACHIEVEMENTS.length) * 100}%"></div>
    </div>`);

  safeHTML('achieveGrid', ACHIEVEMENTS.map((ach) => {
    const u = a[ach.id];
    return `
      <div class="achieve-card${u ? '' : ' locked'}">
        <div class="achieve-card-icon" style="background:${ach.bg}">${ach.icon}</div>
        <div class="achieve-card-info">
          <span class="achieve-card-name">${ach.name}</span>
          <span class="achieve-card-desc">${ach.desc}</span>
          ${u ? `<span class="achieve-card-date">${new Date(u.date).toLocaleDateString()}</span>` : ''}
        </div>
      </div>`;
  }).join(''));
}

on('achieveBtn', 'click', () => {
  renderAchievements();
  openPanel(D('achievePanel'));
});

on('closeAchieve', 'click', () => closePanel(D('achievePanel')));

/* ---------- Analytics ---------------------------------------- */

function renderAnalytics() {
  renderTotalStats();
  drawScoreTrend();
  renderWeekHeatmap();
  drawIssuesChart();
}

function renderTotalStats() {
  const hist = loadHistory();
  const totalSets = hist.length;
  const totalReps = hist.reduce((s, h) => s + (h.reps || 0), 0);
  const avgScore = totalSets ? Math.round(hist.reduce((s, h) => s + (h.avgScore || 0), 0) / totalSets) : 0;
  const streak = getStreak();

  safeHTML('analyticsTotals', [
    { v: totalReps, l: 'Total Reps' },
    { v: totalSets, l: 'Total Sets' },
    { v: avgScore || '--', l: 'Avg Score' },
    { v: (streak.best || 0) + 'd', l: 'Best Streak' },
  ].map((s) => `
    <div class="analytics-stat">
      <span class="analytics-stat-value">${s.v}</span>
      <span class="analytics-stat-label">${s.l}</span>
    </div>`).join(''));
}

function setupCanvas(c) {
  if (!c) return null;
  const dpr = window.devicePixelRatio || 1;
  c.width = c.clientWidth * dpr;
  c.height = c.clientHeight * dpr;
  const cx = c.getContext('2d');
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return cx;
}

function drawScoreTrend() {
  const c = D('trendCanvas');
  const cx = setupCanvas(c);
  if (!c || !cx) return;

  const w = c.clientWidth;
  const h = c.clientHeight;
  const hist = loadHistory().slice(-20);

  if (!hist.length) {
    cx.fillStyle = 'rgba(255,255,255,0.3)';
    cx.font = '13px Inter';
    cx.textAlign = 'center';
    cx.fillText('No data yet', w / 2, h / 2);
    return;
  }

  const pad = { t: 12, r: 12, b: 24, l: 32 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  cx.strokeStyle = 'rgba(255,255,255,0.06)';
  cx.lineWidth = 1;

  for (const v of [40, 60, 80, 100]) {
    const y = pad.t + ch - ((v - 20) / 80) * ch;
    cx.beginPath();
    cx.moveTo(pad.l, y);
    cx.lineTo(w - pad.r, y);
    cx.stroke();
    cx.fillStyle = 'rgba(255,255,255,0.25)';
    cx.font = '9px Inter';
    cx.textAlign = 'right';
    cx.fillText(v, pad.l - 4, y + 3);
  }

  const pts = hist.map((s, i) => ({
    x: pad.l + (cw / Math.max(1, hist.length - 1)) * i,
    y: pad.t + ch - ((Math.max(20, Math.min(100, s.avgScore || s.score || 0)) - 20) / 80) * ch,
    score: s.avgScore || s.score || 0,
  }));

  const grad = cx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(34, 197, 94, 0.15)');
  grad.addColorStop(1, 'rgba(34, 197, 94, 0)');

  cx.beginPath();
  cx.moveTo(pts[0].x, pad.t + ch);
  pts.forEach((p) => cx.lineTo(p.x, p.y));
  cx.lineTo(pts[pts.length - 1].x, pad.t + ch);
  cx.fillStyle = grad;
  cx.fill();

  cx.beginPath();
  pts.forEach((p, i) => (i === 0 ? cx.moveTo(p.x, p.y) : cx.lineTo(p.x, p.y)));
  cx.strokeStyle = '#22c55e';
  cx.lineWidth = 2;
  cx.lineJoin = 'round';
  cx.stroke();

  pts.forEach((p) => {
    cx.beginPath();
    cx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    cx.fillStyle = p.score >= 80 ? '#22c55e' : p.score >= 60 ? '#eab308' : '#ef4444';
    cx.fill();
  });
}

function renderWeekHeatmap() {
  const hist = loadHistory();
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const mondayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  safeHTML('weekHeatmap', labels.map((l, i) => {
    const dayStart = mondayMs + i * 86400000;
    const dayEnd = dayStart + 86400000;
    const daySets = hist.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= dayStart && t < dayEnd;
    });

    let cls = '';
    if (daySets.length) {
      const best = Math.max(...daySets.map((s) => s.avgScore || s.score || 0));
      cls = best >= 80 ? ' active' : best >= 60 ? ' grade-b' : ' grade-c';
    }

    return `<div class="week-day"><span class="week-day-label">${l}</span><div class="week-day-dot${cls}"></div></div>`;
  }).join(''));
}

function drawIssuesChart() {
  const c = D('issuesCanvas');
  const cx = setupCanvas(c);
  if (!c || !cx) return;

  const w = c.clientWidth;
  const h = c.clientHeight;
  const hist = loadHistory();

  let totalReps = 0;
  let valgusCount = 0;
  let leanCount = 0;
  let shallowCount = 0;

  hist.forEach((s) => (s.repData || []).forEach((r) => {
    totalReps++;
    if (r.hadValgus) valgusCount++;
    if (r.hadLean) leanCount++;
    if (r.minAngle > (settings.depthTarget || 90) + 15) shallowCount++;
  }));

  if (!totalReps) {
    cx.fillStyle = 'rgba(255,255,255,0.3)';
    cx.font = '13px Inter';
    cx.textAlign = 'center';
    cx.fillText('No data yet', w / 2, h / 2);
    return;
  }

  const bars = [
    { label: 'Knee Valgus', pct: valgusCount / totalReps, color: '#ef4444' },
    { label: 'Forward Lean', pct: leanCount / totalReps, color: '#eab308' },
    { label: 'Shallow Depth', pct: shallowCount / totalReps, color: '#f97316' },
  ];

  const barH = 22;
  const gap = 16;
  const startY = 20;
  const labelW = 90;
  const barStart = labelW + 8;
  const maxBarW = w - barStart - 50;

  bars.forEach((b, i) => {
    const y = startY + i * (barH + gap);
    cx.fillStyle = 'rgba(255,255,255,0.4)';
    cx.font = '12px Inter';
    cx.textAlign = 'right';
    cx.fillText(b.label, labelW, y + barH / 2 + 4);

    cx.fillStyle = 'rgba(255,255,255,0.06)';
    cx.fillRect(barStart, y, maxBarW, barH);

    const bw = Math.max(2, b.pct * maxBarW);
    cx.fillStyle = b.color;
    cx.fillRect(barStart, y, bw, barH);

    cx.fillStyle = 'rgba(255,255,255,0.6)';
    cx.font = 'bold 11px Inter';
    cx.textAlign = 'left';
    cx.fillText(Math.round(b.pct * 100) + '%', barStart + bw + 6, y + barH / 2 + 4);
  });
}

on('analyticsBtn', 'click', () => {
  renderAnalytics();
  openPanel(D('analyticsPanel'));
});

on('closeAnalytics', 'click', () => closePanel(D('analyticsPanel')));

/* ---------- Warm-up ------------------------------------------ */

const WARMUP_EX = [
  { name: 'Bodyweight Squats', dur: 30, desc: 'Slow, controlled reps', fig: '<svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="30" cy="8" r="6"/><line x1="30" y1="14" x2="30" y2="40"/><line x1="16" y1="28" x2="44" y2="28"/><line x1="30" y1="40" x2="18" y2="56"/><line x1="30" y1="40" x2="42" y2="56"/><line x1="18" y1="56" x2="14" y2="74"/><line x1="42" y1="56" x2="46" y2="74"/></svg>' },
  { name: 'Leg Swings', dur: 30, desc: 'Forward & back, each leg', fig: '<svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="30" cy="8" r="6"/><line x1="30" y1="14" x2="30" y2="42"/><line x1="16" y1="26" x2="44" y2="26"/><line x1="30" y1="42" x2="22" y2="70"/><line x1="30" y1="42" x2="48" y2="58"/></svg>' },
  { name: 'Hip Circles', dur: 30, desc: 'Both directions', fig: '<svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="30" cy="8" r="6"/><line x1="30" y1="14" x2="30" y2="42"/><line x1="16" y1="26" x2="44" y2="26"/><ellipse cx="30" cy="38" rx="12" ry="8" stroke-dasharray="4 3"/><line x1="30" y1="42" x2="20" y2="70"/><line x1="30" y1="42" x2="40" y2="70"/></svg>' },
  { name: 'Ankle Rocks', dur: 20, desc: 'Rock forward over toes', fig: '<svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="30" cy="8" r="6"/><line x1="30" y1="14" x2="30" y2="42"/><line x1="16" y1="26" x2="44" y2="26"/><line x1="30" y1="42" x2="22" y2="62"/><line x1="30" y1="42" x2="38" y2="62"/><line x1="22" y1="62" x2="18" y2="74"/><line x1="38" y1="62" x2="42" y2="74"/><path d="M14 74 L48 74" stroke-dasharray="4 3"/></svg>' },
];

let warmupInterval = null;
let warmupIdx = 0;

function startWarmup() {
  warmupIdx = 0;
  showEl(D('warmupOverlay'));
  runWarmupExercise(0);
}

function runWarmupExercise(idx) {
  if (idx >= WARMUP_EX.length) {
    endWarmup();
    return;
  }

  warmupIdx = idx;
  const ex = WARMUP_EX[idx];

  safeText('warmupExName', ex.name);
  safeText('warmupExDesc', ex.desc);
  safeHTML('warmupFigure', ex.fig);
  safeText('warmupProgress', `${idx + 1} / ${WARMUP_EX.length}`);

  let remaining = ex.dur;
  const total = remaining;
  const circ = 326.73;

  safeText('warmupTime', remaining);
  const ring = D('warmupRing');
  if (ring) ring.style.strokeDashoffset = '0';

  say(ex.name);
  clearInterval(warmupInterval);

  warmupInterval = setInterval(() => {
    remaining--;
    safeText('warmupTime', Math.max(0, remaining));
    if (ring) ring.style.strokeDashoffset = ((total - remaining) / total * circ).toString();

    if (remaining <= 0) {
      clearInterval(warmupInterval);
      haptic([50, 100]);

      if (idx + 1 < WARMUP_EX.length) {
        say('next');
        runWarmupExercise(idx + 1);
      } else {
        say("warm-up done, let's cook");
        endWarmup();
      }
    }
  }, 1000);
}

function endWarmup() {
  clearInterval(warmupInterval);
  hideEl(D('warmupOverlay'));
}

on('warmupBtn', 'click', startWarmup);
on('warmupSkipEx', 'click', () => {
  clearInterval(warmupInterval);
  runWarmupExercise(warmupIdx + 1);
});
on('warmupCancel', 'click', endWarmup);

/* ---------- Weekly digest ------------------------------------ */

on('weeklyDigestBtn', 'click', async () => {
  const hist = loadHistory();
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSets = hist.filter((s) => new Date(s.date).getTime() >= weekAgo);

  if (!weekSets.length) {
    safeText('weeklyDigestBtnText', 'No sets this week');
    setTimeout(() => safeText('weeklyDigestBtnText', 'Get Weekly AI Digest'), 2500);
    return;
  }

  safeText('weeklyDigestBtnText', 'Analyzing week...');
  const btn = D('weeklyDigestBtn');
  if (btn) btn.disabled = true;

  const totalReps = weekSets.reduce((s, h) => s + (h.reps || 0), 0);
  const avgScore = Math.round(weekSets.reduce((s, h) => s + (h.avgScore || 0), 0) / weekSets.length);
  const scores = weekSets.map((s) => s.avgScore || 0);

  let valgus = 0;
  let lean = 0;
  let shallow = 0;
  let total = 0;

  weekSets.forEach((s) => (s.repData || []).forEach((r) => {
    total++;
    if (r.hadValgus) valgus++;
    if (r.hadLean) lean++;
    if (r.minAngle > 105) shallow++;
  }));

  const streak = getStreak();

  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'weekly_digest',
        weekData: {
          totalSets: weekSets.length,
          totalReps,
          avgScore,
          scoreProgression: scores,
          issueBreakdown: {
            valgus: total ? Math.round((valgus / total) * 100) : 0,
            lean: total ? Math.round((lean / total) * 100) : 0,
            shallow: total ? Math.round((shallow / total) * 100) : 0,
          },
          bestScore: Math.max(...scores),
          streak: streak.current || 0,
          daysActive: new Set(weekSets.map((s) => new Date(s.date).toDateString())).size,
        },
        userName: settings.userName || '',
      }),
    });

    const data = await res.json();

    if (res.ok && data.feedback) {
      safeText('weeklyDigestText', data.feedback);
      showEl(D('weeklyDigest'));
      hideEl(btn);
    } else {
      safeText('weeklyDigestBtnText', 'Digest unavailable');
      setTimeout(() => {
        safeText('weeklyDigestBtnText', 'Get Weekly AI Digest');
        if (btn) btn.disabled = false;
      }, 3000);
    }
  } catch (err) {
    console.warn('[WeeklyDigest] Request failed:', err);
    safeText('weeklyDigestBtnText', 'Digest unavailable');
    setTimeout(() => {
      safeText('weeklyDigestBtnText', 'Get Weekly AI Digest');
      if (btn) btn.disabled = false;
    }, 3000);
  }
});

/* ---------- MediaPipe ---------------------------------------- */

async function loadMediaPipe() {
  if (FilesetResolver && PoseLandmarker) return;

  try {
    const mp = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/+esm`);
    FilesetResolver = mp.FilesetResolver;
    PoseLandmarker = mp.PoseLandmarker;

    if (!FilesetResolver || !PoseLandmarker) {
      throw new Error('MediaPipe ES module loaded but exports were missing');
    }

    console.info('[MediaPipe] Loaded via ES module import');
    return;
  } catch (err) {
    console.warn('[MediaPipe] ES module import failed, trying UMD fallback:', err);
  }

  await ensureMediaPipeLoaded();

  const ns = window.vision || window;
  FilesetResolver = ns.FilesetResolver;
  PoseLandmarker = ns.PoseLandmarker;

  if (!FilesetResolver || !PoseLandmarker) {
    throw new Error('MediaPipe failed to load: FilesetResolver/PoseLandmarker missing');
  }

  console.info('[MediaPipe] Loaded via UMD fallback');
}

async function initLandmarker() {
  await loadMediaPipe();

  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
  );

  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  console.info('[MediaPipe] PoseLandmarker initialized');
}

async function ensureMediaPipeLoaded() {
  if ((window.vision && window.vision.FilesetResolver) || window.FilesetResolver) {
    console.info('[MediaPipe] vision bundle already present on window object.');
    return;
  }

  for (const src of MEDIAPIPE_BUNDLES) {
    try {
      console.info(`[MediaPipe] Attempting CDN load: ${src}`);
      await loadScript(src, MEDIAPIPE_CDN_TIMEOUT_MS);

      if ((window.vision && window.vision.FilesetResolver) || window.FilesetResolver) {
        console.info(`[MediaPipe] Loaded successfully from: ${src}`);
        return;
      }
    } catch (err) {
      console.warn(`[MediaPipe] Failed to load from: ${src}`, err);
    }
  }

  throw new Error('MediaPipe failed to load from CDN');
}

function loadScript(src, timeoutMs = MEDIAPIPE_CDN_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-mediapipe-src="${src}"]`);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }

    const timeoutId = setTimeout(
      () => reject(new Error(`Timed out loading ${src} after ${timeoutMs}ms`)),
      timeoutMs
    );

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.mediapipeSrc = src;

    script.addEventListener('load', () => {
      clearTimeout(timeoutId);
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });

    script.addEventListener('error', () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load ${src}`));
    }, { once: true });

    document.head.appendChild(script);
  });
}

/* ---------- Camera ------------------------------------------- */

async function startCamera() {
  if (!video) throw new Error('Camera video element not found');

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  const facing = settings.frontCam ? 'user' : 'environment';

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 720 },
        height: { ideal: 960 },
      },
      audio: false,
    });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('muted', 'true');
  await video.play();

  if (cameraWrap) cameraWrap.classList.toggle('is-front', settings.frontCam);
  hideEl(placeholder);
}

async function flipCamera() {
  settings.frontCam = !settings.frontCam;
  saveSets();
  await startCamera();
  showToast(settings.frontCam ? 'Front camera' : 'Back camera', 'info', 1500);
}

// Double-tap-anywhere to flip camera while a camera-mode workout is running.
// Ignores taps on interactive UI (buttons, links, inputs, panels, modals,
// the cam permission dialog, etc.) so it never fires accidentally.
let lastScreenTap = 0;
const DOUBLE_TAP_MS = 350;
const _IGNORE_DOUBLE_TAP_SELECTOR = [
  'button', 'a', 'input', 'textarea', 'select', 'label',
  '.panel', '.modal', '.cam-permission', '.warmup-overlay',
  '.exercise-chip', '.toggle', '.btn-primary', '.btn-secondary',
  '#summary',
].join(',');

function _handleDoubleTap(e) {
  if (!running || paused || manualMode || noCameraMode) return;
  const ignored = e.target && e.target.closest && e.target.closest(_IGNORE_DOUBLE_TAP_SELECTOR);
  if (ignored) return;
  const now = Date.now();
  if (now - lastScreenTap < DOUBLE_TAP_MS) {
    lastScreenTap = 0;
    flipCamera().catch((err) => {
      console.warn('[CameraFlip] Double tap flip failed:', err);
      showToast('Could not flip camera', 'error', 2000);
    });
  } else {
    lastScreenTap = now;
  }
}

// Use pointerup if available (covers both touch + mouse), else fall back.
if (window.PointerEvent) {
  document.addEventListener('pointerup', _handleDoubleTap);
} else {
  document.addEventListener('touchend', _handleDoubleTap);
  document.addEventListener('click', _handleDoubleTap);
}

if (camFlipBtn) camFlipBtn.addEventListener('click', flipCamera);

function stopCameraStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  if (video) video.srcObject = null;
  showEl(placeholder);
  if (cameraWrap) cameraWrap.classList.remove('is-front');
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}


/* ---------- six_seven_meme gesture (isolated, optional) ------ */
// Wrist-only motion detector. Does NOT require HandLandmarker.
// Safe by design: returns false on any missing/invalid input.
let sixSevenHistory = [];
let lastSixSevenAt = 0;
let _sixSevenModeAnnounced = false;
const SIX_SEVEN_COOLDOWN_MS = 1000;
const SIX_SEVEN_WINDOW = 10;
const SIX_SEVEN_MIN_ALTERNATIONS = 3;
const SIX_SEVEN_MIN_DELTA = 0.012;

function getHandWristY(handLandmarks) {
  try {
    if (!handLandmarks) return null;
    const p = Array.isArray(handLandmarks) ? handLandmarks[0] : handLandmarks;
    if (!p || typeof p.y !== 'number' || !isFinite(p.y)) return null;
    if (p.visibility != null && p.visibility < 0.3) return null;
    return p.y;
  } catch { return null; }
}

function isMostlyOpenPalm(handLandmarks) {
  // Wrist-only fallback: pose model has no finger joints, so finger
  // extension cannot be verified. Stub kept so a future HandLandmarker
  // can drop in here without changing call sites.
  return getHandWristY(handLandmarks) != null;
}

function detectSixSevenMeme(leftHandLandmarks, rightHandLandmarks) {
  try {
    const ly = getHandWristY(leftHandLandmarks);
    const ry = getHandWristY(rightHandLandmarks);
    if (ly == null || ry == null) return false;
    if (!isMostlyOpenPalm(leftHandLandmarks) || !isMostlyOpenPalm(rightHandLandmarks)) return false;

    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();

    sixSevenHistory.push({ t: now, ly, ry });
    if (sixSevenHistory.length > SIX_SEVEN_WINDOW) {
      sixSevenHistory.splice(0, sixSevenHistory.length - SIX_SEVEN_WINDOW);
    }
    if (sixSevenHistory.length < 4) return false;
    if (now - lastSixSevenAt < SIX_SEVEN_COOLDOWN_MS) return false;

    let oppositeFrames = 0;
    let lastRelSign = 0;
    let signFlips = 0;
    for (let i = 1; i < sixSevenHistory.length; i++) {
      const dl = sixSevenHistory[i].ly - sixSevenHistory[i - 1].ly;
      const dr = sixSevenHistory[i].ry - sixSevenHistory[i - 1].ry;
      if (Math.abs(dl) < SIX_SEVEN_MIN_DELTA || Math.abs(dr) < SIX_SEVEN_MIN_DELTA) continue;
      if (dl * dr < 0) {
        oppositeFrames++;
        const relSign = dl > dr ? 1 : -1;
        if (lastRelSign !== 0 && relSign !== lastRelSign) signFlips++;
        lastRelSign = relSign;
      }
    }

    if (oppositeFrames >= SIX_SEVEN_MIN_ALTERNATIONS && signFlips >= 1) {
      lastSixSevenAt = now;
      sixSevenHistory = [];
      return true;
    }
    return false;
  } catch { return false; }
}
/* -------------------------------------------------------------- */

/* ---------- Pose drawing ------------------------------------- */

const SKEL = [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

function drawPose(lm) {
  if (!ctx || !canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  for (const [a, b] of SKEL) {
    const A = lm[a];
    const B = lm[b];
    if (!A || !B || A.visibility < 0.5 || B.visibility < 0.5) continue;

    const g = ctx.createLinearGradient(A.x * w, A.y * h, B.x * w, B.y * h);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0.4)');

    ctx.beginPath();
    ctx.moveTo(A.x * w, A.y * h);
    ctx.lineTo(B.x * w, B.y * h);
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = lm[i];
    if (!p || p.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }

  for (const i of [25, 26]) {
    const p = lm[i];
    if (!p || p.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 8, 0, Math.PI * 2);
    ctx.fillStyle = hadValgus ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.3)';
    ctx.fill();
  }

  drawDepthGuide(w);
}

function calibrateDepthGuide(lm) {
  if (depthGuideY !== null || phase !== 'standing') return;

  const lh = lm[23];
  const rh = lm[24];
  const lk = lm[25];
  const rk = lm[26];

  if (!lh || !rh || !lk || !rk) return;
  if (lh.visibility < 0.5 || rh.visibility < 0.5 || lk.visibility < 0.5 || rk.visibility < 0.5) return;

  standingHipY = (lh.y + rh.y) / 2;
  standingKneeY = (lk.y + rk.y) / 2;
  depthGuideY = standingKneeY;
}

function drawDepthGuide(w) {
  if (!ctx || !canvas) return;
  if (depthGuideY === null || !running) return;

  const y = depthGuideY * canvas.height;
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.fillStyle = 'rgba(34, 197, 94, 0.65)';
  ctx.fillText('PARALLEL', 8, y - 5);
  ctx.restore();
}

/* ---------- Form analysis ------------------------------------ */

function analyzeForm(lm, ka) {
  const hw = dist(lm[23], lm[24]);
  const kw = dist(lm[25], lm[26]);
  const ha = calcAngle(lm[11], lm[23], lm[25]);
  const cues = [];
  let pen = 0;

  if (hw > 1e-6 && (hw - kw) / hw > THRESH.valgus) {
    cues.push('knees out!');
    hadValgus = true;
    pen += 15;
  }

  if (ha < 65) {
    cues.push('chest up, stay tall');
    hadLean = true;
    pen += 10;
  }

  if (phase === 'bottom' && ka > settings.depthTarget + 15) {
    cues.push('deeper! you got this');
    pen += 10;
  }

  if (phase === 'bottom' && ka <= settings.depthTarget) pen -= 5;

  formScore = Math.max(0, Math.min(100, formScore - pen * 0.3 + 0.5));
  return cues;
}

/* ---------- State machine ------------------------------------ */

function updatePhase(ka) {
  const prev = phase;

  if (phase === 'standing' && ka < THRESH.descent) {
    phase = 'descending';
    repStartTime = Date.now();
  } else if (phase === 'descending' && ka < THRESH.bottom) {
    phase = 'bottom';
  } else if (phase === 'bottom' && ka > THRESH.ascent) {
    phase = 'ascending';
  } else if (phase === 'ascending' && ka > THRESH.stand) {
    phase = 'standing';
  }

  if (prev === 'ascending' && phase === 'standing') {
    repCount++;
    const tempoMs = Date.now() - repStartTime;

    let sc = 100;
    if (minAngle > settings.depthTarget + 20) sc -= 30;
    else if (minAngle > settings.depthTarget + 10) sc -= 15;
    else if (minAngle <= settings.depthTarget) sc += 5;

    if (hadValgus) sc -= 20;
    if (hadLean) sc -= 15;

    sc = Math.max(0, Math.min(100, sc));

    setData.push({
      minAngle: Math.round(minAngle),
      hadValgus,
      hadLean,
      score: sc,
      tempoMs,
    });

    minAngle = 180;
    hadValgus = false;
    hadLean = false;

    showRepFlash(repCount);
    haptic([30, 50, 30]);
    say(sc >= 80 ? `${repCount}, sheesh` : `${repCount}, tighten up`);
  }
}

/* ---------- UI updates --------------------------------------- */

function showCue(t) {
  const now = Date.now();
  if (t === lastCueMsg && now - lastCueTime < 2000) return;

  lastCueMsg = t;
  lastCueTime = now;

  if (cueText) cueText.textContent = t;
  showEl(cueOverlay);
  haptic(50);

  clearTimeout(cueOverlay?._t);
  if (cueOverlay) cueOverlay._t = setTimeout(() => cueOverlay.classList.add('hidden'), 1500);
}

function showRepFlash(n) {
  if (repFlashNum) repFlashNum.textContent = n;
  showEl(repFlash);

  clearTimeout(repFlash?._t);
  if (repFlash) repFlash._t = setTimeout(() => repFlash.classList.add('hidden'), 700);
}

function updateScoreRing(sc) {
  if (scoreRing) {
    const off = 163.36 - (sc / 100) * 163.36;
    scoreRing.style.strokeDashoffset = off;
    scoreRing.style.stroke = sc >= 75 ? '#22c55e' : sc >= 50 ? '#eab308' : '#ef4444';
  }

  if (scoreValue) scoreValue.textContent = Number.isFinite(sc) ? Math.round(sc) : '--';
}

function setDot(cls) {
  const dot = hudStatus ? hudStatus.querySelector('.hud-dot') : null;
  if (dot) dot.className = 'hud-dot ' + cls;
}

const setStatusDot = setDot;
const runCountdown = () => doCountdown();

function updateDepth(ka) {
  if (!depthEl || !depthCard) return;

  if (phase === 'bottom' || phase === 'descending') {
    if (ka <= settings.depthTarget) {
      depthEl.textContent = 'Good';
      depthCard.className = 'stat-card stat-depth good';
    } else if (ka <= settings.depthTarget + 15) {
      depthEl.textContent = 'Almost';
      depthCard.className = 'stat-card stat-depth ok';
    } else {
      depthEl.textContent = 'High';
      depthCard.className = 'stat-card stat-depth shallow';
    }
  } else if (phase === 'standing') {
    depthEl.textContent = '--';
    depthCard.className = 'stat-card stat-depth';
  }
}

/* ---------- Countdown ---------------------------------------- */

function doCountdown() {
  if (!settings.countdown) return Promise.resolve();

  return new Promise((resolve) => {
    if (!countdownEl || !countdownNum) {
      resolve();
      return;
    }

    countdownEl.classList.remove('hidden');
    let n = 3;
    countdownNum.textContent = n;
    say('3');

    const iv = setInterval(() => {
      n--;

      if (n > 0) {
        countdownNum.textContent = n;
        say(String(n));
      } else if (n === 0) {
        countdownNum.textContent = 'GO';
        say('Go');
        haptic(200);
      } else {
        clearInterval(iv);
        countdownEl.classList.add('hidden');
        resolve();
      }
    }, 900);
  });
}

/* ---------- Main loop ---------------------------------------- */

async function loop() {
  if (!running || paused || manualMode) return;
  if (!landmarker || !video || !canvas || !ctx) return;

  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 960;

  let result;

  try {
    result = landmarker.detectForVideo(video, performance.now());
  } catch (err) {
    console.warn('[MediaPipe] Detection step failed.', err);
    requestAnimationFrame(loop);
    return;
  }

  const lm = result?.landmarks?.[0];

  if (lm) {
    lastPersonSeenAt = Date.now();
    calibrateDepthGuide(lm);
    drawPose(lm);

    // 6-7 Detect mode: skip squat scoring; gesture-only output.
    const _currentExercise = getExercise();
    if (_currentExercise && _currentExercise.id === 'six_seven_detect') {
      if (!_sixSevenModeAnnounced) {
        _sixSevenModeAnnounced = true;
        showToast('6 7 Detect mode', 'info', 1200);
      }
      if (detectSixSevenMeme(lm[15], lm[16])) {
        showToast('6 7 detected', 'info', 1200);
        console.log('[gesture] six_seven_meme detected');
        safeText('phase', '6 7 detected');
      } else {
        safeText('phase', 'detecting');
      }
      requestAnimationFrame(loop);
      return;
    }

    // Optional six_seven_meme gesture — uses pose wrists (15=L, 16=R).
    // Safe: detectSixSevenMeme returns false on any missing data.
    if (detectSixSevenMeme(lm[15], lm[16])) {
      console.log('[gesture] six_seven_meme detected');
    }

    const lk = calcAngle(lm[23], lm[25], lm[27]);
    const rk = calcAngle(lm[24], lm[26], lm[28]);
    const ka = Math.min(lk, rk);

    minAngle = Math.min(minAngle, ka);
    updatePhase(ka);

    const cues = analyzeForm(lm, ka);
    if (cues.length) showCue(cues[0]);

    if (repsEl) repsEl.textContent = repCount;
    if (phaseEl) phaseEl.textContent = phase;
    if (angleEl) angleEl.textContent = Math.round(ka) + '°';

    updateDepth(ka);
    updateScoreRing(formScore);

    if (phase !== 'standing' && repStartTime && tempoValue && hudTempo) {
      const t = ((Date.now() - repStartTime) / 1000).toFixed(1);
      tempoValue.textContent = t + 's';
      hudTempo.classList.remove('hidden');
    } else if (hudTempo) {
      hudTempo.classList.add('hidden');
    }

    setDot('active');
    const statusText = hudStatus ? hudStatus.querySelector('span:last-child') : null;
    if (statusText) statusText.textContent = 'Tracking';
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDot('warning');
    const statusText = hudStatus ? hudStatus.querySelector('span:last-child') : null;
    if (statusText) statusText.textContent = 'No person';
  }

  requestAnimationFrame(loop);
}

/* ---------- Timer -------------------------------------------- */

function startTimer() {
  if (!timerStart) timerStart = Date.now();
  updateTimerUI();
  stopTimer();

  timerInterval = setInterval(() => {
    if (hudTimer) hudTimer.textContent = fmtTime(elapsedMsBeforePause + (Date.now() - timerStart));
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  const elapsed = elapsedMsBeforePause + (timerStart ? Date.now() - timerStart : 0);
  if (hudTimer) hudTimer.textContent = fmtTime(elapsed);
}

/* ---------- Camera permission direct buttons ----------------- */

const camPermissionModal = D('camPermission');
const camPermAllowBtn = D('camPermAllow');
const camPermCancelBtn = D('camPermCancel');

if (camPermAllowBtn && camPermissionModal) {
  camPermAllowBtn.addEventListener('click', () => {
    localStorage.setItem('postur_cam_asked', '1');
    camPermissionModal.classList.add('hidden');

    const sw = _resolveStartWorkout();
    if (sw) {
      sw().catch((err) => {
        console.error('[CamPerm] startWorkout threw:', err);
        diagToast('startWorkout error: ' + ((err && err.message) || err), 'error');
      });
    } else {
      console.error('[CamPerm] posturBeginWorkout/startWorkout is not defined');
      diagToast('Workout function missing. Reload the page.', 'error');
    }
  });
}

if (camPermCancelBtn && camPermissionModal) {
  camPermCancelBtn.addEventListener('click', () => {
    camPermissionModal.classList.add('hidden');
  });
}

/* ---------- Workout lifecycle -------------------------------- */

async function posturBeginWorkout({ skipCamera = false } = {}) {
  unlockAudio();
  acquireWakeLock();

  if (!startBtn) {
    diagToast('Start button missing.', 'error');
    return;
  }

  const label = startBtn.querySelector('span');
  if (label) label.textContent = 'Loading…';

  startBtn.disabled = true;
  startNoCameraBtn.disabled = true;

  // Exercise-aware start. Only Squat uses MediaPipe auto-tracking right now.
  const exercise = getExercise();
  const cameraExercise = isCameraExercise(exercise);
  if (!cameraExercise && !skipCamera) {
    showToast(`${exercise.label} tracking coming soon — using manual mode.`, 'info', 3500);
    skipCamera = true;
  }

  let cameraOk = false;

  if (!skipCamera) {
    try {
      if (!landmarker) await initLandmarker();
      await startCamera();
      cameraOk = true;
    } catch (err) {
      console.warn('[Startup] Camera unavailable, falling back to manual mode:', err);
      const friendly = describeCameraError(err);
      showToast(friendly, 'error', 5000);
    }
  }

  noCameraMode = !cameraOk;
  manualMode = !cameraOk;

  running = true;
  paused = false;
  phase = 'standing';
  repCount = 0;
  minAngle = 180;
  hadValgus = false;
  hadLean = false;
  setData = [];
  formScore = 100;
  repStartTime = 0;
  timerStart = 0;
  elapsedMsBeforePause = 0;
  lastPersonSeenAt = 0;
  standingHipY = null;
  standingKneeY = null;
  depthGuideY = null;

  if (repsEl) repsEl.textContent = '0';
  if (depthEl) depthEl.textContent = '--';
  if (phaseEl) phaseEl.textContent = manualMode ? `${exercise.label.toLowerCase()} manual` : 'standing';
  if (angleEl) angleEl.textContent = '--';
  if (scoreValue) scoreValue.textContent = '--';
  updateScoreRing(0);
  if (depthCard) depthCard.className = 'stat-card stat-depth';

  startBtn.classList.add('hidden');
  hideEl(D('warmupBtn'));
  startNoCameraBtn.classList.add('hidden');
  showEl(workoutCtrl);
  if (manualRepBtn) manualRepBtn.classList.toggle('hidden', !manualMode);
  hideEl(summaryEl);
  hideEl(framingHint);
  hideEl(D('homeCard'));
  hideEl(D('exerciseCard'));
  showEl(D('statsStrip'));
  hideEl(aiCoaching);
  showEl(aiCoachBtn);
  if (aiCoachBtnText) aiCoachBtnText.textContent = 'Get AI Coaching';
  if (aiCoachBtn) aiCoachBtn.disabled = false;

  if (manualMode) {
    showEl(placeholder);
    if (placeholderText) {
      placeholderText.textContent = exercise.trackingMode === 'timer'
        ? `${exercise.label} manual mode — use Finish when your hold is done.`
        : (skipCamera ? `${exercise.label} — tap + Rep to log each rep` : 'Camera unavailable — tap + Rep to log each rep');
    }

    const statusText = hudStatus ? hudStatus.querySelector('span:last-child') : null;
    if (statusText) statusText.textContent = `${exercise.label.toLowerCase()} manual`;
    setStatusDot('warning');
    hideEl(cueOverlay);

    startTimer();
    haptic(100);
    say(`${exercise.label} ready`);
  } else {
    hideEl(cueOverlay);
    // Countdown removed — go straight to tracking. (doCountdown still defined
    // for back-compat, but we never call it on workout start.)
    startTimer();
    haptic(100);
    say(settings.userName ? `let's cook ${settings.userName}` : "let's go");
    loop();
  }

  if (label) label.textContent = 'Start Workout';
  startBtn.disabled = false;
  startNoCameraBtn.disabled = false;
}

window.posturBeginWorkout = posturBeginWorkout;
window.startWorkout = posturBeginWorkout;
globalThis.posturBeginWorkout = posturBeginWorkout;

console.log('[Init] Workout function exposed:', {
  posturBeginWorkout: typeof window.posturBeginWorkout,
  startWorkout: typeof window.startWorkout,
});

function describeCameraError(err) {
  const name = err && err.name;

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission denied. Allow camera access in your browser to use auto tracking.';
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera found. Switched to manual mode.';
  }

  if (name === 'NotReadableError') {
    return 'Camera is in use by another app. Switched to manual mode.';
  }

  if (err && /MediaPipe/i.test(err.message || '')) {
    return "Couldn't load AI model. Check your connection and reload.";
  }

  return 'Camera unavailable. Switched to manual mode.';
}

function pauseWorkout() {
  paused = !paused;

  if (paused) {
    if (pauseBtn) {
      pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume';
    }

    setStatusDot('');
    const statusText = hudStatus ? hudStatus.querySelector('span:last-child') : null;
    if (statusText) statusText.textContent = 'Paused';

    elapsedMsBeforePause += Date.now() - timerStart;
    timerStart = 0;
    stopTimer();
  } else {
    if (pauseBtn) {
      pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
    }

    startTimer();
    if (!noCameraMode && !manualMode) loop();
  }
}

function finishWorkout() {
  running = false;
  paused = false;
  stopTimer();

  const finalElapsed = elapsedMsBeforePause + (timerStart ? Date.now() - timerStart : 0);
  const duration = fmtTime(finalElapsed);

  stopCameraStream();
  hideEl(workoutCtrl);
  hideEl(manualRepBtn);

  if (setData.length === 0) {
    showEl(startBtn);
    showEl(D('warmupBtn'));
    startNoCameraBtn.classList.remove('hidden');
    const label = startBtn ? startBtn.querySelector('span') : null;
    if (label) label.textContent = 'Start Workout';
    if (startBtn) startBtn.disabled = false;
    startNoCameraBtn.disabled = false;
    showEl(D('homeCard'));
    hideEl(D('statsStrip'));
    return;
  }

  const avgDepth = Math.round(setData.reduce((s, r) => s + (r.minAngle || 0), 0) / setData.length);
  const avgScore = Math.round(setData.reduce((s, r) => s + (r.score || 0), 0) / setData.length);
  const bestRep = Math.max(...setData.map((r) => r.score || 0));
  const avgTempo = setData.some((r) => r.tempoMs)
    ? (setData.reduce((s, r) => s + (r.tempoMs || 0), 0) / setData.length / 1000).toFixed(1)
    : '--';
  const grade = avgScore >= 85 ? 'A' : avgScore >= 70 ? 'B' : 'C';

  if (summaryGrade) {
    summaryGrade.textContent = grade;
    summaryGrade.className = 'summary-grade' + (grade === 'B' ? ' b' : grade === 'C' ? ' c' : '');
  }

  if (summaryStats) {
    summaryStats.innerHTML = `
      <div class="summary-stat"><span class="summary-stat-label">Reps</span><span class="summary-stat-value">${setData.length}</span></div>
      <div class="summary-stat"><span class="summary-stat-label">Avg Depth</span><span class="summary-stat-value">${avgDepth}°</span></div>
      <div class="summary-stat"><span class="summary-stat-label">Score</span><span class="summary-stat-value">${avgScore}</span></div>`;
  }

  if (summaryTempo) {
    summaryTempo.innerHTML = `
      <div class="summary-tempo-row"><span>Avg Tempo</span><span>${avgTempo}s / rep</span></div>
      <div class="summary-tempo-row"><span>Duration</span><span>${duration}</span></div>`;
  }

  if (summaryReps) {
    summaryReps.innerHTML = setData.map((r, i) => {
      const c = r.score >= 80 ? 'var(--green)' : r.score >= 60 ? 'var(--yellow)' : 'var(--red)';
      const t = r.tempoMs ? (r.tempoMs / 1000).toFixed(1) : '--';
      return `
        <div class="summary-rep-row">
          <span class="summary-rep-num">#${i + 1}</span>
          <div class="summary-rep-bar"><div class="summary-rep-fill" style="width:${r.score}%;background:${c}"></div></div>
          <span class="summary-rep-tempo">${t}s</span>
          <span class="summary-rep-score" style="color:${c}">${r.score}</span>
        </div>`;
    }).join('');
  }

  const sets = loadHistory();
  const _ex = getExercise();
  sets.push({
    date: new Date().toISOString(),
    reps: setData.length,
    avgDepth,
    avgScore,
    score: avgScore,
    grade,
    duration,
    repData: setData,
    exercise: settings.exercise || 'bodyweight_squat',
    exerciseLabel: _ex.label,
    equipment: _ex.equipment || '',
    equipmentType: _ex.equipmentType || '',
    trackingMode: _ex.trackingMode || (manualMode ? 'manual' : 'camera'),
  });
  saveHist(sets);

  bumpStreak();
  updateHomeCard();

  const pbs = checkPB({ bestRep, avgScore, reps: setData.length });

  if (pbs.length) {
    if (pbText) pbText.textContent = pbs[0] + '!';
    showEl(pbBanner);
    fireConfetti();
    haptic([50, 100, 50, 100, 50]);
    say(settings.userName ? `new PB ${settings.userName}, sheesh!` : 'new PB, sheesh!');
  } else {
    hideEl(pbBanner);
    haptic([50, 100, 50]);
    say(grade === 'A' ? 'you ate that!' : grade === 'B' ? 'solid work' : "we're leveling up");
  }

  const newAch = checkAchievements({ setData, avgScore, reps: setData.length });
  if (newAch.length) {
    setTimeout(() => showAchievementToast(newAch[0]), pbs.length ? 2000 : 500);
  }

  showEl(summaryEl);
  hideEl(D('statsStrip'));
}

function resetForNewSet() {
  hideEl(summaryEl);
  showEl(startBtn);
  showEl(D('warmupBtn'));
  startNoCameraBtn.classList.remove('hidden');

  const label = startBtn ? startBtn.querySelector('span') : null;
  if (label) label.textContent = 'Start Workout';

  if (startBtn) startBtn.disabled = false;
  startNoCameraBtn.disabled = false;

  noCameraMode = false;
  manualMode = false;

  hideEl(D('statsStrip'));
  showEl(D('homeCard'));
  showEl(D('exerciseCard'));
  renderExerciseChips();
  updateHomeCard();

  if (repsEl) repsEl.textContent = '0';
  if (depthEl) depthEl.textContent = '--';
  if (phaseEl) phaseEl.textContent = 'idle';
  if (angleEl) angleEl.textContent = '--';
  if (scoreValue) scoreValue.textContent = '--';

  updateScoreRing(0);

  if (hudTimer) hudTimer.textContent = '00:00';
  timerStart = 0;
  elapsedMsBeforePause = 0;

  setStatusDot('');
  const statusText = hudStatus ? hudStatus.querySelector('span:last-child') : null;
  if (statusText) statusText.textContent = 'Ready';

  hideEl(manualRepBtn);
  hideEl(pbBanner);
}

/* ---------- Start button + controls -------------------------- */

console.log('[Init] postur app.js loaded — wiring up start button');

if (!startBtn) {
  diagToast('Start button element not found in DOM!', 'error');
} else {
  startBtn.addEventListener('click', (ev) => {
    try {
      console.log('[Start] click fired', ev);
      diagToast('Start tapped');

      if (!localStorage.getItem('postur_cam_asked')) {
        window.showCamPermission();
      } else {
        posturBeginWorkout().catch((err) => {
          console.error('[Start] startWorkout threw:', err);
          diagToast('startWorkout error: ' + ((err && err.message) || err), 'error');
        });
      }
    } catch (err) {
      console.error('[Start] handler threw:', err);
      diagToast('Click handler error: ' + ((err && err.message) || err), 'error');
    }
  });
}

startNoCameraBtn.addEventListener('click', () => posturBeginWorkout({ skipCamera: true }));
if (pauseBtn) pauseBtn.addEventListener('click', pauseWorkout);
if (finishBtn) finishBtn.addEventListener('click', finishWorkout);
if (newSetBtn) newSetBtn.addEventListener('click', resetForNewSet);

if (audioToggle) {
  audioToggle.addEventListener('click', () => {
    audioOn = !audioOn;
    audioToggle.classList.toggle('muted', !audioOn);
  });
}

if (manualRepBtn) {
  manualRepBtn.addEventListener('click', () => {
    if (!running || paused || !manualMode) return;

    repCount++;
    const repScore = 75;

    setData.push({
      minAngle: settings.depthTarget + 10,
      hadValgus: false,
      hadLean: false,
      score: repScore,
      tempoMs: 0,
      depthLabel: 'manual',
    });

    if (repsEl) repsEl.textContent = String(repCount);
    if (phaseEl) phaseEl.textContent = `${getExerciseLabel(settings.exercise).toLowerCase()} manual`;
    if (angleEl) angleEl.textContent = '--';

    updateScoreRing(repScore);
    showRepFlash(repCount);
    say(`${repCount}`);
  });
}

/* ---------- AI Coaching -------------------------------------- */

if (aiCoachBtn) {
  aiCoachBtn.addEventListener('click', async () => {
    if (!setData.length) return;

    const avgDepth = Math.round(setData.reduce((s, r) => s + (r.minAngle || 0), 0) / setData.length);
    const avgScore = Math.round(setData.reduce((s, r) => s + (r.score || 0), 0) / setData.length);
    const avgTempo = setData.some((r) => r.tempoMs)
      ? (setData.reduce((s, r) => s + (r.tempoMs || 0), 0) / setData.length / 1000).toFixed(1)
      : '--';
    const grade = avgScore >= 85 ? 'A' : avgScore >= 70 ? 'B' : 'C';

    if (aiCoachBtnText) aiCoachBtnText.textContent = 'Analyzing...';
    aiCoachBtn.disabled = true;

    const _ex = getExercise();
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setData,
          avgScore,
          grade,
          reps: setData.length,
          avgDepth,
          avgTempo,
          userName: settings.userName || '',
          exercise: settings.exercise,
          exerciseLabel: _ex.label,
          equipment: _ex.equipment || '',
          equipmentType: _ex.equipmentType || '',
          trackingMode: _ex.trackingMode || (manualMode ? 'manual' : 'camera'),
        }),
      });

      const data = await res.json();

      if (res.ok && data.feedback) {
        if (aiCoachingText) aiCoachingText.textContent = data.feedback;
        showEl(aiCoaching);
        hideEl(aiCoachBtn);
      } else {
        if (aiCoachBtnText) aiCoachBtnText.textContent = 'AI Coach unavailable';
        setTimeout(() => {
          if (aiCoachBtnText) aiCoachBtnText.textContent = 'Get AI Coaching';
          aiCoachBtn.disabled = false;
        }, 3000);
      }
    } catch (err) {
      console.warn('[AICoach] Request failed:', err);
      if (aiCoachBtnText) aiCoachBtnText.textContent = 'AI Coach unavailable';
      setTimeout(() => {
        if (aiCoachBtnText) aiCoachBtnText.textContent = 'Get AI Coaching';
        aiCoachBtn.disabled = false;
      }, 3000);
    }
  });
}

/* ---------- Visibility + unload ------------------------------ */

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && running && !paused) {
    pauseWorkout();
  }
});

window.addEventListener('beforeunload', () => {
  running = false;
  paused = false;
  stopTimer();
  stopCameraStream();
});

/* ---------- Service worker ----------------------------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => registration.update())
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
