let measuring = false;
const MAX_POINTS = 300;

// ------------------------------
// Chart.js（縦軸固定 ±5）
// ------------------------------
const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "X", borderColor: "red", data: [], pointRadius: 0 },
      { label: "Y", borderColor: "green", data: [], pointRadius: 0 },
      { label: "Z", borderColor: "blue", data: [], pointRadius: 0 }
    ]
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: { display: false },
      y: {
        min: -5,
        max: 5,
        title: { display: true, text: "加速度 (m/s²)" }
      }
    }
  }
});

// 状態表示
function setStatus(s) {
  document.getElementById("status").textContent = "状態: " + s;
}

// ------------------------------
// 重力除去（ローパス＋ハイパス）
// ------------------------------
let gravity = { x: 0, y: 0, z: 0 };
const alpha = 0.95;  // 精度高め

function removeGravity(acc) {
  gravity.x = alpha * gravity.x + (1 - alpha) * acc.x;
  gravity.y = alpha * gravity.y + (1 - alpha) * acc.y;
  gravity.z = alpha * gravity.z + (1 - alpha) * acc.z;

  return {
    x: acc.x - gravity.x,
    y: acc.y - gravity.y,
    z: acc.z - gravity.z
  };
}

// ------------------------------
// 振動計測
// ------------------------------
function startMeasuring() {
  if (measuring) return;
  measuring = true;
  setStatus("計測中");
  window.addEventListener("devicemotion", onMotion);
}

function stopMeasuring() {
  measuring = false;
  setStatus("停止");
  window.removeEventListener("devicemotion", onMotion);
}

function updateChart(x, y, z) {
  const labels = chart.data.labels;
  const dx = chart.data.datasets[0].data;
  const dy = chart.data.datasets[1].data;
  const dz = chart.data.datasets[2].data;

  labels.push("");
  dx.push(x);
  dy.push(y);
  dz.push(z);

  if (dx.length > MAX_POINTS) {
    labels.shift();
    dx.shift();
    dy.shift();
    dz.shift();
  }

  chart.update();
}

function onMotion(e) {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;

  const filtered = removeGravity({
    x: acc.x || 0,
    y: acc.y || 0,
    z: acc.z || 0
  });

  updateChart(filtered.x, filtered.y, filtered.z);
}

// ------------------------------
// 物体認識（COCO-SSD）
// ------------------------------
let detectionModel = null;
const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");

async function loadDetectionModel() {
  if (!detectionModel) {
    detectionModel = await cocoSsd.load();
    console.log("COCO-SSD model loaded");
  }
}

async function startDetectionLoop(video) {
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  const allowed = ["person", "chair", "dining table"]; // ★ラベル絞り込み

  async function detectFrame() {
    if (!detectionModel) return;

    const predictions = await detectionModel.detect(video);
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    predictions.forEach(p => {
      if (!allowed.includes(p.class)) return;

      const [x, y, w, h] = p.bbox;

      overlayCtx.strokeStyle = "lime";
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(x, y, w, h);

      overlayCtx.font = "16px sans-serif";
      overlayCtx.fillStyle = "yellow";
      overlayCtx.fillText(
        `${p.class} (${Math.round(p.score * 100)}%)`,
        x,
        y > 10 ? y - 5 : 10
      );
    });

    requestAnimationFrame(detectFrame);
  }

  detectFrame();
}

// ------------------------------
// カメラ起動＋物体認識開始
// ------------------------------
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    const video = document.getElementById("camera");
    video.srcObject = stream;

    await video.play();
    setStatus("カメラ起動中");

    await loadDetectionModel();
    startDetectionLoop(video);

  } catch (err) {
    setStatus("カメラ起動失敗: " + err);
  }
}

// ------------------------------
// ボタン
// ------------------------------
document.getElementById("btnStart").onclick = () => {
  startCamera();
  startMeasuring();
};

document.getElementById("btnStop").onclick = stopMeasuring;
