# Panduan Setup Google Apps Script & Google Spreadsheet — Absenin

Panduan lengkap dan cepat untuk menghubungkan aplikasi **Absenin** dengan Google Spreadsheet menggunakan Google Apps Script sebagai backend database.

> [!TIP]
> **Tersedia Fitur Otomatis `init`:** Anda tidak perlu membuat 7 sheet dan mengetik puluhan nama kolom secara manual satu per satu! Cukup jalankan fungsi `init()` di Google Apps Script editor, dan seluruh sheet, kolom header, serta data awal akan dibuat otomatis dalam hitungan detik.

---

## Langkah 1: Buat Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.new).
2. Beri judul spreadsheet: `Absenin — PIT VIII PAPDI Purwokerto 2026`.
3. Biarkan spreadsheet masih kosong.

---

## Langkah 2: Buka Apps Script & Paste Kode

1. Di spreadsheet, klik menu **Extensions** (Ekstensi) > **Apps Script**.
2. Beri nama project: `Absenin Backend API`.
3. Hapus seluruh kode default di file `Code.gs`.
4. Buka file [`docs/apps-script-code.js`](file:///e:/project/absenin/docs/apps-script-code.js) dari repository ini.
5. Salin (**Ctrl+A**, **Ctrl+C**) seluruh kodenya dan tempel (**Ctrl+V**) ke `Code.gs`.
6. Simpan project (**Ctrl+S**).

---

## Langkah 3: Jalankan Fungsi `init` (Otomatisasi 1-Klik)

1. Pada toolbar atas Apps Script editor, cari dropdown pilihan fungsi di samping tombol **Run / Jalankan** (biasanya tertulis `doGet` atau `handleRequest`).
2. Ubah pilihan dropdown ke fungsi: **`init`**.
3. Klik tombol **Run** (Jalankan).
4. Berikan izin otorisasi (*Review permissions* > pilih akun Google Anda > *Advanced* > *Go to Absenin Backend API (unsafe)* > *Allow*).
5. Script akan berjalan dan otomatis:
   - Membuat ke-7 sheet yang dibutuhkan: `EVENT`, `PESERTA`, `WORKSHOP`, `ABSENSI`, `ABSENSI_WORKSHOP`, `PANITIA`, `LOG`.
   - Mengatur header setiap sheet (bold, warna latar abu-abu terang, dan freeze baris pertama).
   - Mengisi data awal event `PIT VIII PAPDI Purwokerto 2026`, workshop W01–W03, dan akun panitia default (`admin` / `password123`).
   - Menghapus tab default `Sheet1` yang kosong.
6. Cek kembali tab Google Sheets Anda: seluruh 7 sheet kini sudah rapi dan siap pakai!

---

## Langkah 4: Deploy Sebagai Web App

1. Klik tombol **Deploy** (Terapkan) berwarna biru di kanan atas > **New deployment** (Penerapan baru).
2. Klik ikon gerigi ⚙️ di samping *Select type* > pilih **Web app**.
3. Atur konfigurasi berikut:
   - **Description**: `Absenin Production v1`
   - **Execute as** (Jalankan sebagai): **Me (email Anda)**
   - **Who has access** (Yang memiliki akses): **Anyone** (Siapa saja)
4. Klik **Deploy**.
5. Salin **Web App URL** yang dihasilkan (URL berakhiran `/exec`), contoh:
   ```text
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

> [!IMPORTANT]
> Setiap kali Anda melakukan perubahan kode di Apps Script, buat versi deploy baru melalui **Deploy > Manage deployments > Edit > Version: New version > Deploy**.

---

## Langkah 5: Masukkan URL ke Environment Variable

### Development Lokal:
Buka file `.env` di root project:
```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
JWT_SECRET=absenin-secret-pit-viii-papdi-2026-secure-key
PORT=3000
```

### Production Vercel:
Pada dashboard Vercel project Anda:
Masuk ke menu **Settings** > **Environment Variables**, tambahkan:
- `APPS_SCRIPT_URL`: URL Web App Apps Script Anda
- `JWT_SECRET`: Kunci rahasia JWT Anda

---

## Langkah 6: Verifikasi & Test

1. Uji endpoint di browser:
   ```text
   https://script.google.com/macros/s/AKfycb.../exec?action=getEvent
   ```
   Browser akan menampilkan response JSON:
   ```json
   {"success": true, "data": {"EVENT_ID": "EVT001", "EVENT_NAME": "PIT VIII PAPDI Purwokerto 2026", ...}}
   ```
2. Jalankan aplikasi lokal:
   ```bash
   npm start
   ```
3. Login di `http://localhost:3000` dengan akun bawaan sheet `PANITIA`:
   - **Username:** `admin`
   - **Password:** `password123`

---

## Referensi Struktur Sheet yang Dihasilkan `init`

Untuk referensi, berikut 7 sheet dan kolom header yang dibuat oleh fungsi `init`:

| Sheet | Kolom Header | Keterangan |
| :--- | :--- | :--- |
| **`EVENT`** | `EVENT_ID`, `EVENT_NAME`, `START_DATE`, `END_DATE`, `LOCATION`, `STATUS` | Konfigurasi event aktif |
| **`PESERTA`** | `ID`, `NO`, `NAME`, `PHONE`, `INSTITUTION`, `EMAIL`, `PRODUCT`, `SYMPO`, `WORKSHOP_A`, `WORKSHOP_B`, `WORKSHOP_C`, `SOURCE`, `CREATED_AT`, `UPDATED_AT` | Database peserta |
| **`WORKSHOP`** | `CODE`, `NAME`, `DATE`, `TIME`, `ROOM`, `QUOTA`, `STATUS` | Daftar workshop yang tersedia |
| **`ABSENSI`** | `ATTENDANCE_ID`, `EVENT_ID`, `PARTICIPANT_ID`, `DATE`, `TIME`, `USER_ID`, `STATUS` | Rekam check-in simposium harian |
| **`ABSENSI_WORKSHOP`** | `ID`, `EVENT_ID`, `PARTICIPANT_ID`, `WORKSHOP_CODE`, `DATE`, `TIME`, `USER_ID` | Rekam kehadiran sesi workshop |
| **`PANITIA`** | `USER_ID`, `NAME`, `USERNAME`, `PASSWORD`, `STATUS` | Akun panitia penyelenggara |
| **`LOG`** | `LOG_ID`, `TIMESTAMP`, `USER_ID`, `ACTION`, `PARTICIPANT_ID`, `DESCRIPTION` | Audit log aktivitas operasional |
