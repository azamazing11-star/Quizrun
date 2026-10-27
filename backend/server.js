process.on('uncaughtException', (err) => {
  console.error('[Network Security Guard] Uncaught exception prevented:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Network Security Guard] Unhandled rejection prevented:', reason?.message || reason);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
let compression;
try {
  compression = require('compression');
} catch (e) {}

const app = express();
if (compression) {
  app.use(compression());
}
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const localtunnel = require('localtunnel');

// Serve uploaded local media files statically
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// --- KOREAN PROFANITY & SWEAR FILTER (Clean Bot & Wholesome Purifier) ---
const PROFANITY_MAP = [
  { regex: /시[발벌바]|씨[발벌바]|ㅅㅂ|ㅆㅂ|쉬[발바]|sibal|fuck/gi, replace: '사랑해요❤️' },
  { regex: /존나|졸라|ㅈㄴ|존[많맛멋]/gi, replace: '진짜 대박' },
  { regex: /개[새색]끼|새[끼키]|개새|개색/gi, replace: '귀염둥이🐶' },
  { regex: /지[랄럴]|ㅈㄹ|지럴/gi, replace: '요술마법✨' },
  { regex: /병[신쉰]|ㅂㅅ|븅[신쉰]|등신/gi, replace: '멋쟁이 천재😎' },
  { regex: /미[친칭][놈년놈들]|미쳤/gi, replace: '열정 넘치는🔥' },
  { regex: /닥[쳐치]/gi, replace: '조용히 집중🤫' },
  { regex: /망[했할]/gi, replace: '오히려 좋아🌟' },
  { regex: /[좆좇졎]|ㅈ같|존같/gi, replace: '최고로 멋진' },
  { regex: /[씹씝][창창련]/gi, replace: '활짝 핀 꽃밭🌸' },
  { regex: /걸레|창녀|보지|자지|느금|엠창|니애미|애미|따먹/gi, replace: '[클린봇 정화됨✨]' }
];

function sanitizeChatMessage(text) {
  if (!text || typeof text !== 'string') return { cleanText: '', wasFiltered: false };
  let cleanText = text;
  let wasFiltered = false;

  for (const item of PROFANITY_MAP) {
    if (item.regex.test(cleanText)) {
      wasFiltered = true;
      cleanText = cleanText.replace(item.regex, item.replace);
    }
  }

  return { cleanText, wasFiltered };
}

function cleanupChatFiles(pin) {
  try {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return;
    const files = fs.readdirSync(UPLOADS_DIR);
    let removedCount = 0;
    files.forEach(f => {
      if (f.startsWith('chat_' + cleanPin + '_')) {
        try {
          fs.unlinkSync(path.join(UPLOADS_DIR, f));
          removedCount++;
        } catch (e) {}
      }
    });
    if (removedCount > 0) {
      console.log('[Chat Cleanup] Removed ' + removedCount + ' temporary files for room ' + cleanPin);
    }
  } catch (err) {
    console.error('[Chat Cleanup Error]', err);
  }
}

// Endpoint for uploading local media (music, video, image) from client
app.post('/api/upload', (req, res) => {
  try {
    const { name, data, pin, isChat } = req.body;
    if (!data || !name) {
      return res.status(400).json({ success: false, message: 'Invalid file data' });
    }
    const ext = path.extname(name) || '.bin';
    const cleanPin = pin ? String(pin).trim() : '';
    const prefix = isChat && cleanPin ? ('chat_' + cleanPin + '_') : '';
    const safeFilename = prefix + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + ext;
    const targetPath = path.join(UPLOADS_DIR, safeFilename);

    const base64Data = data.replace(/^data:.*?;base64,/, '');
    fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/uploads/${safeFilename}`;
    console.log(`[Upload] File saved to ${targetPath} -> ${fileUrl}`);
    res.json({ success: true, url: fileUrl, filename: name });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ success: false, message: 'Server file upload error' });
  }
});

let activeTunnelUrl = null;
let isTunnelVerifying = false;
let cloudflaredProc = null;
let cloudflaredConsecutiveFails = 0;
let cloudflaredRestartTimer = null;
let isCloudflaredDisabledDueToErrors = false;
let isCloudflaredIntentionalKill = false;

let localtunnelInstance = null;
let localtunnelConsecutiveFails = 0;
let localtunnelRestartTimer = null;
let isLocaltunnelDisabledDueToErrors = false;

let currentVerifyingUrl = null;
let healthCheckRestartCount = 0;

let publicHostIp = '211.234.205.170';
async function fetchPublicHostIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data && data.ip) {
      publicHostIp = data.ip;
      broadcastTunnelUpdate();
    }
  } catch (e) {}
}
fetchPublicHostIp();

function broadcastTunnelUpdate() {
  if (typeof io !== 'undefined' && io) {
    io.emit('tunnel:updated', { 
      publicUrl: activeTunnelUrl,
      isVerifying: isTunnelVerifying,
      publicHostIp: publicHostIp
    });
  }
}

async function verifyTunnelReachability(url, maxAttempts = 8) {
  currentVerifyingUrl = url;
  isTunnelVerifying = true;
  broadcastTunnelUpdate();
  console.log(`[Tunnel] Verifying reachability for: ${url} ...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // If verification was cancelled or another tunnel replaced it, abort early
    if (currentVerifyingUrl !== url) {
      console.log(`[Tunnel] Verification cancelled for outdated URL: ${url}`);
      return false;
    }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status === 200 || res.status === 304 || res.status < 500) {
        console.log(`\n=========================================`);
        console.log(`🚀 Public Universal Tunnel 100% Ready (Attempt ${attempt}):`);
        console.log(url);
        console.log(`=========================================\n`);
        activeTunnelUrl = url;
        isTunnelVerifying = false;
        cloudflaredConsecutiveFails = 0; // reset on success
        broadcastTunnelUpdate();
        startTunnelHealthMonitor();
        return true;
      }
    } catch (err) {
      console.log(`[Tunnel] Verification attempt ${attempt}/${maxAttempts} (${err.message})`);
    }

    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (currentVerifyingUrl !== url) return false;

  console.warn('[Tunnel] Verification timed out for URL, keeping fallback');
  isTunnelVerifying = false;
  broadcastTunnelUpdate();
  return false;
}

let tunnelHealthFailCount = 0;
let tunnelHealthTimer = null;

function startTunnelHealthMonitor() {
  if (tunnelHealthTimer) clearInterval(tunnelHealthTimer);
  tunnelHealthTimer = setInterval(async () => {
    if (!activeTunnelUrl || isTunnelVerifying) {
      tunnelHealthFailCount = 0;
      return;
    }
    try {
      const res = await fetch(activeTunnelUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Bypass-Tunnel-Reminder': 'true', 'User-Agent': 'Mozilla/5.0 (Quizrun-Tunnel-Check)' }
      });
      if (res.status === 200 || res.status === 304 || res.status < 500) {
        tunnelHealthFailCount = 0;
      } else {
        tunnelHealthFailCount++;
      }
    } catch (err) {
      tunnelHealthFailCount++;
      console.log(`[Tunnel HealthCheck] Probe check (${tunnelHealthFailCount}/5): ${err.message}`);
    }

    if (tunnelHealthFailCount >= 5) {
      console.warn(`\x1b[33m[Tunnel HealthCheck] External Tunnel check warning (${activeTunnelUrl}).\x1b[0m`);
      tunnelHealthFailCount = 0;
    }
  }, 30000);
}

let localhostRunProc = null;
let localhostRunConsecutiveFails = 0;
let localhostRunRestartTimer = null;
let isLocalhostRunIntentionalKill = false;

function startLocalhostRunTunnel() {
  if (localhostRunRestartTimer) {
    clearTimeout(localhostRunRestartTimer);
    localhostRunRestartTimer = null;
  }
  if (localhostRunProc) {
    isLocalhostRunIntentionalKill = true;
    try { localhostRunProc.kill(); } catch (e) {}
  }

  console.log('[Tunnel] Starting localhost.run high-speed universal tunnel...');
  try {
    localhostRunProc = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', '80:127.0.0.1:5173',
      'nokey@localhost.run'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const regex = /https:\/\/[a-z0-9]+\.lhr\.life/;
    let hasFoundUrl = false;

    const onData = (data) => {
      const text = data.toString();
      const match = text.match(regex);
      if (match && !hasFoundUrl) {
        hasFoundUrl = true;
        const foundUrl = match[0];
        console.log(`\n=========================================`);
        console.log(`🚀 Public Universal Tunnel 100% Ready (localhost.run):`);
        console.log(foundUrl);
        console.log(`=========================================\n`);
        
        activeTunnelUrl = foundUrl;
        isTunnelVerifying = false;
        localhostRunConsecutiveFails = 0;
        broadcastTunnelUpdate();
        startTunnelHealthMonitor();
      }
    };

    localhostRunProc.stdout.on('data', onData);
    localhostRunProc.stderr.on('data', onData);

    localhostRunProc.on('close', (code) => {
      console.log(`[Tunnel] localhost.run process exited with code ${code}`);
      if (isLocalhostRunIntentionalKill || code === null) {
        isLocalhostRunIntentionalKill = false;
        return; // Intentionally killed, break the restart cascade loop
      }
      if (activeTunnelUrl && activeTunnelUrl.includes('lhr.life')) {
        activeTunnelUrl = null;
        broadcastTunnelUpdate();
      }
      localhostRunConsecutiveFails++;
      if (localhostRunConsecutiveFails < 3) {
        const delay = Math.min(5000 * Math.pow(2, localhostRunConsecutiveFails), 30000);
        if (localhostRunRestartTimer) clearTimeout(localhostRunRestartTimer);
        localhostRunRestartTimer = setTimeout(startLocalhostRunTunnel, delay);
      }
    });

    localhostRunProc.on('error', (err) => {
      console.warn('[Tunnel] localhost.run process error:', err.message);
    });
  } catch (err) {
    console.error('[Tunnel] Failed to spawn localhost.run:', err);
  }
}

function startCloudflaredTunnel() {
  if (isCloudflaredDisabledDueToErrors) return;

  const binPath = path.join(__dirname, 'bin', 'cloudflared.exe');
  if (!fs.existsSync(binPath)) {
    console.warn('[Tunnel] cloudflared.exe not found at', binPath);
    return;
  }

  if (cloudflaredRestartTimer) {
    clearTimeout(cloudflaredRestartTimer);
    cloudflaredRestartTimer = null;
  }

  if (cloudflaredProc) {
    isCloudflaredIntentionalKill = true;
    try { cloudflaredProc.kill(); } catch (e) {}
  }

  if (!activeTunnelUrl) {
    isTunnelVerifying = true;
    broadcastTunnelUpdate();
  }

  console.log('[Tunnel] Starting Cloudflare Universal Tunnel on port 5173...');
  try {
    cloudflaredProc = spawn(binPath, ['tunnel', '--url', 'http://localhost:5173'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const regex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;
    let hasTriggeredCheck = false;

    const onData = (data) => {
      const text = data.toString();
      const match = text.match(regex);
      if (match && !hasTriggeredCheck) {
        hasTriggeredCheck = true;
        const foundUrl = match[0];
        console.log(`[Tunnel] Found raw Cloudflare URL: ${foundUrl}. Awaiting edge readiness...`);
        verifyTunnelReachability(foundUrl);
      }
    };

    cloudflaredProc.stdout.on('data', onData);
    cloudflaredProc.stderr.on('data', onData);

    cloudflaredProc.on('close', (code) => {
      console.log(`[Tunnel] cloudflared exited with code ${code}`);
      currentVerifyingUrl = null; // abort any ongoing 20-attempt verify loop

      if (isCloudflaredIntentionalKill || code === null) {
        isCloudflaredIntentionalKill = false;
        return; // Intentionally killed, break the restart cascade loop
      }

      if (activeTunnelUrl && activeTunnelUrl.includes('trycloudflare.com')) {
        activeTunnelUrl = null;
        isTunnelVerifying = false;
        broadcastTunnelUpdate();
      }

      cloudflaredConsecutiveFails++;
      if (cloudflaredConsecutiveFails >= 3) {
        isCloudflaredDisabledDueToErrors = true;
        isTunnelVerifying = false;
        broadcastTunnelUpdate();
        console.warn('\x1b[33m========================================================================\x1b[0m');
        console.warn('\x1b[33m[Tunnel] Cloudflare tunnel 3회 연속 실패 감지 (테더링 또는 통신사 제한).\x1b[0m');
        console.warn('\x1b[33m[Tunnel] 모바일 핫스팟 데이터 낭비를 방지하기 위해 자동 재시도를 중단합니다.\x1b[0m');
        console.warn('\x1b[33m[Tunnel] 다시 연결하려면 메인 화면의 [새로고침] 버튼을 눌러주세요.\x1b[0m');
        console.warn('\x1b[33m========================================================================\x1b[0m');
        return;
      }

      const delay = Math.min(3000 * Math.pow(2, cloudflaredConsecutiveFails), 30000);
      if (cloudflaredRestartTimer) clearTimeout(cloudflaredRestartTimer);
      cloudflaredRestartTimer = setTimeout(startCloudflaredTunnel, delay);
    });

    cloudflaredProc.on('error', (err) => {
      console.error('[Tunnel] cloudflared process error:', err.message);
    });
  } catch (err) {
    console.error('[Tunnel] Failed to spawn cloudflared:', err);
  }
}

function restartAllTunnels(manual = true) {
  if (manual) {
    cloudflaredConsecutiveFails = 0;
    isCloudflaredDisabledDueToErrors = false;
    localhostRunConsecutiveFails = 0;
    healthCheckRestartCount = 0;
  }
  if (cloudflaredRestartTimer) clearTimeout(cloudflaredRestartTimer);
  if (localhostRunRestartTimer) clearTimeout(localhostRunRestartTimer);

  activeTunnelUrl = null;
  currentVerifyingUrl = null;
  isTunnelVerifying = true;
  broadcastTunnelUpdate();
  startLocalhostRunTunnel();
  startCloudflaredTunnel();
}

function startTunnelServices() {
  const isCloudEnv = Boolean(
    process.env.RENDER || 
    process.env.KOYEB || 
    process.env.RAILWAY_ENVIRONMENT || 
    process.env.HEROKU_APP_NAME ||
    (process.env.NODE_ENV === 'production' && process.env.PORT && process.env.PORT !== '5173' && process.env.PORT !== '3001')
  );
  if (isCloudEnv || process.env.DISABLE_TUNNEL === 'true' || process.env.OFFLINE_ONLY === 'true') {
    console.log('[Tunnel] Native cloud host detected. Local tunnel services disabled (using native domain).');
    return;
  }
  startLocalhostRunTunnel();
  startCloudflaredTunnel();
}

// Clean up child process on exit
process.on('exit', () => {
  if (tunnelHealthTimer) clearInterval(tunnelHealthTimer);
  if (localhostRunProc) {
    try { localhostRunProc.kill(); } catch (e) {}
  }
  if (cloudflaredProc) {
    try { cloudflaredProc.kill(); } catch (e) {}
  }
});

function getAllLocalIPs() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Exclude APIPA self-assigned IPs (169.254.x.x)
        if (!iface.address.startsWith('169.254.')) {
          candidates.push(iface.address);
        }
      }
    }
  }
  return candidates;
}

function getLocalIP() {
  const candidates = getAllLocalIPs();
  // Priority order:
  // 1. 192.168.x.x (Standard Home Wi-Fi / Hotspot)
  // 2. 172.16-31.x.x (iPhone / Android Mobile Tethering)
  // 3. 10.x.x.x (Institutional / School Wi-Fi)
  // 4. Any other non-internal IPv4
  const best = candidates.find(ip => ip.startsWith('192.168.')) || 
               candidates.find(ip => /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) || 
               candidates.find(ip => ip.startsWith('10.')) || 
               candidates[0] || 
               'localhost';
  return best;
}

let lastDetectedIp = getLocalIP();

function broadcastNetworkUpdate() {
  const currentIp = getLocalIP();
  if (typeof io !== 'undefined' && io) {
    io.emit('network:updated', { 
      ip: currentIp,
      allIps: getAllLocalIPs(),
      publicUrl: activeTunnelUrl,
      isVerifying: isTunnelVerifying,
      publicHostIp: publicHostIp
    });
    io.emit('tunnel:updated', { 
      publicUrl: activeTunnelUrl,
      isVerifying: isTunnelVerifying,
      publicHostIp: publicHostIp
    });
  }
}

// Background network interface monitor: auto-detect Wi-Fi / Tethering switch
setInterval(() => {
  const latestIp = getLocalIP();
  if (latestIp !== lastDetectedIp) {
    console.log(`\x1b[36m[Network Monitor] Active Network Interface changed: ${lastDetectedIp} -> ${latestIp}\x1b[0m`);
    lastDetectedIp = latestIp;
    broadcastNetworkUpdate();
    restartAllTunnels();
  }
}, 4000);

// Endpoint for active network status check
app.get('/api/network-info', (req, res) => {
  res.json({
    success: true,
    ip: getLocalIP(),
    allIps: getAllLocalIPs(),
    publicUrl: activeTunnelUrl,
    isVerifying: isTunnelVerifying,
    publicHostIp: publicHostIp
  });
});

// --- GIT MANAGEMENT & DEPLOYMENT SYNC ENDPOINTS ---
const { execFile } = require('child_process');
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

let isGitOperating = false;
let currentGitOp = null;
let gitOperationStartTime = 0;

async function acquireGitLock(operationName = 'git-op', maxWaitMs = 15000) {
  const start = Date.now();
  while (isGitOperating) {
    // Stale lock recovery: If previous operation exceeded 45s, force-release
    if (gitOperationStartTime && (Date.now() - gitOperationStartTime > 45000)) {
      console.warn(`[Git Mutex] Force-releasing stale git lock (held by ${currentGitOp} for >45s)`);
      isGitOperating = false;
      currentGitOp = null;
      gitOperationStartTime = 0;
      break;
    }
    if (Date.now() - start >= maxWaitMs) {
      return false;
    }
    await new Promise(r => setTimeout(r, 400));
  }
  isGitOperating = true;
  currentGitOp = operationName;
  gitOperationStartTime = Date.now();
  return true;
}

function releaseGitLock() {
  isGitOperating = false;
  currentGitOp = null;
  gitOperationStartTime = 0;
}

// Direct execution of git.exe without cmd.exe shell wrapper (prevents EPERM and quoting issues)
function runGit(args, options = {}) {
  return new Promise((resolve, reject) => {
    const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';
    const opts = {
      cwd: ROOT_DIR,
      timeout: 35000,
      windowsHide: false,
      ...options
    };
    execFile(gitBin, args, opts, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

// Direct execution of npm without cmd.exe shell wrapper (prevents EINVAL on Windows)
function runNpm(args, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      cwd: FRONTEND_DIR,
      timeout: 90000,
      windowsHide: false,
      ...options
    };

    // On Windows, executing npm.cmd directly with execFile causes spawn EINVAL in Node v18+/v20+/v22+/v24+.
    // Executing node.exe with npm-cli.js directly is clean, reliable, and does not require cmd.exe shell wrapper.
    const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (fs.existsSync(npmCli)) {
      execFile(process.execPath, [npmCli, ...args], opts, (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          return reject(error);
        }
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      });
    } else {
      // Fallback for non-standard node environments
      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execFile(npmBin, args, { ...opts, shell: process.platform === 'win32' }, (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          return reject(error);
        }
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      });
    }
  });
}

// 1. Get Git Status & Current Commit (Compare Local vs GitHub Remote)
// Emergency reset endpoint for git lock
app.all(['/api/git/reset-lock', '/api/git-reset-lock'], (req, res) => {
  console.log(`[Git Lock] Manual lock reset called. Previous state: isBusy=${isGitOperating}, op=${currentGitOp}`);
  releaseGitLock();
  res.json({ success: true, message: '동기화 락이 초기화되었습니다. 이제 동기화를 다시 진행하실 수 있습니다.' });
});

app.get('/api/git/status', async (req, res) => {
  // Stale lock auto-cleanup on status check
  if (isGitOperating && gitOperationStartTime && (Date.now() - gitOperationStartTime > 45000)) {
    console.warn(`[Git Status] Auto-clearing stale git lock (${currentGitOp})`);
    releaseGitLock();
  }
  try {
    const logRes = await runGit(['log', '-1', '--format=%h|%s|%an|%ad', '--date=short'], { timeout: 10000 });
    const [hash, message, author, date] = (logRes.stdout || '').trim().split('|');
    
    const statusRes = await runGit(['status', '--porcelain'], { timeout: 10000 });
    const rawStatus = (statusRes.stdout || '').trim();
    const changedFiles = rawStatus ? rawStatus.split('\n').map(l => l.trim()) : [];
    const hasUncommittedChanges = changedFiles.length > 0;

    let behindCount = 0;
    let aheadCount = 0;
    let remoteLatestCommit = null;
    let fetchError = null;

    try {
      // Fetch latest remote commits from origin main (timeout 15s)
      await runGit(['fetch', 'origin', 'main'], { timeout: 15000 });
      
      const behindRes = await runGit(['rev-list', '--count', 'HEAD..origin/main'], { timeout: 10000 });
      behindCount = parseInt(behindRes.stdout.trim(), 10) || 0;

      const aheadRes = await runGit(['rev-list', '--count', 'origin/main..HEAD'], { timeout: 10000 });
      aheadCount = parseInt(aheadRes.stdout.trim(), 10) || 0;

      if (behindCount > 0) {
        const remoteLogRes = await runGit(['log', '-1', 'origin/main', '--format=%h|%s|%an|%ad', '--date=short'], { timeout: 10000 });
        const [rHash, rMessage, rAuthor, rDate] = (remoteLogRes.stdout || '').trim().split('|');
        remoteLatestCommit = {
          hash: rHash || 'origin/main',
          message: rMessage || '',
          author: rAuthor || '',
          date: rDate || ''
        };
      }
    } catch (e) {
      console.warn('[Git Status] Remote fetch warning/error:', e.message || e);
      fetchError = e.message || String(e);
    }

    let comparison = 'UP_TO_DATE';
    if (fetchError && behindCount === 0 && aheadCount === 0 && !hasUncommittedChanges) {
      comparison = 'FETCH_FAILED';
    } else if (behindCount > 0 && (hasUncommittedChanges || aheadCount > 0)) {
      comparison = 'DIVERGED';
    } else if (behindCount > 0) {
      comparison = 'NEED_PULL';
    } else if (hasUncommittedChanges || aheadCount > 0) {
      comparison = 'NEED_PUSH';
    }

    res.json({
      success: true,
      currentCommit: {
        hash: hash || 'Unknown',
        message: message || '',
        author: author || '',
        date: date || ''
      },
      hasUncommittedChanges,
      changedFilesCount: changedFiles.length,
      changedFiles: changedFiles.slice(0, 10),
      behindCount,
      aheadCount,
      remoteLatestCommit,
      comparison,
      fetchError,
      isBusy: isGitOperating
    });
  } catch (err) {
    console.error('[Git Status] Status check error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Sync / Backup to GitHub (Push with Smart Auto-Merge)
app.post('/api/git/push', async (req, res) => {
  const acquired = await acquireGitLock('push', 15000);
  if (!acquired) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  try {
    const customMessage = req.body?.message || `Auto-backup: Quizrun data & settings (${new Date().toLocaleString('ko-KR')})`;
    console.log('[Git Sync] Staging all files...');
    await runGit(['add', '-A']);

    const statusRes = await runGit(['status', '--porcelain']);
    let didCommit = false;
    if (statusRes.stdout && statusRes.stdout.trim().length > 0) {
      console.log(`[Git Sync] Committing changes: ${customMessage}`);
      await runGit(['commit', '-m', customMessage]);
      didCommit = true;
    }

    // Check if remote has new updates from another PC and auto-merge keeping local latest data
    let didMergeRemote = false;
    try {
      await runGit(['fetch', 'origin', 'main'], { timeout: 15000 });
      const behindRes = await runGit(['rev-list', '--count', 'HEAD..origin/main'], { timeout: 10000 });
      const behindCount = parseInt(behindRes.stdout.trim(), 10) || 0;
      if (behindCount > 0) {
        console.log(`[Git Sync] Remote has ${behindCount} new commit(s). Auto-merging with local priority (-X ours)...`);
        await runGit(['merge', 'origin/main', '--no-edit', '-X', 'ours'], { timeout: 35000 });
        didMergeRemote = true;
      }
    } catch (mergeErr) {
      console.warn('[Git Sync] Auto-merge check warning:', mergeErr.message || mergeErr);
    }

    console.log('[Git Sync] Pushing to GitHub (origin/main)...');
    const pushRes = await runGit(['push', 'origin', 'main'], { timeout: 45000 });
    console.log('[Git Sync] Push successful:', pushRes.stdout, pushRes.stderr);

    if (didMergeRemote) {
      try {
        console.log('[Git Sync] Rebuilding frontend after remote merge...');
        await runNpm(['run', 'build']);
      } catch (buildErr) {
        console.warn('[Git Sync] Post-merge build warning:', buildErr.message);
      }
      PERSISTED_QUIZZES = loadPersistedData(QUIZ_DATA_PATH);
      APP_CONFIG = loadPersistedData(APP_CONFIG_PATH, DEFAULT_APP_CONFIG);
      if (typeof io !== 'undefined' && io) {
        io.emit('config:updated', APP_CONFIG);
      }
    }

    res.json({
      success: true,
      message: didMergeRemote
        ? '다른 컴퓨터의 최신 업데이트와 현재 로컬 데이터를 자동으로 병합하여 깃허브에 백업(Push) 완료했습니다!'
        : didCommit 
          ? '변경된 모든 데이터가 깃허브에 성공적으로 백업(Push)되었습니다!' 
          : '이미 깃허브 원격 저장소와 완벽하게 일치하며 최신 상태입니다.',
      didCommit,
      didMergeRemote
    });
  } catch (err) {
    console.error('[Git Sync] Push error:', err);
    let errMsg = `깃허브 업로드 중 오류가 발생했습니다: ${err.message || err}`;
    if (err.stderr && (err.stderr.includes('fetch first') || err.stderr.includes('non-fast-forward'))) {
      errMsg = '깃허브 원격 저장소에 새로운 업데이트가 먼저 존재합니다. [최신 버전으로 업데이트(Pull)]를 먼저 진행해주세요.';
    }
    res.status(500).json({
      success: false,
      message: errMsg
    });
  } finally {
    releaseGitLock();
  }
});

// 3. Update from GitHub (Pull & Smart Merge & Rebuild)
app.post('/api/git/pull', async (req, res) => {
  const acquired = await acquireGitLock('pull', 15000);
  if (!acquired) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  try {
    // Auto-save any uncommitted local changes before pulling so local updates are never lost
    const statusRes = await runGit(['status', '--porcelain']);
    if (statusRes.stdout && statusRes.stdout.trim().length > 0) {
      const autoMsg = `Auto-backup before pull (${new Date().toLocaleString('ko-KR')})`;
      console.log(`[Git Update] Committing local changes before pull: ${autoMsg}`);
      await runGit(['add', '-A']);
      await runGit(['commit', '-m', autoMsg]);
    }

    console.log('[Git Update] Pulling latest changes from GitHub...');
    const pullRes = await runGit(['pull', '--no-rebase', '-X', 'theirs', 'origin', 'main'], { timeout: 45000 });
    console.log('[Git Update] Pull output:', pullRes.stdout, pullRes.stderr);

    // Rebuild frontend production bundle so web UI reflects updates
    console.log('[Git Update] Rebuilding frontend production bundle...');
    await runNpm(['run', 'build']);
    console.log('[Git Update] Frontend build completed.');

    // Reload persisted quizzes and config into memory
    PERSISTED_QUIZZES = loadPersistedData(QUIZ_DATA_PATH);
    APP_CONFIG = loadPersistedData(APP_CONFIG_PATH, DEFAULT_APP_CONFIG);
    if (typeof io !== 'undefined' && io) {
      io.emit('config:updated', APP_CONFIG);
    }

    const isAlreadyUpToDate = pullRes.stdout && pullRes.stdout.includes('Already up to date');

    res.json({
      success: true,
      message: isAlreadyUpToDate
        ? '이미 깃허브 최신 버전입니다 (변경사항 없음). 프론트엔드 최신 빌드가 완료되었습니다!'
        : '깃허브 최신 코드로 성공적으로 병합 및 빌드가 완료되었습니다! 화면을 새로고침합니다.',
      output: pullRes.stdout
    });
  } catch (err) {
    console.error('[Git Update] Pull error:', err);
    let errMsg = `깃허브 업데이트 중 오류가 발생했습니다: ${err.message || err}`;
    res.status(500).json({
      success: false,
      message: errMsg
    });
  } finally {
    releaseGitLock();
  }
});

// 4. One-Click All-in-One Git & Render Sync (Smart Compare & Merge Local + GitHub -> Push -> Rebuild)
app.all(['/api/git/sync', '/api/git-sync'], async (req, res) => {
  const acquired = await acquireGitLock('one-click-sync', 20000);
  if (!acquired) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  try {
    const customMessage = req.body?.message || `원클릭 동기화: Quizrun (${new Date().toLocaleString('ko-KR')})`;

    console.log('[Git One-Click Sync] Step 1: Staging and committing local changes first...');
    await runGit(['add', '-A']);
    const statusRes = await runGit(['status', '--porcelain']);
    let didCommit = false;
    if (statusRes.stdout && statusRes.stdout.trim().length > 0) {
      await runGit(['commit', '-m', customMessage]);
      didCommit = true;
    }

    console.log('[Git One-Click Sync] Step 2: Fetching and comparing with GitHub (origin/main)...');
    let pullOutput = '';
    try {
      await runGit(['fetch', 'origin', 'main'], { timeout: 25000 });
      const behindRes = await runGit(['rev-list', '--count', 'HEAD..origin/main'], { timeout: 10000 });
      const behindCount = parseInt(behindRes.stdout.trim(), 10) || 0;
      if (behindCount > 0) {
        const localTsRes = await runGit(['log', '-1', '--format=%ct', 'HEAD']);
        const remoteTsRes = await runGit(['log', '-1', '--format=%ct', 'origin/main']);
        const localTs = parseInt(localTsRes.stdout.trim(), 10) || 0;
        const remoteTs = parseInt(remoteTsRes.stdout.trim(), 10) || 0;
        const strategyOpt = localTs >= remoteTs ? 'ours' : 'theirs';
        console.log(`[Git One-Click Sync] Merging ${behindCount} remote commit(s) using -X ${strategyOpt} (localTs=${localTs}, remoteTs=${remoteTs})...`);
        const mergeRes = await runGit(['merge', 'origin/main', '--no-edit', '-X', strategyOpt], { timeout: 45000 });
        pullOutput = mergeRes.stdout || '';
      } else {
        pullOutput = 'Already up to date.';
      }
    } catch (pullErr) {
      console.warn('[Git One-Click Sync] Merge warning (proceeding):', pullErr.message || pullErr);
    }

    console.log('[Git One-Click Sync] Step 3: Pushing merged latest state to GitHub (origin/main)...');
    const pushRes = await runGit(['push', 'origin', 'main'], { timeout: 45000 });
    console.log('[Git One-Click Sync] Push result:', pushRes.stdout);

    console.log('[Git One-Click Sync] Step 4: Rebuilding frontend bundle...');
    try {
      await runNpm(['run', 'build']);
      console.log('[Git One-Click Sync] Frontend build finished.');
    } catch (buildErr) {
      console.warn('[Git One-Click Sync] Build warning:', buildErr.message);
    }

    // Reload persisted quizzes and config into memory
    PERSISTED_QUIZZES = loadPersistedData(QUIZ_DATA_PATH);
    APP_CONFIG = loadPersistedData(APP_CONFIG_PATH, DEFAULT_APP_CONFIG);
    if (typeof io !== 'undefined' && io) {
      io.emit('config:updated', APP_CONFIG);
    }

    res.json({
      success: true,
      message: '로컬과 GitHub의 코드를 비교·병합하여 최신 버전으로 동기화 및 배포 완료했습니다! (Render는 약 1분 뒤 자동 반영됩니다)',
      didCommit,
      pull: pullOutput,
      push: pushRes.stdout
    });
  } catch (err) {
    console.error('[Git One-Click Sync] Error:', err);
    res.status(500).json({
      success: false,
      message: `동기화 실패: ${err.message || err}`
    });
  } finally {
    releaseGitLock();
  }
});

const server = http.createServer(app);
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 15000,
  pingTimeout: 45000,
  maxHttpBufferSize: 1e8,
  transports: ['websocket', 'polling']
});

function broadcastParticipants(pin) {
  const cleanPin = String(pin || '').trim();
  const room = rooms[cleanPin];
  if (!room) return;

  if (room.participantsUpdateTimer) {
    return;
  }

  room.participantsUpdateTimer = setTimeout(() => {
    delete room.participantsUpdateTimer;
    if (!rooms[cleanPin]) return;

    if (room.hostId) io.to(room.hostId).emit('host:participantsUpdated', room.participants);
    io.to(cleanPin).emit('host:participantsUpdated', room.participants);
    io.to(cleanPin).emit('room:participantCount', { count: room.participants.length });
  }, 100);
}

const MOCK_QUIZZES = {
  'general': {
    title: '일반 상식 퀴즈',
    questions: [
      { text: '프랑스의 수도는 어디일까요?', options: ['런던', '베를린', '파리', '마드리드'], correctIndex: 2 },
      { text: '태양계에서 "붉은 행성"이라고 불리는 별은?', options: ['지구', '화성', '목성', '금성'], correctIndex: 1 },
      { text: '5 더하기 7은 얼마일까요?', options: ['10', '11', '12', '13'], correctIndex: 2 }
    ]
  },
  'science': {
    title: '재미있는 과학 탐구',
    questions: [
      { text: '물의 화학 기호는 무엇일까요?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctIndex: 0 },
      { text: '물은 섭씨 몇 도에서 끓을까요?', options: ['50°C', '100°C', '150°C', '200°C'], correctIndex: 1 },
      { text: '다음 중 포유류가 아닌 것은?', options: ['고래', '상어', '박쥐', '인간'], correctIndex: 1 }
    ]
  },
  'kpop': {
    title: '재미있는 K-Pop 퀴즈',
    questions: [
      { text: '방탄소년단(BTS)의 데뷔 연도는 언제일까요?', options: ['2011년', '2012년', '2013년', '2014년'], correctIndex: 2 },
      { text: '블랙핑크의 멤버가 아닌 사람은?', options: ['지수', '제니', '나연', '리사'], correctIndex: 2 },
      { text: '뉴진스(NewJeans)의 데뷔곡이 아닌 것은?', options: ['Attention', 'Hype Boy', 'Ditto', 'Cookie'], correctIndex: 2 }
    ]
  },
  'history': {
    title: '도전! 한국사 능력 고사',
    questions: [
      { text: '조선 시대 세종대왕이 한글을 창제한 연도는?', options: ['1443년', '1446년', '1592년', '1945년'], correctIndex: 0 },
      { text: '임진왜란에서 거북선을 이끌고 승리한 장군은?', options: ['강감찬', '이순신', '을지문덕', '계백'], correctIndex: 1 },
      { text: '우리나라의 첫 번째 국가인 고조선을 세운 인물은?', options: ['주몽', '박혁거세', '단군왕검', '온조'], correctIndex: 2 }
    ]
  }
};

const QUIZ_DATA_PATH = path.join(__dirname, 'data', 'quizzes.json');
const APP_CONFIG_PATH = path.join(__dirname, 'data', 'app_config.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(QUIZ_DATA_PATH))) {
  fs.mkdirSync(path.dirname(QUIZ_DATA_PATH), { recursive: true });
}

const DEFAULT_APP_CONFIG = {
  quizzes: [
    { id: 'humor', title: '유머', count: 15, bg: '#fef3c7' },
    { id: 'econ', title: '경제', count: 12, bg: '#d1fae5' },
    { id: 'current', title: '시사', count: 8, bg: '#dbeafe' },
    { id: 'science', title: '과학', count: 10, bg: '#e0e7ff' },
    { id: 'sports', title: '스포츠', count: 9, bg: '#ffedd5' },
    { id: 'lit', title: '문학', count: 11, bg: '#f5f3ff' },
    { id: 'math', title: '수학', count: 7, bg: '#ecfeff' },
    { id: 'tech', title: '매너', count: 14, bg: '#f1f5f9' },
    { id: 'movie', title: '영화', count: 13, bg: '#fce7f3' },
    { id: 'music', title: '음악', count: 10, bg: '#fff7ed' },
    { id: 'food', title: '음식', count: 12, bg: '#fff7ed' },
    { id: 'travel', title: '여행', count: 8, bg: '#f0fdfa' },
    { id: 'art', title: '예술', count: 9, bg: '#faf5ff' },
    { id: 'arch', title: '건축', count: 11, bg: '#f3f4f6' },
    { id: 'nature', title: '자연', count: 15, bg: '#f0fdf4' },
    { id: 'space', title: '우주', count: 7, bg: '#e0e7ff' },
    { id: 'phil', title: '철학', count: 10, bg: '#fffbeb' },
    { id: 'psych', title: '심리', count: 12, bg: '#fff1f2' },
    { id: 'law', title: '법', count: 8, bg: '#f9fafb' },
    { id: 'lang', title: '언어', count: 11, bg: '#eef2ff' },
    { id: 'ladder', title: '사다리', count: 1, bg: '#fff7ed' },
    { id: 'trivia', title: '상식 퀴즈', count: 20, bg: '#fffbeb' },
  ]
};

function loadPersistedData(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      // If it's the config file and it's empty or missing quizzes, return default
      if (filePath.includes('app_config') && (!parsed.quizzes || parsed.quizzes.length === 0)) {
        return defaultValue;
      }
      return parsed;
    }
  } catch (err) {
    console.error(`Error loading persisted data from ${filePath}:`, err);
  }
  return defaultValue;
}

let autoGitBackupTimer = null;

function scheduleAutoGitBackup() {
  if (autoGitBackupTimer) clearTimeout(autoGitBackupTimer);
  autoGitBackupTimer = setTimeout(async () => {
    if (isGitOperating) return;
    const acquired = await acquireGitLock('auto-backup', 1000);
    if (!acquired) return;
    try {
      await runGit(['add', 'backend/data', 'backend/uploads']);
      const statusRes = await runGit(['status', '--porcelain', 'backend/data', 'backend/uploads']);
      if (statusRes.stdout && statusRes.stdout.trim().length > 0) {
        const msg = `Auto-backup: Quizrun data & settings (${new Date().toLocaleString('ko-KR')})`;
        console.log(`[Auto Git Sync] Committing data changes: ${msg}`);
        await runGit(['commit', '-m', msg]);
        try {
          await runGit(['fetch', 'origin', 'main'], { timeout: 15000 });
          const behindRes = await runGit(['rev-list', '--count', 'HEAD..origin/main'], { timeout: 10000 });
          const behindCount = parseInt(behindRes.stdout.trim(), 10) || 0;
          if (behindCount > 0) {
            await runGit(['merge', 'origin/main', '--no-edit', '-X', 'ours'], { timeout: 30000 });
          }
        } catch (e) {}
        await runGit(['push', 'origin', 'main'], { timeout: 40000 });
        console.log('[Auto Git Sync] Background GitHub backup completed!');
      }
    } catch (err) {
      console.warn('[Auto Git Sync] Background sync warning:', err.message || err);
    } finally {
      releaseGitLock();
    }
  }, 6000);
}

function savePersistedData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    scheduleAutoGitBackup();
  } catch (err) {
    console.error(`Error saving persisted data to ${filePath}:`, err);
  }
}

let PERSISTED_QUIZZES = loadPersistedData(QUIZ_DATA_PATH);
let APP_CONFIG = loadPersistedData(APP_CONFIG_PATH, DEFAULT_APP_CONFIG);

// Ensure APP_CONFIG is saved back if it was initialized from default
if (!fs.existsSync(APP_CONFIG_PATH)) {
    savePersistedData(APP_CONFIG_PATH, APP_CONFIG);
}

// REST endpoints for Cloud / JSON Data Sync (used by cloudSync.js)
app.get('/api/quizzes', (req, res) => {
  res.json({
    quizzes: PERSISTED_QUIZZES,
    appConfig: APP_CONFIG
  });
});

app.post('/api/quizzes', (req, res) => {
  try {
    // Protect production database from being overwritten by stale visitor browser caches
    const isProduction = Boolean(process.env.RENDER || process.env.NODE_ENV === 'production');
    if (isProduction) {
      return res.json({ success: true, message: 'Production master database protected against browser override.' });
    }
    const body = req.body;
    if (body && typeof body === 'object') {
      let quizzesChanged = false;
      let configChanged = false;

      if (body.quizzes && typeof body.quizzes === 'object') {
        PERSISTED_QUIZZES = { ...PERSISTED_QUIZZES, ...body.quizzes };
        quizzesChanged = true;
      } else if (!body.appConfig && !body.localStorage) {
        PERSISTED_QUIZZES = { ...PERSISTED_QUIZZES, ...body };
        quizzesChanged = true;
      }

      if (body.appConfig && typeof body.appConfig === 'object') {
        APP_CONFIG = { ...APP_CONFIG, ...body.appConfig };
        configChanged = true;
      }

      if (body.localStorage && typeof body.localStorage === 'object') {
        if (!APP_CONFIG.clientStorage) APP_CONFIG.clientStorage = {};
        for (const [k, v] of Object.entries(body.localStorage)) {
          if (!k || k.startsWith('quizrun_supabase') || k === 'quizrun_local_updated_at') continue;
          if (APP_CONFIG.clientStorage[k] !== v) {
            APP_CONFIG.clientStorage[k] = v;
            configChanged = true;
          }
          if (k.startsWith('quizrun_data_')) {
            try {
              const parsed = typeof v === 'string' ? JSON.parse(v) : v;
              if (parsed && typeof parsed === 'object') {
                if (JSON.stringify(PERSISTED_QUIZZES[k]) !== JSON.stringify(parsed)) {
                  PERSISTED_QUIZZES[k] = parsed;
                  quizzesChanged = true;
                }
              }
            } catch (e) {}
          }
        }
      }

      if (quizzesChanged) {
        savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
      }
      if (configChanged) {
        APP_CONFIG.updatedAt = new Date().toISOString();
        savePersistedData(APP_CONFIG_PATH, APP_CONFIG);
        if (typeof io !== 'undefined' && io) {
          io.emit('config:updated', APP_CONFIG);
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Quizzes API] Error restoring quizzes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const rooms = {};

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getQuestionType(q) {
  if (!q) return 'mcq';
  if (q.type && ['mcq', 'ox', 'short'].includes(q.type)) {
    return q.type;
  }
  const validOpts = (q.options || []).filter(o => typeof o === 'string' && o.trim() !== '');
  if (validOpts.length === 0) {
    return 'short';
  }
  if (validOpts.length === 2) {
    return 'ox';
  }
  return 'mcq';
}

function getQuestionAnswer(q) {
  if (!q) return '';
  if (q.answer !== undefined && q.answer !== null && String(q.answer).trim() !== '') {
    return String(q.answer).trim();
  }
  if (q.correctAnswer !== undefined && q.correctAnswer !== null && String(q.correctAnswer).trim() !== '') {
    return String(q.correctAnswer).trim();
  }
  if (q.correctIndex !== undefined && q.options && q.options[q.correctIndex] !== undefined && q.options[q.correctIndex] !== null && String(q.options[q.correctIndex]).trim() !== '') {
    return String(q.options[q.correctIndex]).trim();
  }
  return '';
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit('tunnel:updated', { publicUrl: activeTunnelUrl, isVerifying: isTunnelVerifying, publicHostIp: publicHostIp });
  socket.emit('network:updated', { 
    ip: getLocalIP(),
    allIps: getAllLocalIPs(),
    publicUrl: activeTunnelUrl,
    isVerifying: isTunnelVerifying,
    publicHostIp: publicHostIp
  });

  socket.on('tunnel:restart', () => {
    console.log('[Tunnel] Manual dual-tunnel restart requested by client');
    restartAllTunnels();
  });

  socket.on('network:refresh', () => {
    console.log('[Network] Manual network refresh requested by client');
    lastDetectedIp = getLocalIP();
    broadcastNetworkUpdate();
    restartAllTunnels();
  });

  // --- COMMON EVENTS ---
  
  // --- REAL-TIME ROOM CHAT & LIVE REACTION EVENTS ---
  socket.on('chat:send', (data, callback) => {
    try {
      const { pin, nickname, text, fileUrl, fileName, fileSize, fileType, isNotice, isHelp } = data || {};
      const cleanPin = String(pin || '').trim();
      const room = rooms[cleanPin];
      if (!room) {
        if (callback) callback({ success: false, message: '방이 존재하지 않습니다.' });
        return;
      }

      if (!room.chatMessages) room.chatMessages = [];

      const { cleanText, wasFiltered } = sanitizeChatMessage(text || '');

      if (!cleanText && !fileUrl) {
        if (callback) callback({ success: false, message: '메시지 또는 파일을 입력해주세요.' });
        return;
      }

      const isHost = Boolean(socket.id === room.hostId || nickname === '진행자' || nickname === '호스트');

      const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        pin: cleanPin,
        sender: nickname || (isHost ? '진행자' : '참가자'),
        isHost,
        text: cleanText,
        wasFiltered,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileType: fileType || (fileUrl && fileUrl.match(/\.(png|jpe?g|gif|webp|svg)/i) ? 'image' : 'file'),
        isNotice: Boolean(isNotice && isHost),
        isHelp: Boolean(isHelp),
        createdAt: new Date().toISOString()
      };

      room.chatMessages.push(message);
      if (room.chatMessages.length > 300) {
        room.chatMessages.shift();
      }

      if (message.isNotice) {
        room.chatNotice = message;
        io.to(cleanPin).emit('chat:notice_updated', message);
      }

      io.to(cleanPin).emit('chat:message', message);
      if (callback) callback({ success: true, message });
    } catch (err) {
      console.error('[Chat Error]', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  socket.on('chat:reaction', ({ pin, nickname, emoji }) => {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return;
    io.to(cleanPin).emit('chat:live_reaction', {
      id: 'react_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      nickname: nickname || '참가자',
      emoji: emoji || '🔥',
      createdAt: Date.now()
    });
  });

  socket.on('chat:get_history', ({ pin }, callback) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin];
    if (callback) {
      callback({
        success: true,
        messages: room?.chatMessages || [],
        notice: room?.chatNotice || null
      });
    }
  });

  socket.on('chat:clear_notice', ({ pin }, callback) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin];
    if (room) {
      room.chatNotice = null;
      io.to(cleanPin).emit('chat:notice_updated', null);
    }
    if (callback) callback({ success: true });
  });

  socket.on('room:clientError', ({ pin, error, info }) => {
    console.error(`[CLIENT ERROR] Room: ${pin || 'N/A'}, User: ${socket.id}`);
    console.error(`Error: ${error}`);
    console.error(`Info: ${JSON.stringify(info)}`);
  });

  // --- HOST EVENTS ---
  socket.on('host:createRoom', async (data, callback) => {
    let pin = null;
    let isReused = false;

    // If host specifies a valid 6-digit PIN, honor it so QR code and screen PIN match exactly
    if (data && data.pin && /^\d{6}$/.test(String(data.pin).trim())) {
      pin = String(data.pin).trim();
      if (rooms[pin]) {
        isReused = true;
        if (rooms[pin].hostDisconnectTimer) {
          clearTimeout(rooms[pin].hostDisconnectTimer);
          delete rooms[pin].hostDisconnectTimer;
        }
      }
    } else {
      do {
        pin = generatePIN();
      } while (rooms[pin]);
    }

    let quiz = null;
    let isBuzzerMode = false;

    // Robust parsing of data
    if (typeof data === 'object') {
      if (data.mode === 'buzzer' || data.isBuzzerMode) isBuzzerMode = true;

      // Check if it's a direct quiz object or contained quiz data
      if (data.title && data.questions) {
        quiz = data;
        // If it looks like a topic-based quiz, persist it
        if (data.topicId && data.subId) {
          const key = `quizrun_data_${data.topicId}_${data.subId}`;
          PERSISTED_QUIZZES[key] = data;
          savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
        }
      } else if (data.quiz && data.quiz.title) {
        quiz = data.quiz;
        if (data.topicId && data.subId) {
            const key = `quizrun_data_${data.topicId}_${data.subId}`;
            PERSISTED_QUIZZES[key] = data.quiz;
            savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
        }
      } else if (data.quizId) {
        // Try persisted first, then fallback to MOCK
        if (data.subId) {
            const key = `quizrun_data_${data.quizId}_${data.subId}`;
            quiz = PERSISTED_QUIZZES[key] || MOCK_QUIZZES[data.quizId] || MOCK_QUIZZES['general'];
        } else {
            quiz = MOCK_QUIZZES[data.quizId] || MOCK_QUIZZES['general'];
        }
      }
    } else if (typeof data === 'string') {
      quiz = MOCK_QUIZZES[data] || MOCK_QUIZZES['general'];
    }

    // Final fallback
    if (!quiz) {
      quiz = MOCK_QUIZZES['general'];
    }

    // Clone the quiz and filter questions if needed
    let finalQuiz = JSON.parse(JSON.stringify(quiz));
    if (!finalQuiz.questions || !Array.isArray(finalQuiz.questions)) {
      finalQuiz.questions = [
        ...(finalQuiz.short || []).map(q => ({ ...q, type: 'short' })),
        ...(finalQuiz.mcq || []).map(q => ({ ...q, type: 'mcq' })),
        ...(finalQuiz.ox || []).map(q => ({ ...q, type: 'ox' }))
      ];
    }
    let quizType = finalQuiz.quizType || getQuestionType(finalQuiz.questions[0]);

    if (data.mode === 'mcq_only') {
        finalQuiz.questions = finalQuiz.questions.filter(q => q.options && q.options.some(opt => opt && opt.trim() !== ''));
        isBuzzerMode = false;
        quizType = 'mcq';
    } else if (data.mode === 'ox_only') {
        finalQuiz.questions = finalQuiz.questions.filter(q => q.type === 'ox' || (q.options && q.options.length === 2));
        isBuzzerMode = false;
        quizType = 'ox';
    } else if (data.mode === 'short_only') {
        finalQuiz.questions = finalQuiz.questions.filter(q => q.answer && (!q.options || q.options.every(opt => !opt || opt.trim() === '')));
        isBuzzerMode = false;
        quizType = 'short';
    } else if (data.mode === 'buzzer') {
        isBuzzerMode = true;
    }

    finalQuiz.quizType = quizType;

    // Shuffle questions if random orderType is requested
    if (data.orderType === 'random') {
        finalQuiz.questions = finalQuiz.questions.sort(() => Math.random() - 0.5);
    }

    // Guard: if filtered questions is empty for a specific mode, reject
    if (finalQuiz.questions.length === 0 && data.mode && data.mode !== 'buzzer' && data.mode !== 'normal') {
        const modeLabel = data.mode === 'ox_only' ? 'OX' : data.mode === 'mcq_only' ? '객관식' : '주관식';
        if (callback) callback({ success: false, message: `이 퀴즈에 ${modeLabel} 문제가 없습니다. 먼저 문제를 만들어주세요!` });
        return;
    }

    const isGameMode = data.mode === 'game' || Boolean(data.quizId && !data.quizId.startsWith('custom_') && !MOCK_QUIZZES[data.quizId]);
    const gameId = isGameMode ? data.quizId : null;
    const initialRoomState = isGameMode ? 'game_active' : 'lobby';

    console.log(`Setting up room: Pin=${pin} (reused=${isReused}), Mode=${data.mode}, isGameMode=${isGameMode}, gameId=${gameId}, Questions=${finalQuiz.questions.length}, quizType=${quizType}`);

    if (isReused) {
      if (rooms[pin].hostDisconnectTimer) {
        clearTimeout(rooms[pin].hostDisconnectTimer);
        delete rooms[pin].hostDisconnectTimer;
      }
      rooms[pin].hostId = socket.id;
      rooms[pin].quiz = finalQuiz;
      rooms[pin].state = initialRoomState;
      rooms[pin].isGame = isGameMode;
      rooms[pin].gameId = gameId;
      rooms[pin].currentQuestionIndex = 0;
      rooms[pin].totalPoints = finalQuiz.questions.reduce((sum, q) => sum + (q.points || 10), 0);
      rooms[pin].isBuzzerMode = isBuzzerMode;
      rooms[pin].buzzedGroupId = null;
      rooms[pin].buzzedParticipantId = null;
      rooms[pin].firstCorrect = null;
      // Reset round flags for participants while preserving nickname, score, groupId
      rooms[pin].participants.forEach(p => {
        p.hasAnswered = false;
        p.currentAnswer = null;
        p.isCorrect = false;
        p.gameBaseScore = p.score || 0;
        p.officialRoundScore = 0;
        p.hasFinishedOfficialRound = false;
      });
    } else {
      rooms[pin] = {
        hostId: socket.id,
        quiz: finalQuiz,
        participants: [],
        preservedParticipants: {},
        state: initialRoomState,
        isGame: isGameMode,
        gameId: gameId,
        currentQuestionIndex: 0,
        totalPoints: finalQuiz.questions.reduce((sum, q) => sum + (q.points || 10), 0),
        isBuzzerMode: isBuzzerMode,
        buzzedGroupId: null,
        buzzedParticipantId: null,
        groupScores: {},
        firstCorrect: null
      };
    }

    socket.join(pin);
    console.log(`Room ${pin} details: participants=${rooms[pin].participants.length}, state=${rooms[pin].state}, isGame=${rooms[pin].isGame}`);

    // If room has participants, immediately notify them of updated room mode/quiz/game
    if (rooms[pin].participants.length > 0) {
      socket.emit('host:participantsUpdated', rooms[pin].participants);
      io.to(pin).emit('room:stateUpdate', {
        state: initialRoomState === 'lobby' ? 'waiting' : initialRoomState,
        isBuzzerMode: isBuzzerMode,
        quizType: quizType,
        isGame: isGameMode,
        gameId: gameId
      });
      if (isGameMode && initialRoomState === 'game_active') {
        io.to(pin).emit('room:message', {
          event: 'game:start',
          payload: { gameId }
        });
      }
    }

    const publicUrl = activeTunnelUrl || '';
    if (callback) callback({
      success: true,
      pin,
      title: quiz.title,
      ip: getLocalIP(),
      publicUrl: publicUrl,
      isBuzzerMode: isBuzzerMode,
      quizType: quizType, // Explicitly tell participant the quiz type
      totalPoints: rooms[pin]?.totalPoints || 0,
      participants: rooms[pin].participants,
      questions: rooms[pin]?.quiz?.questions || [],
      isGame: isGameMode,
      gameId: gameId,
      roomState: initialRoomState
    });
  });

  // Screen/Sub-Monitor join handler
  socket.on('screen:joinRoom', ({ pin }, callback) => {
    if (pin) {
      const cleanPin = String(pin).trim();
      const isAlreadyInRoom = socket.rooms.has(cleanPin);
      socket.join(cleanPin);
      if (!isAlreadyInRoom) {
        console.log(`[ScreenView] Socket ${socket.id} joined screen room ${cleanPin}`);
      }
      const room = rooms[cleanPin];
      if (room) {
        socket.emit('host:participantsUpdated', room.participants);
        if (callback) callback({ success: true, participants: room.participants, state: room.state });
      } else {
        if (callback) callback({ success: true, participants: [] });
      }
    }
  });

  // Generic room join handler
  socket.on('room:join', ({ pin }, callback) => {
    if (pin) {
      const cleanPin = String(pin).trim();
      socket.join(cleanPin);
      const room = rooms[cleanPin];
      if (room) {
        socket.emit('host:participantsUpdated', room.participants);
        if (callback) callback({ success: true, participants: room.participants });
      } else {
        if (callback) callback({ success: true, participants: [] });
      }
    }
  });

  socket.on('host:updateQuestionPoints', ({ pin, points }) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
        const currentQ = room.quiz.questions[room.currentQuestionIndex];
        const oldPoints = currentQ.points || 10;
        currentQ.points = points;
        
        // Recalculate total points
        room.totalPoints = room.quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0);
        
        const qType = getQuestionType(currentQ);
        const qAnswer = getQuestionAnswer(currentQ);

        // Broadcast update to all
        io.to(pin).emit('room:stateUpdate', {
            state: room.state,
            question: currentQ.text || currentQ.question || '',
            mediaUrl: currentQ.mediaUrl || '',
            mediaUrl2: currentQ.mediaUrl2 || '',
            diffSpots: currentQ.diffSpots || [],
            timeLimit: currentQ.timeLimit || 60,
            isSpotDiff: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2),
            mediaType: currentQ.mediaType || '',
            mediaName: currentQ.mediaName || '',
            mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
            autoplay: currentQ.autoplay ?? true,
            showChosung: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2) ? false : (currentQ.showChosung ?? true),
            options: currentQ.options || [],
            correctIndex: currentQ.correctIndex,
            correctAnswer: qAnswer,
            explanation: currentQ.explanation || '',
            currentQuestionIndex: room.currentQuestionIndex,
            totalQuestions: room.quiz.questions.length,
            points: points,
            totalPoints: room.totalPoints,
            isBuzzerMode: room.isBuzzerMode,
            quizType: qType
        });
    }
  });

  socket.on('host:startGame', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.state = 'question';
      room.currentQuestionIndex = 0;
      room.buzzedGroupId = null;
      room.buzzedParticipantId = null;
      room.participants.forEach(p => { p.hasAnswered = false; p.currentAnswer = null; p.isCorrect = false; });

      const currentQ = room.quiz.questions[0];
      if (!currentQ) return; // Guard: no questions in this room
      const qType = getQuestionType(currentQ);
      const qAnswer = getQuestionAnswer(currentQ);

      io.to(pin).emit('room:stateUpdate', {
        state: 'question',
        question: currentQ.text || currentQ.question || '',
        mediaUrl: currentQ.mediaUrl || '',
        mediaUrl2: currentQ.mediaUrl2 || '',
        diffSpots: currentQ.diffSpots || [],
        timeLimit: currentQ.timeLimit || 60,
        isSpotDiff: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2),
        mediaType: currentQ.mediaType || '',
        mediaName: currentQ.mediaName || '',
        mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
        autoplay: currentQ.autoplay ?? true,
        showChosung: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2) ? false : (currentQ.showChosung ?? true),
        options: currentQ.options || [],
        correctIndex: currentQ.correctIndex,
        correctAnswer: qAnswer,
        explanation: currentQ.explanation || '',
        currentQuestionIndex: 0,
        totalQuestions: room.quiz.questions.length,
        points: currentQ.points || 10,
        totalPoints: room.totalPoints,
        isBuzzerMode: room.isBuzzerMode,
        quizType: qType,
        buzzedGroupId: null
      });
    }
  });

  socket.on('host:nextQuestion', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.currentQuestionIndex++;
      room.buzzedGroupId = null;
      room.buzzedParticipantId = null;
      room.firstCorrect = null;

      if (room.currentQuestionIndex >= room.quiz.questions.length) {
        room.state = 'leaderboard';
        const leaderboard = [...room.participants].sort((a, b) => b.score - a.score);
        io.to(pin).emit('room:stateUpdate', { state: 'final_leaderboard', leaderboard });
        return;
      }

      room.state = 'question';
      room.participants.forEach(p => { p.hasAnswered = false; p.currentAnswer = null; p.isCorrect = false; });

      const currentQ = room.quiz.questions[room.currentQuestionIndex];
      const qType = getQuestionType(currentQ);
      const qAnswer = getQuestionAnswer(currentQ);

      io.to(pin).emit('room:stateUpdate', {
        state: 'question',
        question: currentQ.text || currentQ.question || '',
        mediaUrl: currentQ.mediaUrl || '',
        mediaUrl2: currentQ.mediaUrl2 || '',
        diffSpots: currentQ.diffSpots || [],
        timeLimit: currentQ.timeLimit || 60,
        isSpotDiff: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2),
        mediaType: currentQ.mediaType || '',
        mediaName: currentQ.mediaName || '',
        mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
        autoplay: currentQ.autoplay ?? true,
        showChosung: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2) ? false : (currentQ.showChosung ?? true),
        options: currentQ.options || [],
        correctIndex: currentQ.correctIndex, // Host will use this, participants should ignore until reveal
        correctAnswer: qAnswer,
        explanation: currentQ.explanation || '',
        currentQuestionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        points: currentQ.points || 10,
        totalPoints: room.totalPoints,
        isBuzzerMode: room.isBuzzerMode,
        quizType: qType,
        buzzedGroupId: null
      });
      console.log(`Room ${pin} next question`);
    }
  });

  socket.on('host:prevQuestion', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      if (room.currentQuestionIndex <= 0) return;
      room.currentQuestionIndex--;
      room.buzzedGroupId = null;
      room.buzzedParticipantId = null;
      room.firstCorrect = null;

      room.state = 'question';
      room.participants.forEach(p => { p.hasAnswered = false; p.currentAnswer = null; p.isCorrect = false; });

      const currentQ = room.quiz.questions[room.currentQuestionIndex];
      const qType = getQuestionType(currentQ);
      const qAnswer = getQuestionAnswer(currentQ);

      io.to(pin).emit('room:stateUpdate', {
        state: 'question',
        question: currentQ.text || currentQ.question || '',
        mediaUrl: currentQ.mediaUrl || '',
        mediaUrl2: currentQ.mediaUrl2 || '',
        diffSpots: currentQ.diffSpots || [],
        timeLimit: currentQ.timeLimit || 60,
        isSpotDiff: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2),
        mediaType: currentQ.mediaType || '',
        mediaName: currentQ.mediaName || '',
        mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
        autoplay: currentQ.autoplay ?? true,
        showChosung: Boolean(currentQ.isSpotDiff || currentQ.mediaUrl2) ? false : (currentQ.showChosung ?? true),
        options: currentQ.options || [],
        correctIndex: currentQ.correctIndex,
        correctAnswer: qAnswer,
        explanation: currentQ.explanation || '',
        currentQuestionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        points: currentQ.points || 10,
        totalPoints: room.totalPoints,
        isBuzzerMode: room.isBuzzerMode,
        quizType: qType,
        buzzedGroupId: null
      });
      console.log(`Room ${pin} prev question: index ${room.currentQuestionIndex}`);
    }
  });

  socket.on('host:showResults', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.state = 'leaderboard';
      const leaderboard = [...room.participants].sort((a, b) => b.score - a.score);
      const currentQ = room.quiz.questions[room.currentQuestionIndex];

      io.to(pin).emit('room:stateUpdate', {
        state: 'leaderboard',
        leaderboard,
        correctIndex: currentQ.correctIndex,
        correctAnswer: getQuestionAnswer(currentQ),
        explanation: currentQ.explanation,
        currentQuestionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        isBuzzerMode: room.isBuzzerMode,
        quizType: getQuestionType(currentQ)
      });
    }
  });


  // Buzzer Mode: Host judges if the answer is correct or incorrect
  socket.on('host:buzzerJudge', ({ pin, isCorrect }, callback) => {
    const room = rooms[pin];
    if (!room || room.hostId !== socket.id) return;

    const buzzedGroupId = room.buzzedGroupId;
    const buzzedParticipantId = room.buzzedParticipantId;
    const participant = room.participants.find(p => p.id === buzzedParticipantId);

    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const awardPoints = currentQ.points || 10;
    const penaltyPoints = 10;

    if (isCorrect) {
      if (participant) participant.score += awardPoints;
      if (buzzedGroupId) {
        if (!room.groupScores[buzzedGroupId]) room.groupScores[buzzedGroupId] = 0;
        room.groupScores[buzzedGroupId] += awardPoints;
      }
    } else {
      if (participant) participant.score -= penaltyPoints;
      if (buzzedGroupId) {
        if (!room.groupScores[buzzedGroupId]) room.groupScores[buzzedGroupId] = 0;
        room.groupScores[buzzedGroupId] -= penaltyPoints;
      }
    }

    // Reset buzzed state
    room.buzzedGroupId = null;
    room.buzzedParticipantId = null;

    // Broadcast updated participants to host and screen
    const cleanPin = String(pin || '').trim();
    if (room.hostId) io.to(room.hostId).emit('host:participantsUpdated', room.participants);
    io.to(cleanPin).emit('host:participantsUpdated', room.participants);

    // Broadcast judge result to all in the room
    io.to(cleanPin).emit('room:buzzerJudge', {
      isCorrect,
      groupId: buzzedGroupId,
      participantId: buzzedParticipantId,
      groupScores: { ...room.groupScores }
    });

    if (callback) callback({ success: true });
    console.log(`Room ${pin} buzzer judge: Group ${buzzedGroupId} -> ${isCorrect ? 'CORRECT' : 'INCORRECT'}. Scores:`, room.groupScores);
  });

  socket.on('participant:joinRoom', ({ pin, nickname, clientId }, callback) => {
    const cleanPin = String(pin || '').trim();
    let room = rooms[cleanPin] || rooms[pin];
    if (!room) {
      // Auto-fallback: if pin is a valid 6-digit string, auto-initialize the room so participants are not blocked
      if (cleanPin && /^\d{6}$/.test(cleanPin)) {
        rooms[cleanPin] = {
          hostId: null,
          quiz: MOCK_QUIZZES['general'],
          participants: [],
          preservedParticipants: {},
          state: 'lobby',
          currentQuestionIndex: 0,
          totalPoints: 100,
          isBuzzerMode: false,
          buzzedGroupId: null,
          buzzedParticipantId: null,
          groupScores: {},
          firstCorrect: null
        };
        room = rooms[cleanPin];
        console.log(`[Auto-Create] Created room ${cleanPin} on participant join.`);
      } else {
        if (callback) callback({ success: false, message: '방을 찾을 수 없습니다. PIN 번호를 확인해주세요.' });
        return;
      }
    }

    const cleanNickname = String(nickname || '참가자').trim() || '참가자';
    const effectiveClientId = clientId || ('c_' + socket.id);

    // 1. Identify by clientId FIRST (reconnection / page refresh of the same device)
    let existingP = null;
    if (clientId) {
      existingP = room.participants.find(p => p.clientId === clientId);
    }
    // Reconnection fallback: match by cleanNickname
    if (!existingP && cleanNickname) {
      existingP = room.participants.find(p => p.nickname && p.nickname.toLowerCase() === cleanNickname.toLowerCase());
      if (existingP) {
        existingP.clientId = effectiveClientId;
      }
    }

    if (existingP) {
      if (existingP.disconnectTimer) {
        clearTimeout(existingP.disconnectTimer);
        delete existingP.disconnectTimer;
      }
      existingP.id = socket.id;
      // If user provided a different non-colliding nickname upon reconnect, allow update
      if (cleanNickname && cleanNickname !== existingP.nickname) {
        const nickTaken = room.participants.some(p => p !== existingP && p.nickname.toLowerCase() === cleanNickname.toLowerCase());
        if (!nickTaken) {
          existingP.nickname = cleanNickname;
        }
      }
      socket.join(cleanPin);
      broadcastParticipants(cleanPin);
      if (room.hostId) io.to(room.hostId).emit('stock_game:participant_joined', { participants: room.participants, participant: existingP });
      const currentQ = room.quiz?.questions?.[room.currentQuestionIndex];
      const isGameActive = Boolean(room.isGame || room.gameId === 'stock_game' || room.stockGameData || room.state === 'game_active');
      const resolvedGameId = room.gameId || (isGameActive ? 'stock_game' : null);
      if (callback) callback({ 
        success: true, 
        nickname: existingP.nickname,
        roomState: isGameActive ? 'game_active' : (room.state === 'lobby' ? 'waiting' : room.state), 
        isBuzzerMode: room.isBuzzerMode,
        quizType: room.quiz?.quizType || 'mcq',
        isGame: isGameActive,
        gameId: resolvedGameId,
        groupId: existingP.groupId || null,
        myScore: existingP.score || 0,
        question: currentQ ? currentQ.text : '',
        options: currentQ ? currentQ.options : [],
        currentQuestionIndex: room.currentQuestionIndex || 0,
        totalQuestions: room.quiz?.questions?.length || 0,
        points: currentQ?.points || 10,
        mediaUrl: currentQ?.mediaUrl || '',
        mediaUrl2: currentQ?.mediaUrl2 || '',
        diffSpots: currentQ?.diffSpots || [],
        timeLimit: currentQ?.timeLimit || 60,
        isSpotDiff: Boolean(currentQ?.isSpotDiff || currentQ?.mediaUrl2),
        mediaType: currentQ?.mediaType || '',
        mediaName: currentQ?.mediaName || '',
        mediaDisplayMode: currentQ?.mediaDisplayMode || 'audio',
        autoplay: currentQ?.autoplay ?? true,
        showChosung: Boolean(currentQ?.isSpotDiff || currentQ?.mediaUrl2) ? false : (currentQ?.showChosung ?? true)
      });
      if (isGameActive) {
        socket.emit('room:message', {
          event: 'game:start',
          payload: { gameId: resolvedGameId }
        });
        if (resolvedGameId === 'stock_game' && room.stockGameData) {
          socket.emit('stock_game:state_sync', room.stockGameData);
        }
      }
      return;
    }

    // 2. Mid-game join allowed: participants joining or reconnecting mid-game immediately receive active state
    const currentQ = room.quiz?.questions?.[room.currentQuestionIndex];

    // 3. Ensure nickname is 100% unique (Never overwrite or steal another participant's session)
    let uniqueNickname = cleanNickname;
    let counter = 2;
    while (room.participants.some(p => p.nickname.toLowerCase() === uniqueNickname.toLowerCase())) {
      uniqueNickname = `${cleanNickname} #${counter}`;
      counter++;
    }

    const newParticipant = {
      id: socket.id,
      clientId: effectiveClientId,
      nickname: uniqueNickname,
      score: 0,
      hasAnswered: false,
      currentAnswer: null,
      isCorrect: false,
      groupId: null
    };

    room.participants.push(newParticipant);
    socket.join(cleanPin);

    broadcastParticipants(cleanPin);
    if (room.hostId) io.to(room.hostId).emit('stock_game:participant_joined', { participants: room.participants, participant: newParticipant });
    const isGameActiveNew = Boolean(room.isGame || room.gameId === 'stock_game' || room.stockGameData || room.state === 'game_active');
    const resolvedGameIdNew = room.gameId || (isGameActiveNew ? 'stock_game' : null);
    if (callback) callback({ 
      success: true, 
      nickname: uniqueNickname,
      roomState: isGameActiveNew ? 'game_active' : (room.state === 'lobby' ? 'waiting' : room.state), 
      isBuzzerMode: room.isBuzzerMode,
      quizType: room.quiz?.quizType || 'mcq',
      isGame: isGameActiveNew,
      gameId: resolvedGameIdNew,
      groupId: null,
      myScore: 0,
      question: currentQ ? currentQ.text : '',
      options: currentQ ? currentQ.options : [],
      currentQuestionIndex: room.currentQuestionIndex || 0,
      totalQuestions: room.quiz?.questions?.length || 0,
      points: currentQ?.points || 10,
      mediaUrl: currentQ?.mediaUrl || '',
      mediaUrl2: currentQ?.mediaUrl2 || '',
      diffSpots: currentQ?.diffSpots || [],
      timeLimit: currentQ?.timeLimit || 60,
      isSpotDiff: Boolean(currentQ?.isSpotDiff || currentQ?.mediaUrl2),
      mediaType: currentQ?.mediaType || '',
      mediaName: currentQ?.mediaName || '',
      mediaDisplayMode: currentQ?.mediaDisplayMode || 'audio',
      autoplay: currentQ?.autoplay ?? true,
      showChosung: Boolean(currentQ?.isSpotDiff || currentQ?.mediaUrl2) ? false : (currentQ?.showChosung ?? true)
    });
    if (isGameActiveNew) {
      socket.emit('room:message', {
        event: 'game:start',
        payload: { gameId: resolvedGameIdNew }
      });
      if (resolvedGameIdNew === 'stock_game' && room.stockGameData) {
        socket.emit('stock_game:state_sync', room.stockGameData);
      }
    }
  });

  socket.on('quiz:getQuestions', ({ topicId, subId }, callback) => {
    const key = `quizrun_data_${topicId}_${subId}`;
    const quiz = PERSISTED_QUIZZES[key];
    if (callback) callback({ success: !!quiz, data: quiz });
  });

  socket.on('quiz:saveQuestions', ({ topicId, subId, data }, callback) => {
    const key = `quizrun_data_${topicId}_${subId}`;
    PERSISTED_QUIZZES[key] = data;
    savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
    console.log(`Saved quiz data for ${key}`);
    if (callback) callback({ success: true });
  });

  // --- APP CONFIG EVENTS ---
  socket.on('config:load', (callback) => {
    if (callback) callback({ success: true, config: APP_CONFIG });
  });

  socket.on('config:save', (newConfig, callback) => {
    APP_CONFIG = { ...APP_CONFIG, ...newConfig };
    savePersistedData(APP_CONFIG_PATH, APP_CONFIG);
    console.log('Saved app configuration');
    // Broadcast to others so they can sync in real-time if open
    socket.broadcast.emit('config:updated', APP_CONFIG);
    if (callback) callback({ success: true });
  });

  socket.on('quiz:getAllCounts', (callback) => {
    const counts = {};
    for (const [key, quiz] of Object.entries(PERSISTED_QUIZZES)) {
      counts[key] = (quiz.mcq || []).length + (quiz.short || []).length + (quiz.ox || []).length;
    }
    if (callback) callback({ success: true, counts });
  });

  socket.on('participant:selectGroup', ({ pin, groupId }) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin] || rooms[pin];
    if (room) {
      const p = room.participants.find(p => p.id === socket.id);
      if (p) {
        p.groupId = groupId;
        if (room.hostId) io.to(room.hostId).emit('host:participantsUpdated', room.participants);
        io.to(cleanPin).emit('host:participantsUpdated', room.participants);
      }
    }
  });

  socket.on('participant:pressBuzzer', ({ pin }) => {
    const rPin = String(pin);
    const room = rooms[rPin];
    if (room && room.state === 'question' && !room.buzzedGroupId) {
      const p = room.participants.find(p => p.id === socket.id);
      if (p) {
        room.buzzedGroupId = p.groupId;
        room.buzzedParticipantId = socket.id;
        io.to(pin).emit('room:buzzed', { groupId: p.groupId, nickname: p.nickname, participantId: socket.id });
        console.log(`User ${p.nickname} (Group ${p.groupId || 'Individual'}) buzzed in room ${pin}`);
      }
    }
  });

  socket.on('participant:submitAnswer', ({ pin, answerIndex, textAnswer }, callback) => {
    const rPin = String(pin);
    const room = rooms[rPin];
    if (room && room.state === 'question') {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && !participant.hasAnswered) {
        participant.hasAnswered = true;
        const currentQ = room.quiz.questions[room.currentQuestionIndex];
        const quizType = (currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '')) ? 'mcq' : 'short';
        
        let isCorrect = false;
        if (quizType === 'short') {
            participant.currentAnswer = textAnswer;
            isCorrect = (String(textAnswer).trim().toLowerCase() === String(currentQ.answer).trim().toLowerCase());
        } else {
            participant.currentAnswer = answerIndex;
            isCorrect = (answerIndex === currentQ.correctIndex);
        }

        const awardPoints = currentQ.points || 10;
        participant.isCorrect = isCorrect;
        
        if (isCorrect) {
            participant.score += awardPoints;
            const gid = participant.groupId;
            if (gid) {
              if (!room.groupScores[gid]) room.groupScores[gid] = 0;
              room.groupScores[gid] += awardPoints;
            }

            // Track first correct answer for Short Answer competition
            if (!room.firstCorrect) {
              room.firstCorrect = {
                id: socket.id,
                nickname: participant.nickname,
                groupId: participant.groupId
              };
              io.to(room.hostId).emit('room:firstCorrect', room.firstCorrect);
              console.log(`[FIRST] Room ${pin}: ${participant.nickname} got the first correct answer!`);

              // AUTO-REVEAL for Short Answer mode
              if (quizType === 'short') {
                  console.log(`[AUTO-REVEAL] Room ${pin}: First correct answer by ${participant.nickname}`);
                  room.state = 'leaderboard';
                  const leaderboard = [...room.participants].sort((a, b) => b.score - a.score);
                  
                  // Use a small delay to ensure other events (like score update) are processed
                  setTimeout(() => {
                      io.to(pin).emit('room:stateUpdate', {
                        state: 'leaderboard',
                        leaderboard,
                        correctIndex: currentQ.correctIndex,
                        correctAnswer: currentQ.answer,
                        explanation: currentQ.explanation,
                        isBuzzerMode: room.isBuzzerMode,
                        quizType: 'short',
                        autoRevealed: true,
                        winner: room.firstCorrect
                      });
                  }, 100);
              }
            }
        }

        io.to(room.hostId).emit('host:participantAnswered', {
          totalParticipants: room.participants.length,
          answeredCount: room.participants.filter(p => p.hasAnswered).length,
          groupScores: { ...room.groupScores }
        });
        io.to(room.hostId).emit('host:participantsUpdated', room.participants);
        io.to(pin).emit('host:participantsUpdated', room.participants);

        // Immediate feedback for participant
        if (callback) callback({ 
          success: true, 
          isCorrect, 
          correctIndex: currentQ.correctIndex,
          correctAnswer: currentQ.answer,
          explanation: currentQ.explanation
        });
      }
    }
  });

  // --- MULTIPLAYER GAME GENERIC MESSAGES ---
  socket.on('room:message', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      const room = rooms[cleanPin] || rooms[data.pin];
      // Track game lifecycle for score accumulation
      if (room && data.event === 'game:start') {
        room.isGame = true;
        room.gameId = data.payload?.gameId || room.gameId;
        room.state = 'game_active';
        if (room.participants) {
          room.participants.forEach(p => {
            p.gameBaseScore = p.score || 0;
            p.officialRoundScore = 0;
            p.hasFinishedOfficialRound = false;
          });
        }
        io.to(cleanPin).emit('room:stateUpdate', {
          state: 'game_active',
          isGame: true,
          gameId: room.gameId,
          participants: room.participants,
          leaderboard: [...room.participants].sort((a, b) => b.score - a.score)
        });
        if (room.gameId === 'omok' || room.gameId === 'samok') {
          setupSamokTournament(cleanPin, room);
        }
      }
      if (room && (data.event === 'game:terminate' || data.event === 'game:catch_mind_terminate')) {
        room.isGame = false;
        room.gameId = null;
        room.state = 'lobby';
        if (room.participants) {
          room.participants.forEach(p => {
            p.gameBaseScore = p.score || 0;
            p.hasFinishedOfficialRound = false;
          });
        }
        delete room.samokTournament;
        io.to(cleanPin).emit('room:stateUpdate', {
          state: 'lobby',
          isGame: false,
          gameId: null,
          participants: room.participants,
          leaderboard: [...room.participants].sort((a, b) => b.score - a.score)
        });
      }
      if (room && data.event === 'game:player_stream' && data.payload) {
        const { nickname, score, roundScore, isPractice, isFinished } = data.payload;
        if (nickname) {
          const p = room.participants?.find(part => part.nickname === nickname || part.id === socket.id);
          if (p) {
            if (p.gameBaseScore === undefined) {
              p.gameBaseScore = p.score || 0;
            }

            // If participant is playing in practice mode or already officially finished, do NOT alter official cumulative score
            if (isPractice || p.hasFinishedOfficialRound) {
              // Score is safely preserved at the official finish result
            } else {
              // Official game run:
              const roundPts = typeof roundScore === 'number' ? roundScore : (typeof score === 'number' ? score : 0);
              p.officialRoundScore = roundPts;
              const newScore = (p.gameBaseScore || 0) + roundPts;

              if (isFinished) {
                p.hasFinishedOfficialRound = true;
              }

              if (p.score !== newScore) {
                p.score = newScore;
                broadcastParticipants(cleanPin);
              }
            }
          }
        }
      }
      const isHostOnlyStockEvent = data.event && [
        'stock_game:execute_order',
        'stock_game:predict',
        'stock_game:vip_hint_selected',
        'stock_game:participant_activity',
        'stock_game:request_sync'
      ].includes(data.event);

      if (isHostOnlyStockEvent) {
        if (room && room.hostId) {
          io.to(room.hostId).emit('room:message', {
            sender: socket.id,
            event: data.event,
            payload: data.payload
          });
          io.to(room.hostId).emit(data.event, data.payload || data);
        }
      } else {
        io.to(cleanPin).emit('room:message', {
          sender: socket.id,
          event: data.event,
          payload: data.payload
        });
        if (data.event && data.event.startsWith('stock_game:')) {
          io.to(cleanPin).emit(data.event, data.payload || data);
        }
      }
    }
  });

  // --- STOCK GAME DIRECT SOCKET RELAYS (Relayed cleanly to room PIN without duplicate payload flooding) ---
  socket.on('stock_game:execute_order', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      io.to(cleanPin).emit('stock_game:execute_order', data);
    }
  });

  socket.on('stock_game:predict', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      io.to(cleanPin).emit('stock_game:predict', data);
    }
  });

  socket.on('stock_game:vip_hint_selected', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      io.to(cleanPin).emit('stock_game:vip_hint_selected', data);
    }
  });

  socket.on('stock_game:participant_activity', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      io.to(cleanPin).emit('stock_game:participant_activity', data);
    }
  });

  socket.on('stock_game:request_sync', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      io.to(cleanPin).emit('stock_game:request_sync', data);
    }
  });

  socket.on('stock_game:state_sync', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      const room = rooms[cleanPin] || rooms[data.pin];
      if (room) {
        room.hostId = socket.id;
        room.isGame = true;
        room.gameId = 'stock_game';
        room.state = 'game_active';
        room.stockGameData = data;
      }
      io.to(cleanPin).emit('stock_game:state_sync', data);
    }
  });

  socket.on('room:stateUpdate', (data) => {
    if (data && data.pin) {
      const cleanPin = String(data.pin).trim();
      const room = rooms[cleanPin] || rooms[data.pin];
      if (room) {
        if (data.state) room.state = data.state;
        if (data.isGame !== undefined) room.isGame = data.isGame;
        if (data.gameId !== undefined) room.gameId = data.gameId;
      }
      io.to(cleanPin).emit('room:stateUpdate', data);
    }
  });

  // --- HOST DIRECT SCORE ADJUSTMENT ---
  socket.on('host:adjustScore', ({ pin, nickname, delta, exactScore, amount }) => {
    const cleanPin = pin ? String(pin).trim() : '';
    const room = cleanPin ? (rooms[cleanPin] || rooms[pin]) : null;
    if (room) {
      if (!room.hostId) room.hostId = socket.id;
      const cleanNick = String(nickname || '').trim();
      const p = room.participants.find(p => String(p.nickname || '').trim() === cleanNick || String(p.id || '').trim() === cleanNick);
      if (p) {
        if (typeof exactScore === 'number') {
          p.score = exactScore;
        } else {
          const deltaVal = typeof delta === 'number' ? delta : (typeof amount === 'number' ? amount : null);
          if (deltaVal !== null) {
            p.score += deltaVal;
          }
        }
        if (!room.preservedParticipants) room.preservedParticipants = {};
        const pNorm = String(p.nickname || '').trim().toLowerCase();
        const pSnap = {
          nickname: p.nickname,
          clientId: p.clientId,
          score: p.score || 0,
          groupId: p.groupId || null,
          gameBaseScore: p.gameBaseScore || 0,
          officialRoundScore: p.officialRoundScore || 0,
          hasFinishedOfficialRound: p.hasFinishedOfficialRound || false,
          lastActive: Date.now()
        };
        if (pNorm) room.preservedParticipants[pNorm] = pSnap;
        if (p.clientId) room.preservedParticipants[p.clientId] = pSnap;
        io.to(cleanPin).emit('host:participantsUpdated', room.participants);
        const resolvedState = room.isGame ? (room.state || 'game_active') : (room.state === 'lobby' ? 'waiting' : room.state);
        io.to(cleanPin).emit('room:stateUpdate', {
          state: resolvedState,
          isGame: room.isGame || false,
          gameId: room.gameId || null,
          participants: room.participants,
          leaderboard: [...room.participants].sort((a, b) => b.score - a.score)
        });
      }
    }
  });

  socket.on('host:resetScores', ({ pin }) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.participants.forEach(p => { p.score = 0; });
      room.groupScores = {};
      io.to(pin).emit('host:participantsUpdated', room.participants);
      const resolvedState = room.isGame ? (room.state || 'game_active') : (room.state === 'lobby' ? 'waiting' : room.state);
      io.to(pin).emit('room:stateUpdate', {
        state: resolvedState,
        isGame: room.isGame || false,
        gameId: room.gameId || null,
        participants: room.participants,
        leaderboard: [...room.participants].sort((a, b) => b.score - a.score)
      });
    }
  });

    // --- END CURRENT GAME ONLY (Preserves participants and their cumulative scores in waiting lobby) ---
  socket.on('host:endCurrentGame', ({ pin }, callback) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin] || (pin ? rooms[pin] : null);
    if (room) {
      room.isGame = false;
      room.gameId = null;
      room.state = 'lobby';
      // Reset temporary in-game round flags, but PRESERVE participants and their scores!
      if (room.participants) {
        room.participants.forEach(p => {
          p.hasAnswered = false;
          p.currentAnswer = null;
          p.isCorrect = false;
          p.hasFinishedOfficialRound = false;
          p.officialRoundScore = 0;
          // p.score is strictly preserved!
        });
      }
      delete room.samokTournament;
      io.to(cleanPin).emit('room:stateUpdate', {
        state: 'lobby',
        isGame: false,
        gameId: null,
        participants: room.participants,
        leaderboard: [...room.participants].sort((a, b) => (b.score || 0) - (a.score || 0))
      });
      io.to(cleanPin).emit('room:message', {
        event: 'game:terminate',
        payload: { participants: room.participants }
      });
      console.log(`[Game End] Host ended current game in room ${cleanPin}. Participants and scores preserved in lobby.`);
    }
    if (callback) callback({ success: true });
  });

  // --- SHOW FINAL LEADERBOARD (Broadcasts final winner podium to all participants) ---
  socket.on('host:showFinalLeaderboard', ({ pin }, callback) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin] || (pin ? rooms[pin] : null);
    if (room) {
      room.state = 'final_leaderboard';
      const sorted = [...(room.participants || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
      io.to(cleanPin).emit('room:stateUpdate', {
        state: 'final_leaderboard',
        isGame: false,
        leaderboard: sorted,
        participants: room.participants
      });
      io.to(cleanPin).emit('room:message', {
        event: 'session:final_results',
        payload: { leaderboard: sorted }
      });
      console.log(`[Final Leaderboard] Host showing final results in room ${cleanPin}`);
    }
    if (callback) callback({ success: true });
  });

  socket.on('host:endSession', ({ pin }, callback) => {
    let targetPins = [];
    if (pin && rooms[String(pin).trim()]) {
      targetPins.push(String(pin).trim());
    } else {
      for (const [rPin, room] of Object.entries(rooms)) {
        if (room.hostId === socket.id) {
          targetPins.push(rPin);
        }
      }
    }

    targetPins.forEach(rPin => {
      console.log('[Session End] Host ending session for room ' + rPin + '. Cleaning up chat & disconnecting participants...');
      cleanupChatFiles(rPin);
      io.to(rPin).emit('chat:cleared');
      io.to(rPin).emit('room:closed');
      io.to(rPin).emit('host:participantsUpdated', []);
      delete rooms[rPin];
    });

    if (callback) callback({ success: true });
  });

  socket.on('host:closeRoom', ({ pin }, callback) => {
    if (pin && rooms[pin]) {
      cleanupChatFiles(pin);
      io.to(pin).emit('chat:cleared');
      io.to(pin).emit('room:closed');
      io.to(pin).emit('host:participantsUpdated', []);
      delete rooms[pin];
    }
    if (callback) callback({ success: true });
  });

  // --- DISCONNECT ---
  // --- WINNER MODAL SYNC ---
  socket.on('game:winner_modal_sync', ({ pin, open }) => {
    if (pin) {
      io.to(String(pin).trim()).emit('game:winner_modal_sync', { open: !!open });
    }
  });

  // --- SAMOK (FOUR-IN-A-ROW) TOURNAMENT & MATCHING SYSTEM ---
  function setupSamokTournament(cleanPin, room) {
    if (!room) return;
    const participants = room.participants || [];
    const total = participants.length;
    room.samokTournament = {
      round: 1,
      activeMatches: {},
      waitingPool: [],
      isAIOnly: total <= 3
    };

    console.log(`[Samok] Initializing tournament for room ${cleanPin} with ${total} participants (isAIOnly=${total <= 3})`);

    if (total <= 3) {
      // 3명 이하: 참가자 전원 컴퓨터(AI)와 1:1 대전 자동 배정
      participants.forEach(p => {
        const matchId = `m_ai_${p.id || p.nickname}`;
        room.samokTournament.activeMatches[matchId] = {
          matchId,
          p1: { id: p.id, nickname: p.nickname },
          p2: { id: 'ai', nickname: '컴퓨터 (AI)' },
          isAI: true
        };
        io.to(p.id).emit('samok:match_start', {
          matchId,
          opponent: '컴퓨터 (AI)',
          opponentId: 'ai',
          myColor: 'black',
          isAI: true,
          totalParticipants: total,
          rule: 'ai_single'
        });
      });
      return;
    }

    // 4명 이상: 랜덤 매칭 1:1 대결 진행
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const p1 = shuffled[i];
        const p2 = shuffled[i + 1];
        const matchId = `m_${Date.now()}_${i}`;
        room.samokTournament.activeMatches[matchId] = {
          matchId,
          p1: { id: p1.id, nickname: p1.nickname },
          p2: { id: p2.id, nickname: p2.nickname },
          isAI: false
        };
        io.to(p1.id).emit('samok:match_start', {
          matchId,
          opponent: p2.nickname,
          opponentId: p2.id,
          myColor: 'black',
          isAI: false,
          totalParticipants: total,
          rule: 'tournament'
        });
        io.to(p2.id).emit('samok:match_start', {
          matchId,
          opponent: p1.nickname,
          opponentId: p1.id,
          myColor: 'white',
          isAI: false,
          totalParticipants: total,
          rule: 'tournament'
        });
      } else {
        // 홀수 인원일 경우 부전승 또는 즉시 AI 대결 진행
        const pOdd = shuffled[i];
        const matchId = `m_ai_${pOdd.id || pOdd.nickname}`;
        room.samokTournament.activeMatches[matchId] = {
          matchId,
          p1: { id: pOdd.id, nickname: pOdd.nickname },
          p2: { id: 'ai', nickname: '컴퓨터 (AI)' },
          isAI: true
        };
        io.to(pOdd.id).emit('samok:match_start', {
          matchId,
          opponent: '컴퓨터 (AI)',
          opponentId: 'ai',
          myColor: 'black',
          isAI: true,
          totalParticipants: total,
          rule: 'tournament'
        });
      }
    }
  }

  socket.on('samok:request_pair', ({ pin, nickname }) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin];
    if (!room) return;
    if (!room.samokTournament) {
      setupSamokTournament(cleanPin, room);
      return;
    }
    const t = room.samokTournament;
    const p = room.participants?.find(part => part.id === socket.id || part.nickname === nickname);
    if (!p) return;

    if (t.isAIOnly) {
      const matchId = `m_ai_${p.id || p.nickname}`;
      socket.emit('samok:match_start', {
        matchId,
        opponent: '컴퓨터 (AI)',
        opponentId: 'ai',
        myColor: 'black',
        isAI: true,
        rule: 'ai_single'
      });
      return;
    }

    // 4명 이상 토너먼트: 대기열 확인
    const waitingOpponent = t.waitingPool.find(item => item.id !== p.id);
    if (waitingOpponent) {
      t.waitingPool = t.waitingPool.filter(item => item.id !== waitingOpponent.id);
      const newMatchId = `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      t.activeMatches[newMatchId] = {
        matchId: newMatchId,
        p1: { id: p.id, nickname: p.nickname },
        p2: { id: waitingOpponent.id, nickname: waitingOpponent.nickname },
        isAI: false
      };
      io.to(p.id).emit('samok:match_start', {
        matchId: newMatchId,
        opponent: waitingOpponent.nickname,
        opponentId: waitingOpponent.id,
        myColor: 'black',
        isAI: false,
        rule: 'tournament'
      });
      io.to(waitingOpponent.id).emit('samok:match_start', {
        matchId: newMatchId,
        opponent: p.nickname,
        opponentId: p.id,
        myColor: 'white',
        isAI: false,
        rule: 'tournament'
      });
    } else {
      // 상대가 아직 없으면 대기 중 컴퓨터와 대결하도록 안내
      if (!t.waitingPool.some(item => item.id === p.id)) {
        t.waitingPool.push(p);
      }
      socket.emit('samok:match_start', {
        matchId: `m_ai_${p.id || p.nickname}`,
        opponent: '컴퓨터 (AI)',
        opponentId: 'ai',
        myColor: 'black',
        isAI: true,
        isStandby: true,
        rule: 'tournament'
      });
    }
  });

  socket.on('samok:move', ({ pin, matchId, r, c, color, targetSocketId }) => {
    const cleanPin = String(pin || '').trim();
    if (targetSocketId && targetSocketId !== 'ai') {
      io.to(targetSocketId).emit('samok:opponent_move', { matchId, r, c, color });
    }
  });

  socket.on('samok:match_finish', ({ pin, matchId, isWin, winnerNickname }) => {
    const cleanPin = String(pin || '').trim();
    const room = rooms[cleanPin];
    if (!room) return;
    const t = room.samokTournament;
    const p = room.participants?.find(part => part.id === socket.id || part.nickname === winnerNickname);

    // 승리 시마다 +10점 부여
    if (isWin && p) {
      p.score = (p.score || 0) + 10;
      broadcastParticipants(cleanPin);
    }

    if (!t) return;

    if (t.isAIOnly) {
      if (isWin && p) {
        p.hasFinishedOfficialRound = true;
      }
      // 3명 이하일 때 1승 하면 순위 계산 발표
      const sorted = [...room.participants].sort((a, b) => (b.score || 0) - (a.score || 0));
      io.to(cleanPin).emit('samok:tournament_complete', {
        leaderboard: sorted,
        final3: sorted.slice(0, 3)
      });
      return;
    }

    // 4명 이상 토너먼트:
    // 먼저 끝난 유저는 바로 컴퓨터(AI)와 연습 게임 가능하게 전달
    socket.emit('samok:match_start', {
      matchId: `m_ai_standby_${socket.id}`,
      opponent: '컴퓨터 (AI)',
      opponentId: 'ai',
      myColor: 'black',
      isAI: true,
      isStandby: true,
      rule: 'tournament'
    });

    if (isWin && p) {
      // 대기열에 다른 참가자가 있으면 즉시 둘이 맞대결 배정!
      const waitingOpponent = t.waitingPool.find(item => item.id !== p.id);
      if (waitingOpponent) {
        t.waitingPool = t.waitingPool.filter(item => item.id !== waitingOpponent.id);
        const nextMatchId = `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        t.activeMatches[nextMatchId] = {
          matchId: nextMatchId,
          p1: { id: p.id, nickname: p.nickname },
          p2: { id: waitingOpponent.id, nickname: waitingOpponent.nickname },
          isAI: false
        };
        io.to(p.id).emit('samok:match_start', {
          matchId: nextMatchId,
          opponent: waitingOpponent.nickname,
          opponentId: waitingOpponent.id,
          myColor: 'black',
          isAI: false,
          rule: 'tournament'
        });
        io.to(waitingOpponent.id).emit('samok:match_start', {
          matchId: nextMatchId,
          opponent: p.nickname,
          opponentId: p.id,
          myColor: 'white',
          isAI: false,
          rule: 'tournament'
        });
      } else {
        if (!t.waitingPool.some(item => item.id === p.id)) {
          t.waitingPool.push(p);
        }
      }
    }

    // 최종 3인 생존 확인 (남은 생존자가 3인 이하로 좁혀졌을 때)
    const sorted = [...room.participants].sort((a, b) => (b.score || 0) - (a.score || 0));
    const activeWinners = sorted.filter(part => (part.score || 0) >= 10);
    if (activeWinners.length >= 1 && activeWinners.length <= 3 && (room.participants.length - activeWinners.length >= 1)) {
      io.to(cleanPin).emit('samok:tournament_complete', {
        leaderboard: sorted,
        final3: sorted.slice(0, 3)
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id} (Reason: ${reason})`);

    for (const [pin, room] of Object.entries(rooms)) {
      if (room.hostId === socket.id) {
        // Give host 60 seconds grace period before destroying room (for page refresh/route changes)
        Object.defineProperty(room, 'hostDisconnectTimer', {
          value: setTimeout(() => {
            if (room.hostId === socket.id) {
              io.to(pin).emit('room:closed');
              delete rooms[pin];
              console.log(`Room ${pin} destroyed after host grace period`);
            }
          }, 300000),
          writable: true,
          configurable: true,
          enumerable: false
        });
      } else {
        const participant = room.participants.find(p => p.id === socket.id);
        if (participant) {
          // Give participant grace period for network hiccup, screen lock, or accidental back navigation (15m during game, 5m in lobby)
          const timeoutMs = (room.isGame || room.state === 'game_active') ? 900000 : 300000;
          Object.defineProperty(participant, 'disconnectTimer', {
            value: setTimeout(() => {
              const idx = room.participants.findIndex(p => p === participant);
              if (idx !== -1 && participant.id === socket.id) {
                const removed = room.participants.splice(idx, 1)[0];
                const cleanPin = String(pin || '').trim();
                if (room.hostId) io.to(room.hostId).emit('host:participantsUpdated', room.participants);
                io.to(cleanPin).emit('host:participantsUpdated', room.participants);
                console.log(`Participant ${removed.nickname} left room ${cleanPin}`);
              }
            }, timeoutMs),
            writable: true,
            configurable: true,
            enumerable: false
          });
        }
      }
    }
  });

});

// --- PRODUCTION STATIC BUNDLE SERVING ---
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  console.log(`[Production Static] Serving high-performance bundle from: ${FRONTEND_DIST}`);
  app.use(express.static(FRONTEND_DIST, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp|mp3|wav|ogg|ico|woff|woff2)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      }
    }
  }));
  // Express 5 compatible SPA Fallback for all GET routes
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/socket.io')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    }
    next();
  });
} else {
  console.warn(`[Production Static] dist directory not found at ${FRONTEND_DIST}. Run 'npm run build' in frontend.`);
}

const PORT = process.env.PORT || 5173;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Quizrun Unified High-Speed Server Running!`);
  console.log(`- Web & WebSockets: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  startTunnelServices();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m[ERROR] Port ${PORT} is already in use!\x1b[0m`);
    console.error(`\x1b[33mPlease close any existing Quizrun instances or processes using port ${PORT} and try again.\x1b[0m`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Backward compatibility: also listen on port 3001 if available
if (Number(PORT) !== 3001) {
  try {
    const server3001 = http.createServer(app);
    io.attach(server3001);
    server3001.listen(3001, '0.0.0.0', () => {
      console.log(`[Compatibility] Also listening on port 3001 for legacy direct calls.`);
    }).on('error', (err) => {
      // Non-fatal if 3001 is used by old orphan process
      console.log(`[Compatibility] Port 3001 already in use or unavailable (${err.message}). 5173 will handle all traffic.`);
    });
  } catch (e) {
    console.warn('[Compatibility] Could not attach port 3001 listener:', e.message);
  }
}

