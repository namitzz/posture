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
const placeholderText = $('cameraPlaceholderText');
const countdownEl   = $('countdown');
const countdownNum  = $('countdownNum');
const framingHint   = $('framingHint');
const toastEl       = $('toast');

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
const startNoCameraBtn = $('startNoCameraBtn');
const workoutCtrl   = $('workoutControls');
const pauseBtn      = $('pauseBtn');
const finishBtn     = $('finishBtn');
const audioToggle   = $('audioToggle');
const manualRepBtn  = $('manualRepBtn');

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
  audioEnabled: true,
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
let noCameraMode  = false;
let audioEnabled  = settings.audioEnabled !== false;
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
let manualMode    = false;
let wakeLock      = null;         // Screen Wake Lock sentinel
let lastPersonSeenAt = 0;         // performance.now() of last successful detection

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
function say(t) {
  if (!settings.voice || !audioOn || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(t); u.rate = 1.1; u.pitch = 0.95;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function haptic(p) { if (settings.haptic && navigator.vibrate) navigator.vibrate(p); }
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");
}

// ── Settings ──────────────────────────────────────────────────
const DEFS = { frontCam:false, voice:true, haptic:true, countdown:true, depthTarget:90, restDuration:60, userName:"" };
let settings = { ...DEFS, ...loadJ("postur_settings") };
function saveSets() { saveJ("postur_settings", settings); }
function applyUI() {
  D("setFrontCam").checked = settings.frontCam;
  D("setVoice").checked = settings.voice;
  D("setHaptic").checked = settings.haptic;
  D("setCountdown").checked = settings.countdown;
  D("setDepth").value = settings.depthTarget;
  D("setRest").value = settings.restDuration;
}
applyUI();
setTimeout(updateGreeting, 0);
for (const [id, key] of [["setFrontCam","frontCam"],["setVoice","voice"],["setHaptic","haptic"],["setCountdown","countdown"]]) {
  D(id).addEventListener("change", e => { settings[key] = e.target.checked; saveSets(); });
}
D("setDepth").addEventListener("change", e => { settings.depthTarget = Math.max(60,Math.min(120,+e.target.value||90)); e.target.value=settings.depthTarget; saveSets(); });
D("setRest").addEventListener("change", e => { settings.restDuration = Math.max(10,Math.min(300,+e.target.value||60)); e.target.value=settings.restDuration; saveSets(); });

// ── State ─────────────────────────────────────────────────────
let landmarker = null, stream = null, running = false, paused = false, audioOn = true;
let phase = "standing", repCount = 0, minAngle = 180, hadValgus = false, hadLean = false;
let setData = [], timerStart = 0, timerInterval = null;
let lastCueTime = 0, lastCueMsg = "", formScore = 100;
let repStartTime = 0;
let restInterval = null, restRemaining = 0;
const THRESH = { descent:170, bottom:150, ascent:155, stand:168, valgus:0.12 };

// ── Name Screen ──────────────────────────────────────────────
function showNameScreenIfNeeded() {
  if (settings.userName) return false;
  D("nameScreen").classList.remove("hidden");
  return true;
}
function finishNameScreen() {
  D("nameScreen").classList.add("hidden");
  appEl.classList.remove("hidden");
  updateGreeting();
}
D("nameInput").addEventListener("input", e => {
  D("nameSubmit").disabled = !e.target.value.trim();
});
D("nameSubmit").addEventListener("click", () => {
  const name = D("nameInput").value.trim();
  if (name) { settings.userName = name; saveSets(); }
  finishNameScreen();
});
D("nameSkip").addEventListener("click", finishNameScreen);

function updateGreeting() {
  const el = D("topbarGreeting");
  const nameDisp = D("settingsNameDisplay");
  if (settings.userName) {
    el.textContent = "hey, " + settings.userName;
    el.classList.remove("hidden");
    if (nameDisp) nameDisp.textContent = settings.userName;
  } else {
    el.classList.add("hidden");
    if (nameDisp) nameDisp.textContent = "not set";
  }
}

D("changeNameBtn").addEventListener("click", () => {
  const name = prompt("Enter your name:", settings.userName || "");
  if (name !== null) {
    settings.userName = name.trim();
    saveSets();
    updateGreeting();
  }
});

// ── Onboarding ────────────────────────────────────────────────
let onboardPage = 0;
function showOnboarding() {
  if (localStorage.getItem("postur_onboarded")) return false;
  onboardingEl.classList.remove("hidden");
  return true;
}
onboardingNext.addEventListener("click", () => {
  onboardPage++;
  if (onboardPage >= 3) {
    localStorage.setItem("postur_onboarded", "1");
    onboardingEl.classList.add("hidden");
    if (!showNameScreenIfNeeded()) {
      appEl.classList.remove("hidden");
      updateGreeting();
    }
    return;
  }
  onboardingEl.querySelectorAll(".onboarding-page").forEach((p,i) => p.classList.toggle("active", i===onboardPage));
  onboardingEl.querySelectorAll(".dot").forEach((d,i) => d.classList.toggle("active", i===onboardPage));
  if (onboardPage === 2) onboardingNext.textContent = "let's gooo \u{1F680}";
});

let splashHidden = false;
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  splash.classList.add('fade-out');
  appEl.classList.remove('hidden');
  setTimeout(() => splash.classList.add('hidden'), 500);
}

// Hide as soon as DOM is ready + a brief moment for the loader bar to feel intentional
window.addEventListener('load', () => {
  setTimeout(hideSplash, 800);
});
// Safety net — never get stuck on splash
setTimeout(hideSplash, 3500);

/* ---------- Wake Lock --------------------------------------- */

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (err) {
    console.warn('[WakeLock] Could not acquire:', err);
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try { await wakeLock.release(); } catch {}
  wakeLock = null;
}

// Re-acquire after the page comes back from being hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && running && !paused && !wakeLock) {
    acquireWakeLock();
  }
});

/* ---------- iOS audio unlock --------------------------------- */
// iOS Safari requires speechSynthesis.speak() to be called from inside a
// user gesture before any later programmatic calls will play.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    audioUnlocked = true;
  } catch {}
}

/* ---------- Toast -------------------------------------------- */

let toastTimeout = null;
function showToast(msg, kind = 'info', duration = 3500) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = 'toast ' + kind;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

/* ---------- Panel navigation --------------------------------- */

// ── Streak ────────────────────────────────────────────────────
function getStreak() { return loadJ("postur_streak"); }
function updateStreak() {
  const s = getStreak();
  streakCount.textContent = s.current || 0;
  streakBtn.classList.toggle("inactive", !(s.current > 0));
}
function bumpStreak() {
  const s = getStreak();
  const today = new Date().toDateString();
  if (s.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (s.lastDate === yesterday) { s.current = (s.current||0) + 1; }
  else { s.current = 1; }
  s.best = Math.max(s.best||0, s.current);
  s.lastDate = today;
  saveJ("postur_streak", s);
  updateStreak();
}

// ── History ───────────────────────────────────────────────────
function loadHistory() { return (loadJ("postur_history").sets || []); }
function saveHist(sets) { saveJ("postur_history", { sets }); }
function renderHistory() {
  const sets = loadHistory();
  const el = D("historyList");
  if (!sets.length) { el.innerHTML = "<p class=\"empty-state\">No workouts yet. Start your first set!</p>"; return; }
  el.innerHTML = sets.slice().reverse().map(s => {
    const g = s.grade.toLowerCase();
    return "<div class=\"history-item\"><div class=\"history-item-top\"><span class=\"history-date\">" +
      new Date(s.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) +
      "</span><span class=\"history-grade " + g + "\">" + s.grade + "</span></div>" +
      "<div class=\"history-item-stats\"><span>Reps<strong>" + s.reps + "</strong></span><span>Avg Depth<strong>" + s.avgDepth + "\u00b0</strong></span><span>Duration<strong>" + s.duration + "</strong></span></div></div>";
  }).join("");
}
// ── Records ──────────────────────────────────────────────────
function getRecords() { return loadJ("postur_records"); }
function checkPB(setResult) {
  const r = getRecords();
  const pbs = [];
  if (!r.bestRepScore || setResult.bestRep > r.bestRepScore) { r.bestRepScore = setResult.bestRep; r.bestRepDate = new Date().toISOString(); pbs.push("Best Single Rep Score"); }
  if (!r.bestAvgScore || setResult.avgScore > r.bestAvgScore) { r.bestAvgScore = setResult.avgScore; r.bestAvgDate = new Date().toISOString(); pbs.push("Best Avg Set Score"); }
  if (!r.mostReps || setResult.reps > r.mostReps) { r.mostReps = setResult.reps; r.mostRepsDate = new Date().toISOString(); pbs.push("Most Reps in a Set"); }
  const streak = getStreak();
  if (!r.longestStreak || (streak.current||0) > r.longestStreak) { r.longestStreak = streak.current; }
  saveJ("postur_records", r);
  return pbs;
}
function renderRecords() {
  const r = getRecords();
  const body = D("recordsBody");
  const cards = [
    { icon: "⚡", bg: "var(--green-dim)", label: "Best Rep Score", value: r.bestRepScore || "--", meta: r.bestRepDate ? new Date(r.bestRepDate).toLocaleDateString() : "" },
    { icon: "🎯", bg: "var(--yellow-dim)", label: "Best Avg Set Score", value: r.bestAvgScore || "--", meta: r.bestAvgDate ? new Date(r.bestAvgDate).toLocaleDateString() : "" },
    { icon: "💪", bg: "var(--orange-dim)", label: "Most Reps in a Set", value: r.mostReps || "--", meta: r.mostRepsDate ? new Date(r.mostRepsDate).toLocaleDateString() : "" },
    { icon: "🔥", bg: "var(--red-dim)", label: "Longest Streak", value: (r.longestStreak || 0) + " days", meta: "" },
  ];
  body.innerHTML = cards.map(c =>
    `<div class="record-card"><div class="record-icon" style="background:${c.bg}">${c.icon}</div><div class="record-info"><div class="record-label">${c.label}</div><div class="record-value">${c.value}</div>${c.meta ? `<div class="record-meta">${c.meta}</div>` : ""}</div></div>`
  ).join("");
}

// ── Confetti ─────────────────────────────────────────────────
function fireConfetti() {
  confettiCanvas.classList.remove("hidden");
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const particles = [];
  const colors = ["#22c55e","#eab308","#f97316","#ef4444","#45b5ff","#a855f7","#ffffff"];
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
  let frame;
  function draw() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.rv;
      p.life -= 0.005;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot * Math.PI / 180);
      confettiCtx.globalAlpha = Math.max(0, p.life);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      confettiCtx.restore();
    }
    if (alive) frame = requestAnimationFrame(draw);
    else { confettiCanvas.classList.add("hidden"); confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); }
  }
  frame = requestAnimationFrame(draw);
}

async function initLandmarker() {
  await ensureMediaPipeLoaded();

  if (!FilesetResolver) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    const ns = window.vision || window;
    FilesetResolver = ns.FilesetResolver;
    PoseLandmarker = ns.PoseLandmarker;
  }
  if (!FilesetResolver || !PoseLandmarker) {
    throw new Error('MediaPipe failed to load (missing vision bundle)');
  }

async function initLandmarker() {
  await loadMediaPipe();
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

// ── Camera ───────────────────────────────────────────────────
async function startCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  const facing = settings.frontCam ? "user" : "environment";
  // Try ideal facingMode first, fall back to any camera
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 720 }, height: { ideal: 960 } },
      audio: false,
    });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");
  await video.play();
  cameraWrap.classList.toggle('is-front', settings.frontCam);
  placeholder.classList.add('hidden');
}

async function flipCamera() {
  settings.frontCam = !settings.frontCam;
  saveSets();
  await startCamera();
}
camFlipBtn.addEventListener("click", flipCamera);

// ── Pose Drawing ─────────────────────────────────────────────
const SKEL = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
function drawPose(lm) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  for (const [a,b] of SKEL) {
    const A = lm[a], B = lm[b];
    if (!A || !B || A.visibility < 0.5 || B.visibility < 0.5) continue;
    const g = ctx.createLinearGradient(A.x*w, A.y*h, B.x*w, B.y*h);
    g.addColorStop(0, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,0.4)");
    ctx.beginPath(); ctx.moveTo(A.x*w, A.y*h); ctx.lineTo(B.x*w, B.y*h);
    ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
  }
  for (const i of [11,12,13,14,15,16,23,24,25,26,27,28]) {
    const p = lm[i]; if (!p || p.visibility < 0.5) continue;
    ctx.beginPath(); ctx.arc(p.x*w, p.y*h, 4, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
  }
  for (const i of [25,26]) {
    const p = lm[i]; if (!p || p.visibility < 0.5) continue;
    ctx.beginPath(); ctx.arc(p.x*w, p.y*h, 8, 0, Math.PI*2);
    ctx.fillStyle = hadValgus ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"; ctx.fill();
  }
}

// ── Form Analysis ────────────────────────────────────────────
function analyzeForm(lm, ka) {
  const hw = dist(lm[23], lm[24]), kw = dist(lm[25], lm[26]);
  const ha = ang(lm[11], lm[23], lm[25]);
  const cues = [];
  let pen = 0;
  if (hw > 1e-6 && (hw - kw)/hw > THRESH.valgus) { cues.push("knees out!"); hadValgus = true; pen += 15; }
  if (ha < 65) { cues.push("chest up, stay tall"); hadLean = true; pen += 10; }
  if (phase === "bottom" && ka > settings.depthTarget + 15) { cues.push("deeper! you got this"); pen += 10; }
  if (phase === "bottom" && ka <= settings.depthTarget) pen -= 5;
  formScore = Math.max(0, Math.min(100, formScore - pen * 0.3 + 0.5));
  return cues;
}

// ── State Machine ────────────────────────────────────────────
function updatePhase(ka) {
  const prev = phase;
  if (phase === "standing" && ka < THRESH.descent) { phase = "descending"; repStartTime = Date.now(); }
  else if (phase === "descending" && ka < THRESH.bottom) phase = "bottom";
  else if (phase === "bottom" && ka > THRESH.ascent) phase = "ascending";
  else if (phase === "ascending" && ka > THRESH.stand) phase = "standing";

  if (prev === "ascending" && phase === "standing") {
    repCount++;
    const tempoMs = Date.now() - repStartTime;
    let sc = 100;
    if (minAngle > settings.depthTarget + 20) sc -= 30;
    else if (minAngle > settings.depthTarget + 10) sc -= 15;
    else if (minAngle <= settings.depthTarget) sc += 5;
    if (hadValgus) sc -= 20;
    if (hadLean) sc -= 15;
    sc = Math.max(0, Math.min(100, sc));
    setData.push({ minAngle: Math.round(minAngle), hadValgus, hadLean, score: sc, tempoMs });
    minAngle = 180; hadValgus = false; hadLean = false;
    showRepFlash(repCount);
    haptic([30, 50, 30]);
    say(sc >= 80 ? `${repCount}, sheesh` : `${repCount}, tighten up`);
  }
}

// ── UI Updates ───────────────────────────────────────────────
function showCue(t) {
  const now = Date.now();
  if (t === lastCueMsg && now - lastCueTime < 2000) return;
  lastCueMsg = t; lastCueTime = now;
  cueText.textContent = t; cueOverlay.classList.remove("hidden"); haptic(50);
  clearTimeout(cueOverlay._t); cueOverlay._t = setTimeout(() => cueOverlay.classList.add("hidden"), 1500);
}
function showRepFlash(n) {
  repFlashNum.textContent = n; repFlash.classList.remove("hidden");
  clearTimeout(repFlash._t); repFlash._t = setTimeout(() => repFlash.classList.add("hidden"), 700);
}
function updateScoreRing(sc) {
  const off = 163.36 - (sc / 100) * 163.36;
  scoreRing.style.strokeDashoffset = off;
  scoreRing.style.stroke = sc >= 75 ? "#22c55e" : sc >= 50 ? "#eab308" : "#ef4444";
  scoreValue.textContent = Math.round(sc);
}
function setDot(cls) { hudStatus.querySelector(".hud-dot").className = "hud-dot " + cls; }
function updateDepth(ka) {
  if (phase === "bottom" || phase === "descending") {
    if (ka <= settings.depthTarget) { depthEl.textContent = "Good"; depthCard.className = "stat-card stat-depth good"; }
    else if (ka <= settings.depthTarget + 15) { depthEl.textContent = "Almost"; depthCard.className = "stat-card stat-depth ok"; }
    else { depthEl.textContent = "High"; depthCard.className = "stat-card stat-depth shallow"; }
  } else if (phase === "standing") { depthEl.textContent = "--"; depthCard.className = "stat-card stat-depth"; }
}

// ── Countdown ────────────────────────────────────────────────
function doCountdown() {
  if (!settings.countdown) return Promise.resolve();
  return new Promise(resolve => {
    countdownEl.classList.remove("hidden");
    let n = 3;
    countdownNum.textContent = n;
    say("3");
    const iv = setInterval(() => {
      n--;
      if (n > 0) { countdownNum.textContent = n; say(String(n)); }
      else if (n === 0) { countdownNum.textContent = "GO"; say("Go"); haptic(200); }
      else { clearInterval(iv); countdownEl.classList.add("hidden"); resolve(); }
    }, 900);
  });
}

// ── Main Loop ────────────────────────────────────────────────
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
    const lk = ang(lm[23], lm[25], lm[27]), rk = ang(lm[24], lm[26], lm[28]);
    const ka = Math.min(lk, rk);
    minAngle = Math.min(minAngle, ka);
    updatePhase(ka);
    const cues = analyzeForm(lm, ka);
    if (cues.length) showCue(cues[0]);
    repsEl.textContent = repCount; phaseEl.textContent = phase;
    angleEl.textContent = Math.round(ka) + "\u00b0";
    updateDepth(ka); updateScoreRing(formScore);
    // Tempo
    if (phase !== "standing" && repStartTime) {
      const t = ((Date.now() - repStartTime) / 1000).toFixed(1);
      tempoValue.textContent = t + "s"; hudTempo.classList.remove("hidden");
    } else { hudTempo.classList.add("hidden"); }
    setDot("active"); hudStatus.querySelector("span:last-child").textContent = "Tracking";
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDot("warning"); hudStatus.querySelector("span:last-child").textContent = "No person";
  }
  requestAnimationFrame(loop);
}

// ── Timer ────────────────────────────────────────────────────
function startTimer() {
  if (!timerStart) timerStart = Date.now();
  updateTimerUI();
  stopTimer();
  timerInterval = setInterval(() => {
    hudTimer.textContent = fmtTime(elapsedMsBeforePause + (Date.now() - timerStart));
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
skipRest.addEventListener("click", endRest);
addRest.addEventListener("click", () => { restRemaining += 30; });

// ── Camera Permission Pre-Ask ────────────────────────────────
function showCamPermission() {
  D("camPermission").classList.remove("hidden");
}
D("camPermAllow").addEventListener("click", () => {
  localStorage.setItem("postur_cam_asked", "1");
  D("camPermission").classList.add("hidden");
  doStartWorkout();
});
D("camPermCancel").addEventListener("click", () => {
  D("camPermission").classList.add("hidden");
});

async function startWorkout({ skipCamera = false } = {}) {
  // Triggered from a real user gesture — unlock iOS audio + acquire wake lock now
  unlockAudio();
  acquireWakeLock();

  startBtn.querySelector('span').textContent = 'Loading…';
  startBtn.disabled = true;
  startNoCameraBtn.disabled = true;

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
  lastPersonSeenAt = 0;

  // Update UI
  repsEl.textContent = '0';
  depthEl.textContent = '--';
  phaseEl.textContent = manualMode ? 'manual' : 'standing';
  angleEl.textContent = '--';
  scoreValue.textContent = '--';
  updateScoreRing(0);
  depthCard.className = 'stat-card stat-depth';

  startBtn.classList.add('hidden');
  startNoCameraBtn.classList.add('hidden');
  workoutCtrl.classList.remove('hidden');
  manualRepBtn.classList.toggle('hidden', !manualMode);
  summaryEl.classList.add('hidden');
  framingHint.classList.add('hidden');

  if (manualMode) {
    placeholder.classList.remove('hidden');
    placeholderText.textContent = skipCamera
      ? 'Manual mode — tap + Rep to log each squat'
      : 'Camera unavailable — tap + Rep to log each squat';
    hudStatus.querySelector('span:last-child').textContent = 'Manual mode';
    setStatusDot('warning');
    cueOverlay.classList.add('hidden');

    startTimer();
    haptic(100);
    say('Manual mode ready');
  } else {
    cueOverlay.classList.add('hidden');
    // 3-2-1 countdown so the user has time to get into position
    await runCountdown(3);
    startTimer();
    haptic(100);
    say('Let\'s go');
    loop();
  }

  // Restore button labels for next time
  startBtn.querySelector('span').textContent = 'Start Workout';
  startBtn.disabled = false;
  startNoCameraBtn.disabled = false;
}

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
    return 'Couldn\'t load AI model. Check your connection and reload.';
  }
  return 'Camera unavailable. Switched to manual mode.';
}

function runCountdown(seconds) {
  return new Promise((resolve) => {
    let n = seconds;
    countdownNum.textContent = String(n);
    countdownEl.classList.remove('hidden');
    haptic(20);
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        countdownEl.classList.add('hidden');
        haptic([40, 30, 40]);
        resolve();
        return;
      }
      countdownNum.textContent = String(n);
      countdownNum.classList.remove('pulse');
      // force reflow to restart animation
      void countdownNum.offsetWidth;
      countdownNum.classList.add('pulse');
      haptic(20);
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  });
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
    if (!noCameraMode) loop();
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
  manualRepBtn.classList.add('hidden');

  if (setData.length === 0) {
    startBtn.classList.remove('hidden');
    startNoCameraBtn.classList.remove('hidden');
    startBtn.querySelector('span').textContent = 'Start Workout';
    startBtn.disabled = false;
    startNoCameraBtn.disabled = false;
    return;
  }
  summaryGrade.textContent = grade;
  summaryGrade.className = "summary-grade" + (grade === "B" ? " b" : grade === "C" ? " c" : "");

  summaryStats.innerHTML = `
    <div class="summary-stat"><span class="summary-stat-label">Reps</span><span class="summary-stat-value">${setData.length}</span></div>
    <div class="summary-stat"><span class="summary-stat-label">Avg Depth</span><span class="summary-stat-value">${avgDepth}\u00b0</span></div>
    <div class="summary-stat"><span class="summary-stat-label">Score</span><span class="summary-stat-value">${avgScore}</span></div>`;

  summaryTempo.innerHTML = `
    <div class="summary-tempo-row"><span>Avg Tempo</span><span>${avgTempo}s / rep</span></div>
    <div class="summary-tempo-row"><span>Duration</span><span>${duration}</span></div>`;

  summaryReps.innerHTML = setData.map((r, i) => {
    const c = r.score >= 80 ? "var(--green)" : r.score >= 60 ? "var(--yellow)" : "var(--red)";
    const t = (r.tempoMs / 1000).toFixed(1);
    return `<div class="summary-rep-row"><span class="summary-rep-num">#${i+1}</span><div class="summary-rep-bar"><div class="summary-rep-fill" style="width:${r.score}%;background:${c}"></div></div><span class="summary-rep-tempo">${t}s</span><span class="summary-rep-score" style="color:${c}">${r.score}</span></div>`;
  }).join("");

  // Save history
  const sets = loadHistory();
  sets.push({ date: new Date().toISOString(), reps: setData.length, avgDepth, avgScore, grade, duration, repData: setData });
  saveHist(sets);

  // Streak
  bumpStreak();

  // Check PBs
  const pbs = checkPB({ bestRep, avgScore, reps: setData.length });
  if (pbs.length) {
    pbText.textContent = pbs[0] + "!";
    pbBanner.classList.remove("hidden");
    fireConfetti();
    haptic([50, 100, 50, 100, 50]);
    say(settings.userName ? `new PB ${settings.userName}, sheesh!` : "new PB, sheesh!");
  } else {
    pbBanner.classList.add("hidden");
    haptic([50, 100, 50]);
    say(grade === "A" ? "you ate that!" : grade === "B" ? "solid work" : "we're leveling up");
  }

  haptic([50, 100, 50]);
  say(grade === 'A' ? 'Great set!' : grade === 'B' ? 'Good work, keep improving' : 'Keep practicing your form');

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function resetForNewSet() {
  summaryEl.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startNoCameraBtn.classList.remove('hidden');
  startBtn.querySelector('span').textContent = 'Start Workout';
  startBtn.disabled = false;
  startNoCameraBtn.disabled = false;
  noCameraMode = false;

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
  manualRepBtn.classList.add('hidden');
  manualMode = false;
}

// ── AI Coaching ─────────────────────────────────────────────
const aiCoachBtn = D("aiCoachBtn");
const aiCoachBtnText = D("aiCoachBtnText");
const aiCoaching = D("aiCoaching");
const aiCoachingText = D("aiCoachingText");

aiCoachBtn.addEventListener("click", async () => {
  if (!setData.length) return;
  aiCoachBtnText.textContent = "Analyzing...";
  aiCoachBtn.disabled = true;

startBtn.addEventListener('click', () => startWorkout());
startNoCameraBtn.addEventListener('click', () => startWorkout({ skipCamera: true }));
pauseBtn.addEventListener('click', pauseWorkout);
finishBtn.addEventListener('click', finishWorkout);
newSetBtn.addEventListener('click', resetForNewSet);

  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setData, avgScore, grade, reps: setData.length, avgDepth, avgTempo, userName: settings.userName || "" }),
    });
    const data = await res.json();
    if (res.ok && data.feedback) {
      aiCoachingText.textContent = data.feedback;
      aiCoaching.classList.remove("hidden");
      aiCoachBtn.classList.add("hidden");
    } else {
      aiCoachBtnText.textContent = "AI Coach unavailable";
      setTimeout(() => { aiCoachBtnText.textContent = "Get AI Coaching"; aiCoachBtn.disabled = false; }, 3000);
    }
  } catch {
    aiCoachBtnText.textContent = "AI Coach unavailable";
    setTimeout(() => { aiCoachBtnText.textContent = "Get AI Coaching"; aiCoachBtn.disabled = false; }, 3000);
  }
});

manualRepBtn.addEventListener('click', () => {
  if (!running || paused || !manualMode) return;
  repCount++;
  const repScore = 75;
  setData.push({
    minAngle: settings.depthTarget + 10,
    hadValgus: false,
    hadLean: false,
    score: repScore,
    depthLabel: 'manual',
  });
  repsEl.textContent = String(repCount);
  phaseEl.textContent = 'manual';
  angleEl.textContent = '--';
  updateScoreRing(repScore);
  showRepFlash(repCount);
  say(`${repCount}`);
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
