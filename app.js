const BASE_URL = "https://script.google.com/macros/s/AKfycbx7pqM5-XCphcHR9AaU4ha0VmHad0WINOu88T9MljZDWTmiwQw-a2dN0yaWrXpAMFVe/exec";


const USER_DATA = {
    user_id: "434231000", 
    course_id: "cloud-101",
    session_id: "sesi-02"
};

// --- 1. LOGIKA GENERATE QR (ADMIN) ---
async function generateQR() {
    const btn = document.querySelector('.btn-white');
    const qrResult = document.getElementById('qr-result');
    
    btn.innerText = "Generating...";
    btn.disabled = true;

    const payload = {
        course_id: USER_DATA.course_id,
        session_id: USER_DATA.session_id,
        ts: new Date().toISOString() 
    };

    try {
        const res = await fetch(`${BASE_URL}?path=presence/qr/generate`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if(json.ok) {

            qrResult.style.display = 'flex';
            document.getElementById('qr-token-text').innerText = json.data.qr_token;
            
            // Bersihkan dan render QR Code baru
            document.getElementById('qrcode').innerHTML = "";
            new QRCode(document.getElementById("qrcode"), {
                text: json.data.qr_token,
                width: 180,
                height: 180,
                colorDark : "#1e293b",
                colorLight : "#ffffff"
            });
        }
    } catch (err) {
        alert("Gagal koneksi ke server!");
    } finally {
        btn.innerText = "Generate Token";
        btn.disabled = false;
    }
}

// --- 2. LOGIKA SCAN QR (MAHASISWA) ---
const scanner = new Html5Qrcode("reader");
const scanStatus = document.getElementById('scan-status');

scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, async (token) => {
    scanner.pause();
    scanStatus.innerText = "⏳ Sedang memproses check-in...";
    scanStatus.style.color = "#6366f1";
    
    const payload = {
        user_id: USER_DATA.user_id,
        device_id: "kel-mobile",
        course_id: USER_DATA.course_id,
        session_id: USER_DATA.session_id,
        qr_token: token,
        ts: new Date().toISOString()
    };

    try {
        const res = await fetch(`${BASE_URL}?path=presence/checkin`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if(json.ok) {
            scanStatus.innerText = "✅ BERHASIL CHECK-IN!";
            scanStatus.style.color = "#22c55e";
            checkMyStatus(); // Langsung perbarui badge status
        } else {
            scanStatus.innerText = "❌ GAGAL: " + (json.error || "Token Invalid");
            scanStatus.style.color = "#ef4444";
            setTimeout(() => {
                scanStatus.innerText = "Siap memindai...";
                scanStatus.style.color = "";
                scanner.resume();
            }, 3000);
        }
    } catch (err) {
        scanStatus.innerText = "❌ Gangguan koneksi!";
        setTimeout(() => scanner.resume(), 3000);
    }
});

// --- 3. LOGIKA CEK STATUS ---
async function checkMyStatus() {
    const badge = document.getElementById('my-status');
    badge.innerText = "Loading...";
    
    try {
        const url = `${BASE_URL}?path=presence/status&user_id=${USER_DATA.user_id}&course_id=${USER_DATA.course_id}&session_id=${USER_DATA.session_id}`;
        const res = await fetch(url);
        const json = await res.json();
        
        if(json.ok) {
            badge.innerText = json.data.status.toUpperCase().replace('_', ' ');
            if(json.data.status === 'checked_in') {
                badge.style.background = "#dcfce7";
                badge.style.color = "#15803d";
            }
        }
    } catch (err) {
        badge.innerText = "ERROR";
    }
}

// --- 4. HELPER UI (SWITCH TAB) ---
function switchTab(tab) {
    const adminPanel = document.getElementById('panel-admin');
    const mhsPanel = document.getElementById('panel-mahasiswa');
    const btnAdmin = document.getElementById('tab-admin');
    const btnMhs = document.getElementById('tab-mhs');

    if (tab === 'admin') {
        adminPanel.style.display = 'block';
        mhsPanel.style.display = 'none';
        btnAdmin.classList.add('active');
        btnMhs.classList.remove('active');
        // Berhenti scanner jika pindah ke tab admin untuk hemat baterai/CPU
        if(scanner.isScanning) scanner.pause();
    } else {
        adminPanel.style.display = 'none';
        mhsPanel.style.display = 'block';
        btnAdmin.classList.remove('active');
        btnMhs.classList.add('active');
        if(scanner.getState() === 3) scanner.resume(); // Resume jika status paused
    }
}