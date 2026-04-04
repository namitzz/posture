const { FilesetResolver, PoseLandmarker } = window;

const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('status');
const repsEl = document.getElementById('reps');
const phaseEl = document.getElementById('phase');
const angleEl = document.getElementById('angle');
const cueEl = document.getElementById('cue');
const summaryEl = document.getElementById('summary');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const audioBtn = document.getElementById('audioBtn');

let landmarker;
let stream;
let running = false;
let audioEnabled = true;
let state = 'standing';
let repCount = 0;
let minAngleThisRep = 180;
let hadValgus = false;
let hadLean = false;
let setData = [];

const THRESHOLDS = {
  descent: 175,
  bottom: 155,
  ascent: 160,
  stand: 170,
  depthGood: 90,
  kneeValgusRatio: 0.15,
};

function say(text) {
  if (!audioEnabled || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a, b, c) {
  const ba = [a.x - b.x, a.y - b.y];
  const bc = [c.x - b.x, c.y - b.y];
  const dot = ba[0] * bc[0] + ba[1] * bc[1];
  const denom = Math.hypot(...ba) * Math.hypot(...bc) + 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / denom));
  return (Math.acos(cos) * 180) / Math.PI;
}

function showCue(text) {
  cueEl.textContent = text;
  cueEl.classList.remove('hidden');
  setTimeout(() => cueEl.classList.add('hidden'), 1100);
}

function updateState(kneeAngle) {
  const prev = state;
  if (state === 'standing' && kneeAngle < THRESHOLDS.descent) state = 'descending';
  else if (state === 'descending' && kneeAngle < THRESHOLDS.bottom) state = 'bottom';
  else if (state === 'bottom' && kneeAngle > THRESHOLDS.ascent) state = 'ascending';
  else if (state === 'ascending' && kneeAngle > THRESHOLDS.stand) state = 'standing';

  if (prev === 'ascending' && state === 'standing') {
    repCount += 1;
    setData.push({ minAngle: minAngleThisRep, hadValgus, hadLean });
    minAngleThisRep = 180;
    hadValgus = false;
    hadLean = false;
    say(`${repCount}`);
  }
}

function feedbackForPose(lm, kneeAngle) {
  const hipWidth = dist(lm[23], lm[24]);
  const kneeWidth = dist(lm[25], lm[26]);
  const hipAngle = angle(lm[11], lm[23], lm[25]);

  const feedback = [];
  if (hipWidth > 1e-6 && (hipWidth - kneeWidth) / hipWidth > THRESHOLDS.kneeValgusRatio) {
    feedback.push('Knees out');
    hadValgus = true;
  }
  if (hipAngle < 70) {
    feedback.push('Chest up');
    hadLean = true;
  }
  if (state === 'bottom' && kneeAngle > THRESHOLDS.depthGood + 10) {
    feedback.push('Go deeper');
  }
  return feedback;
}

function drawPose(lm) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#45b5ff';
  ctx.lineWidth = 3;

  const links = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
  for (const [a,b] of links) {
    const A = lm[a], B = lm[b];
    if (!A || !B || A.visibility < 0.5 || B.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(A.x * w, A.y * h);
    ctx.lineTo(B.x * w, B.y * h);
    ctx.stroke();
  }
}

function summarizeSet() {
  if (!setData.length) return 'No reps yet.';
  const avgDepth = setData.reduce((s, r) => s + r.minAngle, 0) / setData.length;
  const valgus = setData.filter(r => r.hadValgus).length;
  const lean = setData.filter(r => r.hadLean).length;
  return `Set complete\nReps: ${setData.length}\nAvg depth angle: ${avgDepth.toFixed(1)}°\nKnee valgus reps: ${valgus}\nForward lean reps: ${lean}`;
}

async function loop() {
  if (!running) return;

  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 960;

  const result = landmarker.detectForVideo(video, performance.now());
  const lm = result?.landmarks?.[0];

  if (lm) {
    drawPose(lm);
    const leftKnee = angle(lm[23], lm[25], lm[27]);
    const rightKnee = angle(lm[24], lm[26], lm[28]);
    const kneeAngle = Math.min(leftKnee, rightKnee);

    minAngleThisRep = Math.min(minAngleThisRep, kneeAngle);
    updateState(kneeAngle);

    const cues = feedbackForPose(lm, kneeAngle);
    if (cues.length) {
      showCue(cues[0]);
      say(cues[0]);
    }

    repsEl.textContent = String(repCount);
    phaseEl.textContent = state;
    angleEl.textContent = `${kneeAngle.toFixed(0)}°`;
    statusEl.textContent = 'Tracking';
  } else {
    statusEl.textContent = 'No person detected';
  }

  requestAnimationFrame(loop);
}

async function initLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
  );

  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    numPoses: 1,
    runningMode: 'VIDEO',
  });
}

async function start() {
  if (!landmarker) await initLandmarker();
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  }

  running = true;
  statusEl.textContent = 'Starting...';
  startBtn.textContent = 'Stop';
  summaryEl.classList.add('hidden');
  loop();
}

function stop() {
  running = false;
  statusEl.textContent = 'Paused';
  startBtn.textContent = 'Start';
  summaryEl.textContent = summarizeSet();
  summaryEl.classList.remove('hidden');
}

startBtn.addEventListener('click', () => (running ? stop() : start()).catch((err) => {
  statusEl.textContent = `Error: ${err.message}`;
}));

resetBtn.addEventListener('click', () => {
  state = 'standing';
  repCount = 0;
  minAngleThisRep = 180;
  hadValgus = false;
  hadLean = false;
  setData = [];
  repsEl.textContent = '0';
  phaseEl.textContent = 'standing';
  angleEl.textContent = '--';
  summaryEl.classList.add('hidden');
});

audioBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  audioBtn.textContent = `Audio: ${audioEnabled ? 'On' : 'Off'}`;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
