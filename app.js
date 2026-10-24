let measuring = false;
const MAX_POINTS = 300;

// Chart.js 初期化（縦軸固定 ±5 m/s²）
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
        min: -5,     // ★縦軸固定（下限）
        max: 5,      // ★縦軸固定（上限）
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
//  重力除去（ローパス＋ハイパス）
// ------------------------------
let gravity = { x: 0, y: 0, z: 0 };
const alpha = 0.8;  // ローパス係数（0.8〜0.98が一般的）

function removeGravity(acc) {
  // ローパスで重力成分を推定
  gravity.x = alpha * gravity.x + (1 - alpha) * acc.x;
  gravity.y = alpha * gravity.y + (1 - alpha) * acc.y;
  gravity.z = alpha * gravity.z + (1 - alpha) * acc.z;

  // ハイパスで振動成分だけ抽出
  return {
    x: acc.x - gravity.x,
    y: acc.y - gravity.y,
    z: acc.z - gravity.z
  };
}

// ------------------------------
//  計測開始
// ------------------------------
function startMeasuring() {
  if (measuring) return;
  measuring = true;
  setStatus("計測中");
  window.addEventListener("devicemotion", onMotion);
}

// ------------------------------
//  計測停止
// ------------------------------
function stopMeasuring() {
  measuring = false;
  setStatus("停止");
  window.removeEventListener("devicemotion", onMotion);
}

// ------------------------------
//  波形更新
// ------------------------------
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

// ------------------------------
//  センサーイベント
// ------------------------------
function onMotion(e) {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;

  // 重力除去
  const filtered = removeGravity({
    x: acc.x || 0,
    y: acc.y || 0,
    z: acc.z || 0
  });

  updateChart(filtered.x, filtered.y, filtered.z);
}

// ------------------------------
//  カメラ開始
// ------------------------------
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    const video = document.getElementById("camera");
    video.srcObject = stream;

    setStatus("カメラ起動中");
  } catch (err) {
    setStatus("カメラ起動失敗: " + err);
  }
}

// ------------------------------
//  ボタン紐付け
// ------------------------------
document.getElementById("btnStart").onclick = () => {
  startCamera();
  startMeasuring();
};

document.getElementById("btnStop").onclick = stopMeasuring;
