/* ==========================================
   CloudPresence - Vanilla JS (app.js)
   ========================================== */

// --- CONFIG ---
const BASE_URL = "https://script.google.com/macros/s/AKfycbx7pqM5-XCphcHR9AaU4ha0VmHad0WINOu88T9MljZDWTmiwQw-a2dN0yaWrXpAMFVe/exec";

const USER_DATA = {
  user_id: "434231000",
  course_id: "cloud-101",
  session_id: "sesi-02"
};

const QR_DURATION_SECONDS = 300; // 5 menit

// --- STATE ---
let currentToken = null;
let countdownInterval = null;
let countdownTimeLeft = 0;
let countdownTotal = 0;
let cameraStream = null;
let scanningActive = false;
let animFrameId = null;

// ==============================================
// 1. TAB SWITCHING
// ==============================================
function switchTab(tab) {
  const adminPanel = document.getElementById("panel-admin");
  const mhsPanel = document.getElementById("panel-mahasiswa");
  const btnAdmin = document.getElementById("tab-admin");
  const btnMhs = document.getElementById("tab-mhs");

  if (tab === "admin") {
    adminPanel.style.display = "block";
    mhsPanel.style.display = "none";
    btnAdmin.classList.add("active");
    btnMhs.classList.remove("active");
    stopCamera();
  } else {
    adminPanel.style.display = "none";
    mhsPanel.style.display = "block";
    btnAdmin.classList.remove("active");
    btnMhs.classList.add("active");
  }
}

// ==============================================
// 2. ADMIN - GENERATE QR
// ==============================================
async function generateQR() {
  const btn = document.getElementById("btn-generate");
  const qrResult = document.getElementById("qr-result");
  const errorBanner = document.getElementById("generate-error");

  btn.disabled = true;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Generating...';
  errorBanner.style.display = "none";

  const payload = {
    course_id: USER_DATA.course_id,
    session_id: USER_DATA.session_id,
    ts: new Date().toISOString()
  };

  try {
    const res = await fetch(BASE_URL + "?path=presence/qr/generate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.ok && json.data) {
      currentToken = json.data.qr_token;

      // Show result card
      qrResult.style.display = "block";
      document.getElementById("qr-token-text").innerText = currentToken;
      document.getElementById("btn-regenerate").style.display = "none";

      // Render QR Code
      document.getElementById("qrcode").innerHTML = "";
      new QRCode(document.getElementById("qrcode"), {
        text: currentToken,
        width: 200,
        height: 200,
        colorDark: "#1a1a2e",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      // Start countdown
      startCountdown(QR_DURATION_SECONDS);

      // Update generate button to "regenerate" style
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Generate Ulang';
    } else {
      showGenerateError(json.error || "Gagal generate token");
    }
  } catch (err) {
    showGenerateError("Gagal koneksi ke server!");
  } finally {
    btn.disabled = false;
  }
}

function showGenerateError(msg) {
  const errorBanner = document.getElementById("generate-error");
  document.getElementById("generate-error-text").innerText = msg;
  errorBanner.style.display = "flex";
}

// ==============================================
// 3. COUNTDOWN TIMER
// ==============================================
function startCountdown(duration) {
  clearInterval(countdownInterval);
  countdownTotal = duration;
  countdownTimeLeft = duration;

  updateTimerUI();

  countdownInterval = setInterval(function () {
    countdownTimeLeft--;

    if (countdownTimeLeft <= 0) {
      countdownTimeLeft = 0;
      clearInterval(countdownInterval);
      onTimerExpired();
    }

    updateTimerUI();
  }, 1000);
}

function updateTimerUI() {
  const timerText = document.getElementById("timer-text");
  const timerIcon = document.getElementById("timer-icon");
  const timerLabel = document.getElementById("timer-label");
  const progressFill = document.getElementById("progress-fill");
  const qrFrame = document.getElementById("qr-frame");

  // Format time
  const minutes = Math.floor(countdownTimeLeft / 60);
  const seconds = countdownTimeLeft % 60;
  const formatted = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  timerText.innerText = formatted;

  // Progress
  const progress = countdownTotal > 0 ? (countdownTimeLeft / countdownTotal) * 100 : 0;
  progressFill.style.width = progress + "%";

  // Color states
  const isExpired = countdownTimeLeft === 0 && countdownTotal > 0;
  const isWarning = countdownTimeLeft > 0 && countdownTimeLeft <= 60;

  // Timer text color
  timerText.classList.remove("warning", "expired");
  timerIcon.classList.remove("icon-primary");
  timerIcon.style.color = "";

  if (isExpired) {
    timerText.classList.add("expired");
    timerIcon.style.color = "var(--danger)";
  } else if (isWarning) {
    timerText.classList.add("warning");
    timerIcon.style.color = "var(--warning)";
  } else {
    timerIcon.classList.add("icon-primary");
  }

  // Progress bar color
  progressFill.classList.remove("warning", "expired");
  if (isExpired) {
    progressFill.classList.add("expired");
  } else if (isWarning) {
    progressFill.classList.add("warning");
  }

  // QR frame
  qrFrame.classList.toggle("expired", isExpired);

  // Label
  if (isExpired) {
    timerLabel.innerText = "Token telah kedaluwarsa. Silakan generate ulang.";
  } else if (isWarning) {
    timerLabel.innerText = "Token akan segera kedaluwarsa!";
  } else {
    timerLabel.innerText = "Sisa waktu token berlaku";
  }
}

function onTimerExpired() {
  document.getElementById("btn-regenerate").style.display = "flex";
}

// ==============================================
// 4. COPY TOKEN
// ==============================================
function copyToken() {
  if (!currentToken) return;

  navigator.clipboard.writeText(currentToken).then(function () {
    var copyIcon = document.getElementById("copy-icon");
    copyIcon.outerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="copy-icon" class="copied-check"><path d="M20 6 9 17l-5-5"/></svg>';

    setTimeout(function () {
      var icon = document.getElementById("copy-icon");
      icon.outerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="copy-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    }, 2000);
  }).catch(function () {
    // Clipboard not available
  });
}

// ==============================================
// 5. STUDENT - QR SCANNER (Camera + BarcodeDetector)
// ==============================================
function startCamera() {
  var placeholder = document.getElementById("scanner-placeholder");
  var live = document.getElementById("scanner-live");
  var btnStart = document.getElementById("btn-start-scan");
  var btnStop = document.getElementById("btn-stop-scan");

  placeholder.style.display = "none";
  live.style.display = "block";
  btnStart.style.display = "none";
  btnStop.style.display = "flex";

  setScanStatus("scanning", "Arahkan kamera ke QR Code...");

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(function (stream) {
      cameraStream = stream;
      var video = document.getElementById("scanner-video");
      video.srcObject = stream;
      video.play();
      scanningActive = true;

      video.onloadedmetadata = function () {
        scanQRFromVideo();
      };
    })
    .catch(function () {
      setScanStatus("error", "Tidak dapat mengakses kamera");
      placeholder.style.display = "flex";
      placeholder.querySelector("p").innerText = "Akses kamera ditolak. Periksa izin browser.";
      live.style.display = "none";
      btnStart.style.display = "flex";
      btnStop.style.display = "none";
    });
}

function stopCamera() {
  scanningActive = false;

  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach(function (t) { t.stop(); });
    cameraStream = null;
  }

  var placeholder = document.getElementById("scanner-placeholder");
  var live = document.getElementById("scanner-live");
  var btnStart = document.getElementById("btn-start-scan");
  var btnStop = document.getElementById("btn-stop-scan");

  if (placeholder) placeholder.style.display = "flex";
  if (live) live.style.display = "none";
  if (btnStart) btnStart.style.display = "flex";
  if (btnStop) btnStop.style.display = "none";

  // Reset placeholder text
  var placeholderText = placeholder ? placeholder.querySelector("p") : null;
  if (placeholderText) placeholderText.innerText = "Tekan tombol di bawah untuk mulai scan";

  setScanStatus("idle", "Siap memindai QR Code");
}

function scanQRFromVideo() {
  if (!scanningActive) return;

  var video = document.getElementById("scanner-video");
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    animFrameId = requestAnimationFrame(scanQRFromVideo);
    return;
  }

  // Create an offscreen canvas for detection
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  if ("BarcodeDetector" in window) {
    var detector = new BarcodeDetector({ formats: ["qr_code"] });
    detector.detect(canvas).then(function (barcodes) {
      if (barcodes.length > 0 && scanningActive) {
        scanningActive = false;
        processCheckIn(barcodes[0].rawValue);
        return;
      }
      if (scanningActive) {
        animFrameId = requestAnimationFrame(scanQRFromVideo);
      }
    }).catch(function () {
      if (scanningActive) {
        animFrameId = requestAnimationFrame(scanQRFromVideo);
      }
    });
  } else {
    // BarcodeDetector not available - keep trying
    animFrameId = requestAnimationFrame(scanQRFromVideo);
  }
}

// ==============================================
// 6. STUDENT - CHECK-IN
// ==============================================
async function processCheckIn(token) {
  setScanStatus("processing", "Sedang memproses check-in...");

  var payload = {
    user_id: USER_DATA.user_id,
    device_id: "kel-mobile",
    course_id: USER_DATA.course_id,
    session_id: USER_DATA.session_id,
    qr_token: token,
    ts: new Date().toISOString()
  };

  try {
    var res = await fetch(BASE_URL + "?path=presence/checkin", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    var json = await res.json();

    if (json.ok) {
      setScanStatus("success", "Berhasil Check-In!");
      stopCamera();
      checkMyStatus();

      // Update scan button
      var btnStart = document.getElementById("btn-start-scan");
      btnStart.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Scan Ulang';
    } else {
      setScanStatus("error", json.error || "Token Invalid");
      setTimeout(function () {
        setScanStatus("scanning", "Arahkan kamera ke QR Code...");
        scanningActive = true;
        scanQRFromVideo();
      }, 3000);
    }
  } catch (err) {
    setScanStatus("error", "Gangguan koneksi!");
    setTimeout(function () {
      setScanStatus("scanning", "Arahkan kamera ke QR Code...");
      scanningActive = true;
      scanQRFromVideo();
    }, 3000);
  }
}

// ==============================================
// 7. STUDENT - CHECK STATUS
// ==============================================
async function checkMyStatus() {
  var badge = document.getElementById("my-status");
  badge.className = "badge badge-loading";
  badge.innerText = "Loading...";

  try {
    var url = BASE_URL + "?path=presence/status&user_id=" + USER_DATA.user_id + "&course_id=" + USER_DATA.course_id + "&session_id=" + USER_DATA.session_id;
    var res = await fetch(url);
    var json = await res.json();

    if (json.ok && json.data) {
      var status = json.data.status;
      if (status === "checked_in") {
        badge.className = "badge badge-success";
        badge.innerText = "CHECKED IN";
      } else {
        badge.className = "badge badge-outline";
        badge.innerText = status.toUpperCase().replace("_", " ");
      }
    } else {
      badge.className = "badge badge-outline";
      badge.innerText = "NOT CHECKED IN";
    }
  } catch (err) {
    badge.className = "badge badge-outline";
    badge.innerText = "ERROR";
  }
}

// ==============================================
// 8. HELPERS
// ==============================================
function setScanStatus(type, message) {
  var statusEl = document.getElementById("scan-status");
  var textEl = document.getElementById("scan-status-text");

  statusEl.className = "scan-status";
  if (type === "processing") statusEl.classList.add("status-processing");
  else if (type === "success") statusEl.classList.add("status-success");
  else if (type === "error") statusEl.classList.add("status-error");

  // Build icon + text
  var iconHtml = "";
  if (type === "processing") {
    iconHtml = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  } else if (type === "success") {
    iconHtml = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  } else if (type === "error") {
    iconHtml = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
  }

  statusEl.innerHTML = iconHtml + '<span id="scan-status-text">' + message + '</span>';
}

// --- Init ---
document.addEventListener("DOMContentLoaded", function () {
  checkMyStatus();
});
