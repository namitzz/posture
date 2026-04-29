let FilesetResolver, PoseLandmarker;

const D = id => document.getElementById(id);

const splash = D("splash"), appEl = D("app"), video = D("camera"), canvas = D("overlay");
const ctx = canvas.getContext("2d");
const placeholder = D("cameraPlaceholder"), hudStatus = D("hudStatus"), hudTimer = D("hudTimer");
const hudTempo = D("hudTempo"), tempoValue = D("tempoValue"), camFlipBtn = D("camFlipBtn");
const scoreRing = D("scoreRing"), scoreValue = D("scoreValue");
const cueOverlay = D("cueOverlay"), cueText = D("cueText");
const repFlash = D("repFlash"), repFlashNum = D("repFlashNum");
const repsEl = D("reps"), depthEl = D("depth"), phaseEl = D("phase"), angleEl = D("angle");
const depthCard = document.querySelector(".stat-depth");
const startBtn = D("startBtn"), controlsSection = D("controlsSection");
const workoutCtrl = D("workoutControls"), pauseBtn = D("pauseBtn");
const finishBtn = D("finishBtn"), audioToggle = D("audioToggle");
const restTimerEl = D("restTimer"), restRing = D("restRing"), restTimeEl = D("restTime");
const skipRest = D("skipRest"), addRest = D("addRest");
const summaryEl = D("summary"), summaryGrade = D("summaryGrade");
const pbBanner = D("pbBanner"), pbText = D("pbText");
const summaryStats = D("summaryStats"), summaryTempo = D("summaryTempo");
const summaryReps = D("summaryReps"), shareBtn = D("shareBtn"), newSetBtn = D("newSetBtn");
const streakBtn = D("streakBtn"), streakCount = D("streakCount");
const countdownEl = D("countdown"), countdownNum = D("countdownNum");
const confettiCanvas = D("confetti");
const confettiCtx = confettiCanvas.getContext("2d");
const onboardingEl = D("onboarding"), onboardingNext = D("onboardingNext");

// ── Helpers ───────────────────────────────────────────────────
function loadJ(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } }
function saveJ(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function ang(a, b, c) {
  const ba = [a.x - b.x, a.y - b.y], bc = [c.x - b.x, c.y - b.y];
  const dot = ba[0]*bc[0] + ba[1]*bc[1];
  return (Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...ba)*Math.hypot(...bc)+1e-6)))) * 180) / Math.PI;
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
const DEFS = { frontCam:false, voice:true, haptic:true, countdown:true, depthTarget:90, restDuration:60 };
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
    return;
  }
  onboardingEl.querySelectorAll(".onboarding-page").forEach((p,i) => p.classList.toggle("active", i===onboardPage));
  onboardingEl.querySelectorAll(".dot").forEach((d,i) => d.classList.toggle("active", i===onboardPage));
  if (onboardPage === 2) onboardingNext.textContent = "Get Started";
});

// ── Splash ────────────────────────────────────────────────────
window.addEventListener("load", () => {
  setTimeout(() => {
    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.classList.add("hidden");
      if (!showOnboarding()) appEl.classList.remove("hidden");
      else {
        appEl.classList.remove("hidden");
      }
      updateStreak();
    }, 600);
  }, 2200);
});

// ── Panels ────────────────────────────────────────────────────
function openPanel(p) { p.classList.remove("hidden","closing"); }
function closePanel(p) { p.classList.add("closing"); setTimeout(()=>{ p.classList.add("hidden"); p.classList.remove("closing"); }, 250); }

D("historyBtn").addEventListener("click", () => { renderHistory(); openPanel(D("historyPanel")); });
D("closeHistory").addEventListener("click", () => closePanel(D("historyPanel")));
D("recordsBtn").addEventListener("click", () => { renderRecords(); openPanel(D("recordsPanel")); });
D("closeRecords").addEventListener("click", () => closePanel(D("recordsPanel")));
D("settingsBtn").addEventListener("click", () => openPanel(D("settingsPanel")));
D("closeSettings").addEventListener("click", () => closePanel(D("settingsPanel")));
D("openGuide").addEventListener("click", () => { closePanel(D("settingsPanel")); setTimeout(()=>openPanel(D("guidePanel")),300); });
D("closeGuide").addEventListener("click", () => closePanel(D("guidePanel")));
D("clearDataBtn").addEventListener("click", () => {
  if (confirm("Clear all workout data? This cannot be undone.")) {
    localStorage.removeItem("postur_history"); localStorage.removeItem("postur_records"); localStorage.removeItem("postur_streak");
    alert("Data cleared.");
  }
});

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

// ── MediaPipe ────────────────────────────────────────────────
async function loadMediaPipe() {
  if (FilesetResolver) return;
  // Try ES module dynamic import first
  try {
    const mp = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/+esm");
    FilesetResolver = mp.FilesetResolver;
    PoseLandmarker = mp.PoseLandmarker;
    return;
  } catch {}
  // Fallback: load via script tag (UMD)
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
  if (!FilesetResolver) throw new Error("MediaPipe failed to load");
}

async function initLandmarker() {
  await loadMediaPipe();
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
  );
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    numPoses: 1,
    runningMode: "VIDEO",
  });
}

// ── Camera ───────────────────────────────────────────────────
async function startCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: settings.frontCam ? "user" : "environment", width: { ideal: 720 }, height: { ideal: 960 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  placeholder.classList.add("hidden");
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
  if (hw > 1e-6 && (hw - kw)/hw > THRESH.valgus) { cues.push("Push knees out"); hadValgus = true; pen += 15; }
  if (ha < 65) { cues.push("Chest up"); hadLean = true; pen += 10; }
  if (phase === "bottom" && ka > settings.depthTarget + 15) { cues.push("Go deeper"); pen += 10; }
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
    say(sc >= 80 ? `${repCount}` : `${repCount}, watch your form`);
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
  try { result = landmarker.detectForVideo(video, performance.now()); } catch { requestAnimationFrame(loop); return; }
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
  timerStart = Date.now(); hudTimer.textContent = "00:00";
  timerInterval = setInterval(() => { hudTimer.textContent = fmtTime(Date.now() - timerStart); }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

// ── Rest Timer ───────────────────────────────────────────────
function startRest() {
  restRemaining = settings.restDuration;
  const total = restRemaining;
  const circ = 326.73;
  restTimeEl.textContent = restRemaining;
  restRing.style.strokeDashoffset = "0";
  restTimerEl.classList.remove("hidden");
  summaryEl.classList.add("hidden");

  restInterval = setInterval(() => {
    restRemaining--;
    restTimeEl.textContent = Math.max(0, restRemaining);
    restRing.style.strokeDashoffset = ((total - restRemaining) / total * circ).toString();
    if (restRemaining <= 0) { endRest(); haptic([100,50,100]); say("Rest over. Let's go."); }
  }, 1000);
}
function endRest() {
  clearInterval(restInterval); restInterval = null;
  restTimerEl.classList.add("hidden");
  resetForNewSet();
}
skipRest.addEventListener("click", endRest);
addRest.addEventListener("click", () => { restRemaining += 30; });

// ── Workout Lifecycle ────────────────────────────────────────
async function startWorkout() {
  startBtn.querySelector("span").textContent = "Loading...";
  startBtn.disabled = true;
  try {
    if (!landmarker) await initLandmarker();
    await startCamera();
  } catch (err) {
    startBtn.querySelector("span").textContent = "Start Workout";
    startBtn.disabled = false;
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      alert("Camera access denied. Please allow camera permission in your browser settings to use postur.");
    } else {
      alert("Could not start: " + err.message);
    }
    return;
  }

  // Countdown
  await doCountdown();

  running = true; paused = false; phase = "standing"; repCount = 0;
  minAngle = 180; hadValgus = false; hadLean = false;
  setData = []; formScore = 100; repStartTime = 0;

  repsEl.textContent = "0"; depthEl.textContent = "--"; phaseEl.textContent = "standing";
  angleEl.textContent = "--"; scoreValue.textContent = "--";
  updateScoreRing(0); depthCard.className = "stat-card stat-depth";

  controlsSection.classList.add("hidden");
  workoutCtrl.classList.remove("hidden");
  camFlipBtn.classList.remove("hidden");
  summaryEl.classList.add("hidden");
  restTimerEl.classList.add("hidden");

  startTimer(); haptic(100); say("Let's go");
  loop();
}

function pauseWorkout() {
  paused = !paused;
  if (paused) {
    pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume';
    setDot(""); hudStatus.querySelector("span:last-child").textContent = "Paused";
    stopTimer();
  } else {
    pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
    startTimer(); loop();
  }
}

function finishWorkout() {
  running = false; paused = false; stopTimer();
  const duration = fmtTime(Date.now() - timerStart);
  workoutCtrl.classList.add("hidden");
  camFlipBtn.classList.add("hidden");
  hudTempo.classList.add("hidden");

  if (!setData.length) { resetForNewSet(); return; }

  const avgDepth = Math.round(setData.reduce((s,r) => s + r.minAngle, 0) / setData.length);
  const avgScore = Math.round(setData.reduce((s,r) => s + r.score, 0) / setData.length);
  const bestRep = Math.max(...setData.map(r => r.score));
  const avgTempo = Math.round(setData.reduce((s,r) => s + r.tempoMs, 0) / setData.length / 100) / 10;
  const grade = avgScore >= 80 ? "A" : avgScore >= 60 ? "B" : "C";

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
    say("New personal best!");
  } else {
    pbBanner.classList.add("hidden");
    haptic([50, 100, 50]);
    say(grade === "A" ? "Great set!" : grade === "B" ? "Good work" : "Keep practicing");
  }

  summaryEl.classList.remove("hidden");
}

function resetForNewSet() {
  summaryEl.classList.add("hidden"); restTimerEl.classList.add("hidden");
  controlsSection.classList.remove("hidden");
  startBtn.querySelector("span").textContent = "Start Workout";
  startBtn.disabled = false;
  repsEl.textContent = "0"; depthEl.textContent = "--"; phaseEl.textContent = "idle";
  angleEl.textContent = "--"; scoreValue.textContent = "--";
  updateScoreRing(0); hudTimer.textContent = "00:00";
  setDot(""); hudStatus.querySelector("span:last-child").textContent = "Ready";
}

// ── Share ────────────────────────────────────────────────────
shareBtn.addEventListener("click", async () => {
  if (!setData.length) return;
  const avgScore = Math.round(setData.reduce((s,r) => s + r.score, 0) / setData.length);
  const grade = avgScore >= 80 ? "A" : avgScore >= 60 ? "B" : "C";
  const text = `postur \u2014 Set Complete!\n\nReps: ${setData.length}\nGrade: ${grade}\nAvg Score: ${avgScore}/100\n\nTry postur \u2014 AI squat form coach`;
  if (navigator.share) {
    try { await navigator.share({ title: "postur Results", text }); } catch {}
  } else {
    try { await navigator.clipboard.writeText(text); alert("Results copied to clipboard!"); } catch { alert(text); }
  }
});

// ── Events ───────────────────────────────────────────────────
startBtn.addEventListener("click", startWorkout);
pauseBtn.addEventListener("click", pauseWorkout);
finishBtn.addEventListener("click", finishWorkout);
newSetBtn.addEventListener("click", () => { startRest(); });
audioToggle.addEventListener("click", () => {
  audioOn = !audioOn;
  audioToggle.classList.toggle("muted", !audioOn);
  if (!audioOn) speechSynthesis?.cancel();
});

// ── Service Worker ───────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}
