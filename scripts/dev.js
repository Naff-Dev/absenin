/**
 * Absenin — Interactive Dev Server Runner
 *
 * Fitur:
 * - Menjalankan Express dev server di port 3000 (bind 0.0.0.0)
 * - Pilihan Mode Interaktif Terminal:
 *   [1] Localhost: http://localhost:3000
 *   [2] Jaringan Lokal (Wi-Fi): Tampilkan QR Code & IP Lokal untuk scan di HP
 *   [3] Cloudflare Tunnel: Tampilkan QR Code & URL HTTPS Publik (Akses HP dari mana saja)
 *   [c] Clear terminal
 *   [q] Keluar
 */

require('dotenv').config();
const os = require('os');
const readline = require('readline');
const qrcode = require('qrcode-terminal');
const { startTunnel } = require('untun');
const app = require('../server/server');

const PORT = parseInt(process.env.PORT, 10) || 3000;

// ANSI Colors & Formatting
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m'
};

/**
 * Deteksi alamat IP jaringan lokal (Wi-Fi / Ethernet)
 */
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({ name, address: iface.address });
      }
    }
  }

  // Prioritaskan Wi-Fi atau Ethernet
  const preferred = candidates.find(c => /wi-?fi|wlan|ethernet/i.test(c.name));
  if (preferred) return preferred.address;
  if (candidates.length > 0) return candidates[0].address;
  return 'localhost';
}

const localIp = getLocalNetworkIp();
const localhostUrl = `http://localhost:${PORT}`;
const lanUrl = `http://${localIp}:${PORT}`;

let serverInstance = null;
let activeTunnel = null;
let isStartingTunnel = false;
let currentMode = null; // '1' | '2' | '3' | null

/**
 * Bersihkan layar terminal
 */
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

/**
 * Tampilkan Banner Utama & Menu Navigasi
 */
function printBanner() {
  console.log(`\n${C.cyan}${C.bold}╔═══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}${C.bold}║                  ✨ ABSENIN DEV SERVER — HP & TERMINAL                    ║${C.reset}`);
  console.log(`${C.cyan}${C.bold}╚═══════════════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`${C.green}● Status Server : AKTIF di port ${PORT}${C.reset}`);
  console.log(`${C.dim}  • Localhost   : ${localhostUrl}${C.reset}`);
  console.log(`${C.dim}  • Jaringan IP : ${lanUrl}${C.reset}`);
  if (activeTunnel && activeTunnel.url) {
    console.log(`${C.dim}  • Cloudflare  : ${activeTunnel.url}${C.reset}`);
  }
  console.log(`\n${C.yellow}${C.bold}PILIHAN AKSES DI TERMINAL:${C.reset}`);
  console.log(`  ${C.bold}[1]${C.reset} 💻 ${C.bold}Localhost${C.reset}        -> Hanya untuk browser laptop/PC ini`);
  console.log(`  ${C.bold}[2]${C.reset} 📶 ${C.bold}Jaringan Lokal${C.reset}   -> ${C.green}Sharing Wi-Fi + QR Code untuk HP (Satu Wi-Fi)${C.reset}`);
  console.log(`  ${C.bold}[3]${C.reset} 🌐 ${C.bold}Cloudflare${C.reset}       -> ${C.cyan}Cloudflare Tunnel + QR Code untuk HP (Internet Luar)${C.reset}`);
  console.log(`  ${C.dim}[c] Bersihkan Layar  |  [q] Keluar / Tutup Server${C.reset}`);
  console.log(`${C.dim}───────────────────────────────────────────────────────────────────────────${C.reset}`);
  printPrompt();
}

function printPrompt() {
  process.stdout.write(`\n${C.yellow}👉 Ketik angka [1, 2, atau 3]: ${C.reset}`);
}

/**
 * Mode 1: Localhost
 */
function showMode1() {
  currentMode = '1';
  clearScreen();
  console.log(`\n${C.blue}${C.bold}╔═══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.blue}${C.bold}║               💻 [MODE 1] LOCALHOST (KOMPUTER INI SAJA)                   ║${C.reset}`);
  console.log(`${C.blue}${C.bold}╚═══════════════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`\n  ${C.bold}URL Browser :${C.reset} ${C.cyan}${localhostUrl}${C.reset}`);
  console.log(`  ${C.dim}Catatan     : Mode ini hanya bisa diakses langsung dari browser di PC ini.${C.reset}`);
  console.log(`\n${C.yellow}Navigasi:${C.reset}`);
  console.log(`  Ketik ${C.bold}[2]${C.reset} untuk Sharing Jaringan Lokal (QR HP Wi-Fi)`);
  console.log(`  Ketik ${C.bold}[3]${C.reset} untuk Cloudflare Tunnel (QR HP Internet Luar)`);
  console.log(`  Ketik ${C.bold}[q]${C.reset} untuk Keluar`);
  printPrompt();
}

/**
 * Mode 2: Jaringan Lokal (Wi-Fi) + QR Code
 */
function showMode2() {
  currentMode = '2';
  clearScreen();
  console.log(`\n${C.green}${C.bold}╔═══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.green}${C.bold}║             📶 [MODE 2] SHARING JARINGAN LOKAL (WI-FI / LAN)              ║${C.reset}`);
  console.log(`${C.green}${C.bold}╚═══════════════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`\n  ${C.bold}URL HP / Wi-Fi :${C.reset} ${C.green}${C.bold}${lanUrl}${C.reset}`);
  console.log(`  ${C.bold}Petunjuk HP    :${C.reset} Pastikan HP Anda terhubung ke ${C.bold}Wi-Fi yang sama${C.reset} dengan PC ini.`);
  console.log(`                   Lalu scan QR Code di bawah menggunakan kamera HP / Google Lens.`);
  console.log(`\n${C.dim}───────────────── QR CODE TERMINAL (JARINGAN LOKAL) ─────────────────${C.reset}\n`);

  try {
    qrcode.generate(lanUrl, { small: true }, (qr) => {
      console.log(qr);
    });
  } catch (err) {
    console.error('Gagal membuat QR Code:', err.message);
  }

  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`  Ketik ${C.bold}[1]${C.reset} Localhost  |  ${C.bold}[2]${C.reset} Refresh QR  |  ${C.bold}[3]${C.reset} Cloudflare  |  ${C.bold}[q]${C.reset} Keluar`);
  printPrompt();
}

/**
 * Mode 3: Cloudflare Quick Tunnel + QR Code
 */
async function showMode3() {
  currentMode = '3';
  clearScreen();
  console.log(`\n${C.magenta}${C.bold}╔═══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.magenta}${C.bold}║            🌐 [MODE 3] SHARING CLOUDFLARE TUNNEL (INTERNET PUBLIK)        ║${C.reset}`);
  console.log(`${C.magenta}${C.bold}╚═══════════════════════════════════════════════════════════════════════════╝${C.reset}`);

  // Jika tunnel sudah ada, langsung tampilkan
  if (activeTunnel && activeTunnel.url) {
    renderTunnelQr(activeTunnel.url);
    return;
  }

  if (isStartingTunnel) {
    console.log(`\n  ${C.yellow}⏳ Sedang memproses koneksi Cloudflare Tunnel... Silakan tunggu.${C.reset}`);
    printPrompt();
    return;
  }

  isStartingTunnel = true;
  console.log(`\n  ${C.yellow}⏳ Menghubungkan Cloudflare Quick Tunnel ke http://localhost:${PORT}...${C.reset}`);
  console.log(`  ${C.dim}(Sedang membuat link HTTPS publik gratis via trycloudflare.com)${C.reset}\n`);

  try {
    process.env.UNTUN_ACCEPT_CLOUDFLARE_NOTICE = 'true';
    const tunnel = await startTunnel({
      port: PORT,
      acceptCloudflareNotice: true
    });
    const tunnelUrl = await tunnel.getURL();
    activeTunnel = { tunnel, url: tunnelUrl };
    isStartingTunnel = false;

    clearScreen();
    console.log(`\n${C.magenta}${C.bold}╔═══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.magenta}${C.bold}║            🌐 [MODE 3] SHARING CLOUDFLARE TUNNEL (INTERNET PUBLIK)        ║${C.reset}`);
    console.log(`${C.magenta}${C.bold}╚═══════════════════════════════════════════════════════════════════════════╝${C.reset}`);
    renderTunnelQr(tunnelUrl);
  } catch (err) {
    isStartingTunnel = false;
    console.error(`\n  ${C.red}${C.bold}❌ Gagal memulai Cloudflare Tunnel:${C.reset} ${err.message}`);
    console.log(`  ${C.dim}Pastikan PC Anda terhubung ke internet. Anda tetap bisa menggunakan [2] Jaringan Lokal.${C.reset}`);
    console.log(`\n  Ketik ${C.bold}[1]${C.reset} Localhost  |  ${C.bold}[2]${C.reset} Jaringan Lokal  |  ${C.bold}[3]${C.reset} Coba Lagi  |  ${C.bold}[q]${C.reset} Keluar`);
    printPrompt();
  }
}

function renderTunnelQr(url) {
  console.log(`\n  ${C.bold}URL Cloudflare :${C.reset} ${C.magenta}${C.bold}${url}${C.reset}`);
  console.log(`  ${C.bold}Petunjuk HP    :${C.reset} ${C.green}BEBAS JARINGAN!${C.reset} HP bisa membuka link ini dari mana saja`);
  console.log(`                   (bisa via Paket Data 4G/5G, Wi-Fi rumah, atau di luar kantor).`);
  console.log(`                   Scan QR Code di bawah menggunakan kamera HP / Google Lens.`);
  console.log(`\n${C.dim}──────────────── QR CODE TERMINAL (CLOUDFLARE TUNNEL) ───────────────${C.reset}\n`);

  try {
    qrcode.generate(url, { small: true }, (qr) => {
      console.log(qr);
    });
  } catch (err) {
    console.error('Gagal membuat QR Code:', err.message);
  }

  console.log(`${C.dim}─────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`  Ketik ${C.bold}[1]${C.reset} Localhost  |  ${C.bold}[2]${C.reset} Jaringan Lokal  |  ${C.bold}[3]${C.reset} Refresh QR  |  ${C.bold}[q]${C.reset} Keluar`);
  printPrompt();
}

/**
 * Handle input dari user
 */
function handleInput(input) {
  const choice = (input || '').toString().trim().toLowerCase();

  switch (choice) {
    case '1':
      showMode1();
      break;
    case '2':
      showMode2();
      break;
    case '3':
      showMode3();
      break;
    case 'c':
    case 'cls':
    case 'clear':
      if (currentMode === '1') showMode1();
      else if (currentMode === '2') showMode2();
      else if (currentMode === '3' && activeTunnel) renderTunnelQr(activeTunnel.url);
      else {
        clearScreen();
        printBanner();
      }
      break;
    case 'h':
    case 'help':
    case 'menu':
      clearScreen();
      printBanner();
      break;
    case 'q':
    case 'exit':
    case 'quit':
      shutdown(0);
      break;
    default:
      if (choice) {
        process.stdout.write(`\n${C.red}Pilihan "${choice}" tidak dikenal. Ketik [1], [2], atau [3]: ${C.reset}`);
      }
      break;
  }
}

/**
 * Shutdown dengan aman
 */
async function shutdown(code = 0) {
  console.log(`\n\n${C.yellow}Menghentikan dev server...${C.reset}`);

  if (activeTunnel && activeTunnel.tunnel && typeof activeTunnel.tunnel.close === 'function') {
    try {
      console.log(`${C.dim}Menutup Cloudflare Tunnel...${C.reset}`);
      await activeTunnel.tunnel.close();
    } catch (_) {}
  }

  if (serverInstance) {
    serverInstance.close(() => {
      console.log(`${C.green}Dev server berhenti dengan aman. Sampai jumpa!${C.reset}\n`);
      process.exit(code);
    });
    // Force timeout 3 detik
    setTimeout(() => process.exit(code), 3000).unref();
  } else {
    process.exit(code);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

/**
 * Start Server & Pasang Input Listeners
 */
function start() {
  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    // Cek argumen CLI (misal: node scripts/dev.js 2 atau --lan / --tunnel)
    const cliArg = process.argv[2];

    if (cliArg === '2' || cliArg === '--lan' || cliArg === '-l') {
      showMode2();
    } else if (cliArg === '3' || cliArg === '--tunnel' || cliArg === '-t') {
      showMode3();
    } else if (cliArg === '1' || cliArg === '--local') {
      showMode1();
    } else {
      clearScreen();
      printBanner();
    }

    // Pasang readline interface untuk membaca input baris (ketik 2 lalu Enter)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      handleInput(line);
    });

    // Jika di terminal TTY interaktif, aktifkan juga single keypress (langsung tekan 2 tanpa Enter)
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
      try {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
          if (key && key.ctrl && key.name === 'c') {
            shutdown(0);
            return;
          }
          if (str && ['1', '2', '3', 'c', 'q', 'h'].includes(str.toLowerCase())) {
            handleInput(str);
          }
        });
      } catch (_) {
        // Fallback tetap jalan lewat rl.on('line')
      }
    }
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n${C.red}${C.bold}Error: Port ${PORT} sudah digunakan oleh proses lain.${C.reset}`);
      console.error(`Matikan proses yang sedang memakai port ${PORT} atau atur PORT lain di .env`);
    } else {
      console.error(`\n${C.red}Server error: ${err.message}${C.reset}`);
    }
    process.exit(1);
  });
}

start();
