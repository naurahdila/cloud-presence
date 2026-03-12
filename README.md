**QR Code Attendance System**

## OVERVIEW

QR Code Attendance System adalah aplikasi presensi berbasis web yang dibuat sebagai tugas praktikum mata kuliah *Cloud Computing* sebelum Ujian Tengah Semester pada Semester 6 Program Studi *D4 Teknik Informatika*.

Aplikasi ini memungkinkan mahasiswa melakukan presensi dengan cara memindai QR Code menggunakan perangkat mereka. Data presensi yang dipindai akan dikirim ke backend untuk proses validasi dan penyimpanan ke database.

Selain presensi, sistem ini juga mendukung pengiriman data sensor perangkat seperti *accelerometer* dan *GPS* untuk monitoring perangkat secara real-time.

## SYSTEM ARCHITECTURE

Struktur arsitektur sistem adalah sebagai berikut:


User Device (Browser / Mobile)
        │
        ▼
Frontend (GitHub Pages)
        │
        ▼
HTTP Request
        │
        ▼
Backend API (Google Apps Script)
        │
        ▼
Database (Google Spreadsheet)

## TECHNOLOGY STACK

| Technology | Function |
|-----------|----------|
| Google Apps Script | Backend API |
| GitHub Pages | Frontend hosting |
| Google Spreadsheet | Database |
| Postman | API testing |
| Swagger | API documentation |


## FEATURES
### Attendance
- QR Code based attendance
- QR token validation
- Attendance data storage
- Attendance status checking

### Device Telemetry
- Accelerometer data collection
- GPS location tracking
- Device monitoring
- Sensor data history
