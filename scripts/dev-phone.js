const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

// ── Detect local IP ──────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const ip = getLocalIP();
const PORT = 3000;

// ── Kill any process on the target port ──────────────────────
function killOnPort(port) {
  try {
    const pid = execSync(`lsof -ti tcp:${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (pid) {
      console.log(`⚡ Killing process on port ${port} (PID: ${pid})…`);
      execSync(`kill -9 ${pid} 2>/dev/null`);
      console.log('✅ Done.\n');
    }
  } catch {
    // nothing on that port
  }
}

// ── Generate trusted certs via mkcert ────────────────────────
const certDir = path.join(__dirname, '..', 'certificates');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

fs.mkdirSync(certDir, { recursive: true });

let hasMkcert = false;
try {
  execSync('which mkcert', { stdio: 'ignore' });
  hasMkcert = true;
} catch {}

if (hasMkcert) {
  console.log('🔐 Generating trusted certificates via mkcert…');
  execSync(
    `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1 ${ip}`,
    { stdio: 'inherit' }
  );
  console.log('✅ Certificates generated.\n');
} else {
  console.log('🔐 Generating self-signed certificates via openssl…');
  try {
    execSync(
      `openssl req -x509 -nodes -days 365 -newkey rsa:2048 ` +
      `-keyout "${keyPath}" -out "${certPath}" ` +
      `-subj '/CN=localhost'`,
      { stdio: 'inherit' }
    );
    console.log('✅ Certificates generated.\n');
  } catch {
    console.log('⚠️ Could not generate certificates.');
    process.exit(1);
  }
}

// ── Check if CA is trusted on this Mac ───────────────────────
if (hasMkcert) {
  try {
    execSync(`security find-certificate -c "mkcert" 2>/dev/null | head -1`, { stdio: 'ignore' });
  } catch {
    console.log('⚠️  mkcert root CA is not installed on this Mac.');
    console.log('   Run:  mkcert -install\n');
  }
}

// ── Free the port and start Next.js ──────────────────────────
killOnPort(PORT);

const nextUrl = `https://${ip}:${PORT}`;

console.log(`📱 App will be available at:`);
console.log(`   https://localhost:${PORT}   (Mac browser)`);
console.log(`   ${nextUrl}                  (Phone browser)\n`);

if (hasMkcert) {
  const caPath = path.join(os.homedir(), 'Library', 'Application Support', 'mkcert', 'rootCA.pem');
  if (fs.existsSync(caPath)) {
    console.log(`📲 To make the cert trusted on your iPhone:`);
    console.log(`   1. Open this on your phone (iCloud Drive / AirDrop / email):`);
    console.log(`      ${caPath}`);
    console.log(`   2. Settings → Profile Downloaded → Install`);
    console.log(`   3. Settings → General → About → Certificate Trust Settings → enable\n`);
  }
}

const next = spawn(
  'npx',
  [
    'next', 'dev',
    '--experimental-https',
    '--experimental-https-key', keyPath,
    '--experimental-https-cert', certPath,
    '-H', '0.0.0.0',
    '-p', String(PORT),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXTAUTH_URL: nextUrl,
    },
  }
);

next.on('exit', (code) => {
  process.exit(code ?? 0);
});
