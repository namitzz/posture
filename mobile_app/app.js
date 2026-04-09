/* =============================================================
   postur — AI Form Coach  |  Production App
   ============================================================= */

/* ---------- MediaPipe globals (resolved after CDN loads) ----- */
let FilesetResolver, PoseLandmarker;
// Backward-compatibility shim:
// Some previously deployed bundles referenced these legacy globals.
// Keeping them defined prevents hard runtime crashes on mixed/stale caches.
const useLegacyPoseFallback = false;
let legacyPose = null;
let legacyPoseResults = null;
const MEDIAPIPE_VERSION = '0.10.14';
const MEDIAPIPE_CDN_TIMEOUT_MS = 8000;
const MEDIAPIPE_BUNDLES = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.js`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.js`,
  `https://fastly.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.js`,
];

/* ---------- DOM refs ----------------------------------------- */
const $ = (id) => document.getElementById(id);

const splash        = $('splash');
const appEl         = $('app');
const video         = $('camera');
const canvas        = $('overlay');
const ctx           = canvas.getContext('2d');
const cameraWrap    = $('cameraWrap');
const placeholder   = $('cameraPlaceholder');

const hudStatus     = $('hudStatus');
const hudTimer      = $('hudTimer');
const hudScore      = $('hudScore');
const scoreRing     = $('scoreRing');
const scoreValue    = $('scoreValue');
const cueOverlay    = $('cueOverlay');
const cueText       = $('cueText');
const repFlash      = $('repFlash');
const repFlashNum   = $('repFlashNum');

const repsEl        = $('reps');
const depthEl       = $('depth');
const phaseEl       = $('phase');
const angleEl       = $('angle');
const depthCard     = document.querySelector('.stat-depth');

const startBtn      = $('startBtn');
const workoutCtrl   = $('workoutControls');
const pauseBtn      = $('pauseBtn');
const finishBtn     = $('finishBtn');
const audioToggle   = $('audioToggle');

const summaryEl     = $('summary');
const summaryGrade  = $('summaryGrade');
const summaryStats  = $('summaryStats');
const summaryReps   = $('summaryReps');
const newSetBtn     = $('newSetBtn');

const historyBtn    = $('historyBtn');
const historyPanel  = $('historyPanel');
const closeHistory  = $('closeHistory');
const historyList   = $('historyList');

const settingsBtn   = $('settingsBtn');
const settingsPanel = $('settingsPanel');
const closeSettings = $('closeSettings');

/* ---------- Settings (persisted) ----------------------------- */
const DEFAULTS = {
  frontCam: false,
  voice: true,
  haptic: true,
  depthTarget: 90,
};

let settings = { ...DEFAULTS, ...loadJSON('postur_settings') };
applySettingsToUI();

function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; }
  catch { return {}; }
}

function saveSettings() {
  localStorage.setItem('postur_settings', JSON.stringify(settings));
}

function applySettingsToUI() {
  $('setFrontCam').checked = settings.frontCam;
  $('setVoice').checked    = settings.voice;
  $('setHaptic').checked   = settings.haptic;
  $('setDepth').value      = settings.depthTarget;
}

$('setFrontCam').addEventListener('change', (e) => { settings.frontCam = e.target.checked; saveSettings(); });
$('setVoice').addEventListener('change', (e) => { settings.voice = e.target.checked; saveSettings(); });
$('setHaptic').addEventListener('change', (e) => { settings.haptic = e.target.checked; saveSettings(); });
$('setDepth').addEventListener('change', (e) => {
  settings.depthTarget = Math.max(60, Math.min(120, +e.target.value || 90));
  e.target.value = settings.depthTarget;
  saveSettings();
});

/* ---------- State -------------------------------------------- */
let landmarker    = null;
let stream        = null;
let running       = false;
let paused        = false;
let audioEnabled  = true;
let phase         = 'standing';   // standing | descending | bottom | ascending
let repCount      = 0;
let minAngle      = 180;
let hadValgus     = false;
let hadLean       = false;
let setData       = [];           // per-rep data
let timerStart    = 0;
let elapsedMsBeforePause = 0;
let timerInterval = null;
let lastCueTime   = 0;
let lastCueText   = '';
let formScore     = 100;          // live form score

const THRESHOLDS = {
  descent:  170,
  bottom:   150,
  ascent:   155,
  stand:    168,
  kneeValgusRatio: 0.12,
};

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

function say(text) {
  if (!settings.voice || !audioEnabled || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  u.pitch = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function haptic(pattern) {
  if (!settings.haptic || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------- Splash ------------------------------------------- */

window.addEventListener('load', () => {
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.classList.add('hidden');
      appEl.classList.remove('hidden');
    }, 600);
  }, 2200);
});

/* ---------- Panel navigation --------------------------------- */

function openPanel(panel) {
  panel.classList.remove('hidden', 'closing');
}

function closePanel(panel) {
  panel.classList.add('closing');
  setTimeout(() => {
    panel.classList.add('hidden');
    panel.classList.remove('closing');
  }, 250);
}

historyBtn.addEventListener('click', () => { renderHistory(); openPanel(historyPanel); });
closeHistory.addEventListener('click', () => closePanel(historyPanel));
settingsBtn.addEventListener('click', () => openPanel(settingsPanel));
closeSettings.addEventListener('click', () => closePanel(settingsPanel));

/* ---------- History ------------------------------------------ */

function loadHistory() {
  return loadJSON('postur_history').sets || [];
}

function saveHistory(sets) {
  localStorage.setItem('postur_history', JSON.stringify({ sets }));
}

function renderHistory() {
  const sets = loadHistory();
  if (!sets.length) {
    historyList.innerHTML = '<p class="empty-state">No workouts yet. Start your first set!</p>';
    return;
  }
  historyList.innerHTML = sets.slice().reverse().map((s) => {
    const g = s.grade.toLowerCase();
    return `
      <div class="history-item">
        <div class="history-item-top">
          <span class="history-date">${new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span class="history-grade ${g}">${s.grade}</span>
        </div>
        <div class="history-item-stats">
          <span>Reps<strong>${s.reps}</strong></span>
          <span>Avg Depth<strong>${s.avgDepth}°</strong></span>
          <span>Duration<strong>${s.duration}</strong></span>
        </div>
      </div>`;
  }).join('');
}

/* ---------- MediaPipe init ----------------------------------- */

async function initLandmarker() {
  await ensureMediaPipeLoaded();

  if (!FilesetResolver) {
    const ns = window.vision || window;
    FilesetResolver = ns.FilesetResolver;
    PoseLandmarker = ns.PoseLandmarker;
  }
  if (!FilesetResolver || !PoseLandmarker) {
    throw new Error('MediaPipe failed to load (missing vision bundle)');
  }

  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
  );

  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
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
    } catch (_err) {
      console.warn(`[MediaPipe] Failed to load from: ${src}`, _err);
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
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: settings.frontCam ? 'user' : 'environment', width: { ideal: 720 }, height: { ideal: 960 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  cameraWrap.classList.toggle('is-front', settings.frontCam);
  placeholder.classList.add('hidden');
}

/* ---------- Pose drawing ------------------------------------- */

const SKELETON = [
  [11,13],[13,15],[12,14],[14,16],  // arms
  [11,12],                           // shoulders
  [11,23],[12,24],[23,24],           // torso
  [23,25],[25,27],[24,26],[26,28],   // legs
];

function drawPose(lm) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Draw skeleton
  for (const [a, b] of SKELETON) {
    const A = lm[a], B = lm[b];
    if (!A || !B || A.visibility < 0.5 || B.visibility < 0.5) continue;

    const gradient = ctx.createLinearGradient(A.x * w, A.y * h, B.x * w, B.y * h);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

    ctx.beginPath();
    ctx.moveTo(A.x * w, A.y * h);
    ctx.lineTo(B.x * w, B.y * h);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Draw joints
  const joints = [11,12,13,14,15,16,23,24,25,26,27,28];
  for (const i of joints) {
    const p = lm[i];
    if (!p || p.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }

  // Highlight knees with color based on form
  for (const i of [25, 26]) {
    const p = lm[i];
    if (!p || p.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 8, 0, Math.PI * 2);
    ctx.fillStyle = hadValgus ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.3)';
    ctx.fill();
  }
}

/* ---------- Form analysis ------------------------------------ */

function analyzeForm(lm, kneeAngle) {
  const hipWidth  = dist(lm[23], lm[24]);
  const kneeWidth = dist(lm[25], lm[26]);
  const hipAngle  = calcAngle(lm[11], lm[23], lm[25]);

  const cues = [];
  let penalty = 0;

  // Knee valgus
  if (hipWidth > 1e-6 && (hipWidth - kneeWidth) / hipWidth > THRESHOLDS.kneeValgusRatio) {
    cues.push('Push knees out');
    hadValgus = true;
    penalty += 15;
  }

  // Forward lean
  if (hipAngle < 65) {
    cues.push('Chest up');
    hadLean = true;
    penalty += 10;
  }

  // Depth feedback (only at bottom)
  if (phase === 'bottom' && kneeAngle > settings.depthTarget + 15) {
    cues.push('Go deeper');
    penalty += 10;
  }

  // Depth bonus
  if (phase === 'bottom' && kneeAngle <= settings.depthTarget) {
    penalty -= 5; // reward good depth
  }

  formScore = Math.max(0, Math.min(100, formScore - penalty * 0.3 + 0.5));

  return cues;
}

/* ---------- State machine ------------------------------------ */

function updatePhase(kneeAngle) {
  const prev = phase;

  if (phase === 'standing'   && kneeAngle < THRESHOLDS.descent)  phase = 'descending';
  else if (phase === 'descending' && kneeAngle < THRESHOLDS.bottom) phase = 'bottom';
  else if (phase === 'bottom'     && kneeAngle > THRESHOLDS.ascent) phase = 'ascending';
  else if (phase === 'ascending'  && kneeAngle > THRESHOLDS.stand)  phase = 'standing';

  // Rep completed
  if (prev === 'ascending' && phase === 'standing') {
    repCount++;

    // Score this rep
    let repScore = 100;
    if (minAngle > settings.depthTarget + 20) repScore -= 30;
    else if (minAngle > settings.depthTarget + 10) repScore -= 15;
    else if (minAngle <= settings.depthTarget) repScore += 5;
    if (hadValgus) repScore -= 20;
    if (hadLean) repScore -= 15;
    repScore = Math.max(0, Math.min(100, repScore));

    const depthLabel = minAngle <= settings.depthTarget ? 'parallel' :
                       minAngle <= settings.depthTarget + 15 ? 'shallow' : 'high';

    setData.push({
      minAngle: Math.round(minAngle),
      hadValgus,
      hadLean,
      score: repScore,
      depthLabel,
    });

    // Reset per-rep state
    minAngle = 180;
    hadValgus = false;
    hadLean = false;

    // Feedback
    showRepFlash(repCount);
    haptic([30, 50, 30]);
    say(repScore >= 80 ? `${repCount}` : `${repCount}, watch your form`);
  }
}

/* ---------- UI updates --------------------------------------- */

function showCue(text) {
  const now = Date.now();
  if (text === lastCueText && now - lastCueTime < 2000) return;
  lastCueText = text;
  lastCueTime = now;

  cueText.textContent = text;
  cueOverlay.classList.remove('hidden');
  haptic(50);

  clearTimeout(cueOverlay._timeout);
  cueOverlay._timeout = setTimeout(() => cueOverlay.classList.add('hidden'), 1500);
}

function showRepFlash(num) {
  repFlashNum.textContent = num;
  repFlash.classList.remove('hidden');
  clearTimeout(repFlash._timeout);
  repFlash._timeout = setTimeout(() => repFlash.classList.add('hidden'), 700);
}

function updateScoreRing(score) {
  const circumference = 163.36;
  const offset = circumference - (score / 100) * circumference;
  scoreRing.style.strokeDashoffset = offset;

  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  scoreRing.style.stroke = color;
  scoreValue.textContent = Math.round(score);
}

function setStatusDot(cls) {
  const dot = hudStatus.querySelector('.hud-dot');
  dot.className = 'hud-dot ' + cls;
}

function updateDepthIndicator(kneeAngle) {
  if (phase === 'bottom' || phase === 'descending') {
    if (kneeAngle <= settings.depthTarget) {
      depthEl.textContent = 'Good';
      depthCard.className = 'stat-card stat-depth good';
    } else if (kneeAngle <= settings.depthTarget + 15) {
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

/* ---------- Main detection loop ------------------------------ */

async function loop() {
  if (!running || paused) return;

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
    drawPose(lm);

    const leftKnee  = calcAngle(lm[23], lm[25], lm[27]);
    const rightKnee = calcAngle(lm[24], lm[26], lm[28]);
    const kneeAngle = Math.min(leftKnee, rightKnee);

    minAngle = Math.min(minAngle, kneeAngle);
    updatePhase(kneeAngle);

    const cues = analyzeForm(lm, kneeAngle);
    if (cues.length) showCue(cues[0]);

    // Update UI
    repsEl.textContent = repCount;
    phaseEl.textContent = phase;
    angleEl.textContent = `${Math.round(kneeAngle)}°`;
    updateDepthIndicator(kneeAngle);
    updateScoreRing(formScore);

    setStatusDot('active');
    hudStatus.querySelector('span:last-child').textContent = 'Tracking';
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStatusDot('warning');
    hudStatus.querySelector('span:last-child').textContent = 'No person';
  }

  requestAnimationFrame(loop);
}

/* ---------- Timer -------------------------------------------- */

function startTimer() {
  if (!timerStart) timerStart = Date.now();
  updateTimerUI();
  stopTimer();
  timerInterval = setInterval(() => {
    updateTimerUI();
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
  hudTimer.textContent = fmtTime(elapsed);
}

function stopCameraStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  video.srcObject = null;
  placeholder.classList.remove('hidden');
  cameraWrap.classList.remove('is-front');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* ---------- Workout lifecycle -------------------------------- */

async function startWorkout() {
  startBtn.querySelector('span').textContent = 'Initializing AI coach...';
  startBtn.disabled = true;

  try {
    if (!landmarker) await initLandmarker();
    await startCamera();
  } catch (err) {
    startBtn.querySelector('span').textContent = 'Start Workout';
    startBtn.disabled = false;
    alert(`Could not start: ${err.message}`);
    return;
  }

  // Reset state
  running = true;
  paused = false;
  phase = 'standing';
  repCount = 0;
  minAngle = 180;
  hadValgus = false;
  hadLean = false;
  setData = [];
  formScore = 100;
  timerStart = 0;
  elapsedMsBeforePause = 0;

  // Update UI
  repsEl.textContent = '0';
  depthEl.textContent = '--';
  phaseEl.textContent = 'standing';
  angleEl.textContent = '--';
  scoreValue.textContent = '--';
  updateScoreRing(0);
  depthCard.className = 'stat-card stat-depth';

  startBtn.classList.add('hidden');
  workoutCtrl.classList.remove('hidden');
  summaryEl.classList.add('hidden');

  startTimer();
  haptic(100);
  say('Let\'s go');
  loop();
}

function pauseWorkout() {
  paused = !paused;
  if (paused) {
    pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume';
    setStatusDot('');
    hudStatus.querySelector('span:last-child').textContent = 'Paused';
    elapsedMsBeforePause += Date.now() - timerStart;
    timerStart = 0;
    stopTimer();
  } else {
    pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
    startTimer();
    loop();
  }
}

function finishWorkout() {
  running = false;
  paused = false;
  stopTimer();

  const finalElapsed = elapsedMsBeforePause + (timerStart ? Date.now() - timerStart : 0);
  const duration = fmtTime(finalElapsed);
  stopCameraStream();

  // Show summary
  workoutCtrl.classList.add('hidden');

  if (setData.length === 0) {
    startBtn.classList.remove('hidden');
    startBtn.querySelector('span').textContent = 'Start Workout';
    startBtn.disabled = false;
    return;
  }

  const avgDepth = Math.round(setData.reduce((s, r) => s + r.minAngle, 0) / setData.length);
  const avgScore = Math.round(setData.reduce((s, r) => s + r.score, 0) / setData.length);
  const valgusCount = setData.filter((r) => r.hadValgus).length;
  const leanCount = setData.filter((r) => r.hadLean).length;

  const grade = avgScore >= 80 ? 'A' : avgScore >= 60 ? 'B' : 'C';

  summaryGrade.textContent = grade;
  summaryGrade.className = 'summary-grade' + (grade === 'B' ? ' b' : grade === 'C' ? ' c' : '');

  summaryStats.innerHTML = `
    <div class="summary-stat">
      <span class="summary-stat-label">Reps</span>
      <span class="summary-stat-value">${setData.length}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-stat-label">Avg Depth</span>
      <span class="summary-stat-value">${avgDepth}°</span>
    </div>
    <div class="summary-stat">
      <span class="summary-stat-label">Score</span>
      <span class="summary-stat-value">${avgScore}</span>
    </div>
  `;

  summaryReps.innerHTML = setData.map((r, i) => {
    const color = r.score >= 80 ? 'var(--green)' : r.score >= 60 ? 'var(--yellow)' : 'var(--red)';
    return `
      <div class="summary-rep-row">
        <span class="summary-rep-num">#${i + 1}</span>
        <div class="summary-rep-bar">
          <div class="summary-rep-fill" style="width:${r.score}%;background:${color}"></div>
        </div>
        <span class="summary-rep-score" style="color:${color}">${r.score}</span>
      </div>`;
  }).join('');

  summaryEl.classList.remove('hidden');

  // Save to history
  const sets = loadHistory();
  sets.push({
    date: new Date().toISOString(),
    reps: setData.length,
    avgDepth,
    avgScore,
    grade,
    duration,
    valgusCount,
    leanCount,
    repData: setData,
  });
  saveHistory(sets);

  haptic([50, 100, 50]);
  say(grade === 'A' ? 'Great set!' : grade === 'B' ? 'Good work, keep improving' : 'Keep practicing your form');

}

function resetForNewSet() {
  summaryEl.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startBtn.querySelector('span').textContent = 'Start Workout';
  startBtn.disabled = false;

  repsEl.textContent = '0';
  depthEl.textContent = '--';
  phaseEl.textContent = 'idle';
  angleEl.textContent = '--';
  scoreValue.textContent = '--';
  updateScoreRing(0);
  hudTimer.textContent = '00:00';
  timerStart = 0;
  elapsedMsBeforePause = 0;
  setStatusDot('');
  hudStatus.querySelector('span:last-child').textContent = 'Ready';
}

/* ---------- Event listeners ---------------------------------- */

startBtn.addEventListener('click', startWorkout);
pauseBtn.addEventListener('click', pauseWorkout);
finishBtn.addEventListener('click', finishWorkout);
newSetBtn.addEventListener('click', resetForNewSet);

audioToggle.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  audioToggle.classList.toggle('muted', !audioEnabled);
  if (!audioEnabled) window.speechSynthesis?.cancel();
});

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

/* ---------- Service Worker ----------------------------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => registration.update())
      .catch(() => {});
  });
}
