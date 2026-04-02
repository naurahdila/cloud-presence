/* ==========================================
   CloudPresence - Vanilla JS (app.js)
   ========================================== */

// --- CONFIG ---
const BASE_URL = "https://script.google.com/macros/s/AKfycbzBM2tZu5jvx-ie2OiIvCCvGpiycos9npwRZ117Guy8mKn4n4QUhF88_7QNHbANF1_u/exec?path=generate";

const QR_DURATION_SECONDS = 120; // 1 menit

// --- STATE ---
let currentToken = null;
let countdownInterval = null;
let countdownTimeLeft = 0;
let countdownTotal = 0;
let cameraStream = null;
let scanningActive = false;
let animFrameId = null;

// Mahasiswa — NIM, Nama, course_id, session_id diinput di form profil
let USER_DATA = {
  user_id: "",              // NIM
  device_id: "",            // Nama mahasiswa
  course_id: "",            // diisi dari form profil
  session_id: ""            // diisi dari form profil
};

// Dosen — course & session diinput manual
let ADMIN_DATA = {
  course_id: "",
  session_id: ""
};

// ==============================================
// 1. TAB SWITCHING
// ==============================================
function switchTab(tab) {
  const adminPanel = document.getElementById("panel-admin");
  const mhsPanel   = document.getElementById("panel-mahasiswa");
  const btnAdmin   = document.getElementById("tab-admin");
  const btnMhs     = document.getElementById("tab-mhs");

  if (tab === "admin") {
    adminPanel.style.display = "block";
    mhsPanel.style.display   = "none";
    btnAdmin.classList.add("active");
    btnMhs.classList.remove("active");
    stopCamera();
  } else {
    adminPanel.style.display = "none";
    mhsPanel.style.display   = "block";
    btnAdmin.classList.remove("active");
    btnMhs.classList.add("active");
  }
}

// ==============================================
// 2. MAHASISWA — SIMPAN PROFIL (NIM + NAMA + COURSE + SESSION)
// ==============================================
function saveStudentProfile() {
  const nim      = document.getElementById("input-nim").value.trim();
  const nama     = document.getElementById("input-nama").value.trim();
  const courseId = document.getElementById("input-course-mhs").value.trim();
  const sessionId = document.getElementById("input-session-mhs").value.trim();

  if (!nim || !nama || !courseId || !sessionId) {
    showProfileError("Semua field wajib diisi!");
    return;
  }

  USER_DATA.user_id   = nim;
  USER_DATA.device_id = nama;
  USER_DATA.course_id  = courseId;
  USER_DATA.session_id = sessionId;

  document.getElementById("profile-form-mhs").style.display = "none";
  document.getElementById("scanner-section").style.display  = "block";
  document.getElementById("status-section").style.display   = "block";

  document.getElementById("mhs-identity").style.display     = "flex";
  document.getElementById("mhs-nim-display").innerText      = nim;
  document.getElementById("mhs-nama-display").innerText     = nama;

  document.getElementById("status-course-val").innerText  = courseId;
  document.getElementById("status-session-val").innerText = sessionId;

  resetStatusBadge();
}

function showProfileError(msg) {
  const el = document.getElementById("profile-error-mhs");
  el.innerText     = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

function resetStudentProfile() {
  USER_DATA.user_id   = "";
  USER_DATA.device_id = "";
  USER_DATA.course_id  = "";
  USER_DATA.session_id = "";

  document.getElementById("profile-form-mhs").style.display = "block";
  document.getElementById("scanner-section").style.display  = "none";
  document.getElementById("status-section").style.display   = "none";
  document.getElementById("mhs-identity").style.display     = "none";
  document.getElementById("input-nim").value                = "";
  document.getElementById("input-nama").value               = "";
  document.getElementById("input-course-mhs").value         = "";
  document.getElementById("input-session-mhs").value        = "";

  resetStatusBadge();
  stopCamera();
}

function resetStatusBadge() {
  const badge = document.getElementById("my-status");
  badge.className = "badge badge-outline";
  badge.innerText = "BELUM CHECK-IN";
  document.getElementById("status-course-val").innerText  = "-";
  document.getElementById("status-session-val").innerText = "-";
}

// ==============================================
// 3. DOSEN — GENERATE QR (course & session dari input)
// ==============================================
async function generateQR() {
  const courseId  = document.getElementById("input-course-admin").value.trim();
  const sessionId = document.getElementById("input-session-admin").value.trim();

  if (!courseId || !sessionId) {
    showAdminFormError("Course ID dan Session ID wajib diisi!");
    return;
  }

  ADMIN_DATA.course_id  = courseId;
  ADMIN_DATA.session_id = sessionId;

  const btn         = document.getElementById("btn-generate");
  const qrResult    = document.getElementById("qr-result");
  const errorBanner = document.getElementById("generate-error");

  btn.disabled  = true;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...';
  errorBanner.style.display = "none";

  const payload = {
    course_id:  courseId,
    session_id: sessionId,
    ts:         new Date().toISOString()
  };

  try {
    const res  = await fetch(BASE_URL + "?path=presence/qr/generate", {
      method: "POST",
      body:   JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.ok && json.data) {
      currentToken = json.data.qr_token;

      document.getElementById("admin-course-display").innerText  = courseId;
      document.getElementById("admin-session-display").innerText = sessionId;

      qrResult.style.display = "block";
      document.getElementById("qr-token-text").innerText      = currentToken;
      document.getElementById("btn-regenerate").style.display = "none";

      document.getElementById("qrcode").innerHTML = "";
      new QRCode(document.getElementById("qrcode"), {
        text:         currentToken,
        width:        200,
        height:       200,
        colorDark:    "#1a1a2e",
        colorLight:   "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      startCountdown(QR_DURATION_SECONDS);

      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> Generate Ulang';
    } else {
      showGenerateError(json.message || "Gagal generate token");
    }
  } catch (err) {
    console.error("generateQR error:", err);
    showGenerateError("Gagal koneksi ke server!");
  } finally {
    btn.disabled = false;
  }
}

function showAdminFormError(msg) {
  const el = document.getElementById("admin-form-error");
  el.innerText     = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

function showGenerateError(msg) {
  const errorBanner = document.getElementById("generate-error");
  document.getElementById("generate-error-text").innerText = msg;
  errorBanner.style.display = "flex";
}

// ==============================================
// 4. COUNTDOWN TIMER
// ==============================================
function startCountdown(duration) {
  clearInterval(countdownInterval);
  countdownTotal    = duration;
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
  const timerText    = document.getElementById("timer-text");
  const timerIcon    = document.getElementById("timer-icon");
  const timerLabel   = document.getElementById("timer-label");
  const progressFill = document.getElementById("progress-fill");
  const qrFrame      = document.getElementById("qr-frame");

  const minutes   = Math.floor(countdownTimeLeft / 60);
  const seconds   = countdownTimeLeft % 60;
  timerText.innerText = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");

  const progress = countdownTotal > 0 ? (countdownTimeLeft / countdownTotal) * 100 : 0;
  progressFill.style.width = progress + "%";

  const isExpired = countdownTimeLeft === 0 && countdownTotal > 0;
  const isWarning = countdownTimeLeft > 0 && countdownTimeLeft <= 20;

  timerText.classList.remove("warning", "expired");
  timerIcon.classList.remove("icon-admin");
  timerIcon.style.color = "";

  if (isExpired) {
    timerText.classList.add("expired");
    timerIcon.style.color = "var(--danger)";
  } else if (isWarning) {
    timerText.classList.add("warning");
    timerIcon.style.color = "var(--warning)";
  } else {
    timerIcon.classList.add("icon-admin");
  }

  progressFill.classList.remove("warning", "expired");
  if (isExpired)      progressFill.classList.add("expired");
  else if (isWarning) progressFill.classList.add("warning");

  qrFrame.classList.toggle("expired", isExpired);

  if (isExpired)      timerLabel.innerText = "Token kedaluwarsa. Silakan generate ulang.";
  else if (isWarning) timerLabel.innerText = "Token akan segera kedaluwarsa!";
  else                timerLabel.innerText = "Sisa waktu token berlaku";
}

function onTimerExpired() {
  document.getElementById("btn-regenerate").style.display = "flex";
}

// ==============================================
// 5. COPY TOKEN
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
  }).catch(function () {});
}

// ==============================================
// 6. MAHASISWA — KAMERA & SCAN QR
// ==============================================
function startCamera() {
  var placeholder = document.getElementById("scanner-placeholder");
  var live        = document.getElementById("scanner-live");
  var btnStart    = document.getElementById("btn-start-scan");
  var btnStop     = document.getElementById("btn-stop-scan");

  placeholder.style.display = "none";
  live.style.display        = "block";
  btnStart.style.display    = "none";
  btnStop.style.display     = "flex";

  setScanStatus("scanning", "Arahkan kamera ke QR Code...");

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(function (stream) {
      cameraStream = stream;
      var video = document.getElementById("scanner-video");
      video.srcObject = stream;
      video.play();
      scanningActive = true;
      video.onloadedmetadata = function () { scanQRFromVideo(); };
    })
    .catch(function () {
      setScanStatus("error", "Tidak dapat mengakses kamera");
      placeholder.style.display = "flex";
      placeholder.querySelector("p").innerText = "Akses kamera ditolak. Periksa izin browser.";
      live.style.display     = "none";
      btnStart.style.display = "flex";
      btnStop.style.display  = "none";
    });
}

function stopCamera() {
  scanningActive = false;
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (t) { t.stop(); });
    cameraStream = null;
  }

  var placeholder = document.getElementById("scanner-placeholder");
  var live        = document.getElementById("scanner-live");
  var btnStart    = document.getElementById("btn-start-scan");
  var btnStop     = document.getElementById("btn-stop-scan");

  if (placeholder) placeholder.style.display = "flex";
  if (live)        live.style.display        = "none";
  if (btnStart)    btnStart.style.display    = "flex";
  if (btnStop)     btnStop.style.display     = "none";

  var pt = placeholder ? placeholder.querySelector("p") : null;
  if (pt) pt.innerText = "Tekan tombol di bawah untuk mulai scan";

  setScanStatus("idle", "Siap memindai QR Code");
}

function scanQRFromVideo() {
  if (!scanningActive) return;

  var video = document.getElementById("scanner-video");
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    animFrameId = requestAnimationFrame(scanQRFromVideo);
    return;
  }

  var canvas = document.createElement("canvas");
  var ctx    = canvas.getContext("2d");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var code      = jsQR(imageData.data, canvas.width, canvas.height);

  if (code && scanningActive) {
    scanningActive = false;
    processCheckIn(code.data);
    return;
  }

  animFrameId = requestAnimationFrame(scanQRFromVideo);
}

// ==============================================
// 7. MAHASISWA — PROSES CHECK-IN
// Kirim: user_id, device_id, course_id, session_id, qr_token, ts
// ==============================================
async function processCheckIn(qrToken) {
  setScanStatus("processing", "Memproses check-in...");

  try {
    const payload = {
      user_id:    USER_DATA.user_id,
      device_id:  USER_DATA.device_id,
      course_id:  USER_DATA.course_id,
      session_id: USER_DATA.session_id,
      qr_token:   qrToken,
      ts:         new Date().toISOString()
    };

    const res  = await fetch(BASE_URL + "?path=presence/checkin", {
      method: "POST",
      body:   JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.ok) {
      setScanStatus("success", "Check-in berhasil! ✓");
      updateStatusBadge("checked_in");
    } else {
      const errMsg = json.message || "Check-in gagal!";
      setScanStatus("error", errMsg);
    }
  } catch (err) {
    console.error("checkIn error:", err);
    setScanStatus("error", "Gagal koneksi ke server!");
  } finally {
    // Restart scan setelah 2 detik (untuk retry jika gagal)
    setTimeout(() => {
      var live = document.getElementById("scanner-live");
      if (!live || live.style.display === "none") return;
      scanningActive = true;
      scanQRFromVideo();
    }, 2000);
  }
}

// ==============================================
// 8. MAHASISWA — REFRESH STATUS
// ==============================================
async function checkMyStatus() {
  if (!USER_DATA.user_id || !USER_DATA.course_id || !USER_DATA.session_id) {
    resetStatusBadge();
    return;
  }

  var badge = document.getElementById("my-status");
  badge.className = "badge badge-loading";
  badge.innerText = "Loading...";

  try {
    var url = BASE_URL
      + "?path=presence/status"
      + "&user_id="    + encodeURIComponent(USER_DATA.user_id)
      + "&course_id="  + encodeURIComponent(USER_DATA.course_id)
      + "&session_id=" + encodeURIComponent(USER_DATA.session_id);

    var res  = await fetch(url);
    var json = await res.json();

    if (json.ok && json.data) {
      updateStatusBadge(json.data.status);
      document.getElementById("status-course-val").innerText  = json.data.course_id  || "-";
      document.getElementById("status-session-val").innerText = json.data.session_id || "-";
    } else {
      updateStatusBadge("not_checked_in");
    }
  } catch (err) {
    badge.className = "badge badge-outline";
    badge.innerText = "ERROR";
  }
}

function updateStatusBadge(status) {
  var badge = document.getElementById("my-status");
  if (status === "checked_in") {
    badge.className = "badge badge-success";
    badge.innerText = "CHECKED IN ✓";
  } else {
    badge.className = "badge badge-outline";
    badge.innerText = "BELUM CHECK-IN";
  }
}

// ==============================================
// 9. HELPERS
// ==============================================
function setScanStatus(type, message) {
  var statusEl = document.getElementById("scan-status");
  statusEl.className = "scan-status";

  if (type === "processing") statusEl.classList.add("status-processing");
  else if (type === "success") statusEl.classList.add("status-success");
  else if (type === "error")   statusEl.classList.add("status-error");

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

function startAccelerometer(){
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
    .then(permission => {
      if(permission === "granted"){
        listenAccelerometer();
      }else{
        console.log("permission denied");
      }
    });
  }else{
    listenAccelerometer();
  }
}

function listenAccelerometer(){
  window.addEventListener("devicemotion", function(event){
    let x = event.accelerationIncludingGravity.x || 0;
    let y = event.accelerationIncludingGravity.y || 0;
    let z = event.accelerationIncludingGravity.z || 0;

    accelSamples.push({
      t: new Date().toISOString(),
      x: x,
      y: y,
      z: z
    });
  });
}

// kirim data tiap 3 detik
setInterval(sendAccelBatch, 3000);

let accelSamples = [];
function sendAccelBatch(){
  if(accelSamples.length === 0) return;

  let payload = {
    device_id: USER_DATA.device_id || "unknown",
    ts: new Date().toISOString(),
    samples: accelSamples
  };

  fetch(TELEMETRY_URL + "?path=telemetry/accel",{
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    console.log("telemetry sent", data);
  });

  accelSamples = [];
}

// --- Init ---
document.addEventListener("DOMContentLoaded", function () {
  // Tidak ada init khusus
});