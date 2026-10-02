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

const app = express();
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

// Endpoint for uploading local media (music, video, image) from client
app.post('/api/upload', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!data || !name) {
      return res.status(400).json({ success: false, message: 'Invalid file data' });
    }
    const ext = path.extname(name) || '.bin';
    const safeFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
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

let localtunnelInstance = null;
let localtunnelConsecutiveFails = 0;
let localtunnelRestartTimer = null;
let isLocaltunnelDisabledDueToErrors = false;

let currentVerifyingUrl = null;
let healthCheckRestartCount = 0;

function broadcastTunnelUpdate() {
  if (typeof io !== 'undefined' && io) {
    io.emit('tunnel:updated', { 
      publicUrl: activeTunnelUrl,
      isVerifying: isTunnelVerifying
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
        signal: AbortSignal.timeout(4000),
        headers: { 'Bypass-Tunnel-Reminder': 'true', 'User-Agent': 'Mozilla/5.0 (Quizrun-Tunnel-Check)' }
      });
      if (res.status === 200 || res.status === 304 || res.status < 500) {
        tunnelHealthFailCount = 0;
      } else {
        tunnelHealthFailCount++;
      }
    } catch (err) {
      tunnelHealthFailCount++;
      console.log(`[Tunnel HealthCheck] Probe failed (${tunnelHealthFailCount}/3): ${err.message}`);
    }

    if (tunnelHealthFailCount >= 3) {
      console.warn(`\x1b[33m[Tunnel HealthCheck] External Tunnel unresolvable (${activeTunnelUrl}).\x1b[0m`);
      tunnelHealthFailCount = 0;
      activeTunnelUrl = null;
      isTunnelVerifying = false;
      broadcastTunnelUpdate();

      if (healthCheckRestartCount < 2) {
        healthCheckRestartCount++;
        restartAllTunnels(false);
      } else {
        console.warn('\x1b[33m[Tunnel HealthCheck] Max auto-restarts reached. Pausing health restarts to conserve data.\x1b[0m');
      }
    }
  }, 30000);
}

async function startLocalTunnelService() {
  if (isLocaltunnelDisabledDueToErrors) return;

  try {
    if (localtunnelInstance) {
      try { localtunnelInstance.close(); } catch (e) {}
    }
    const cleanSubdomain = `quizrun-${Date.now().toString(36).slice(-6)}`;
    console.log(`[LocalTunnel] Requesting tunnel (${cleanSubdomain})...`);
    const tunnel = await localtunnel({ port: 5173, subdomain: cleanSubdomain });
    localtunnelInstance = tunnel;

    if (tunnel && tunnel.url) {
      console.log(`\n=========================================`);
      console.log(`🚀 Public LocalTunnel Ready:`);
      console.log(tunnel.url);
      console.log(`=========================================\n`);

      localtunnelConsecutiveFails = 0;
      if (!activeTunnelUrl) {
        activeTunnelUrl = tunnel.url;
        isTunnelVerifying = false;
        broadcastTunnelUpdate();
        startTunnelHealthMonitor();
      }
    }

    tunnel.on('close', () => {
      console.log('[LocalTunnel] Connection closed.');
      localtunnelConsecutiveFails++;
      if (localtunnelConsecutiveFails >= 3) {
        isLocaltunnelDisabledDueToErrors = true;
        console.warn('\x1b[33m[LocalTunnel] 3 consecutive failures. Pausing auto-reconnect to protect data.\x1b[0m');
        return;
      }
      const delay = Math.min(3000 * Math.pow(2, localtunnelConsecutiveFails), 30000);
      if (localtunnelRestartTimer) clearTimeout(localtunnelRestartTimer);
      localtunnelRestartTimer = setTimeout(startLocalTunnelService, delay);
    });

    tunnel.on('error', (err) => {
      console.warn('[LocalTunnel] Error:', err.message);
    });
  } catch (err) {
    localtunnelConsecutiveFails++;
    console.warn(`[LocalTunnel] Init notice (${localtunnelConsecutiveFails}/3):`, err.message);
    if (localtunnelConsecutiveFails >= 3) {
      isLocaltunnelDisabledDueToErrors = true;
      console.warn('\x1b[33m[LocalTunnel] Pausing auto-reconnect to protect mobile tethering data.\x1b[0m');
    }
  }
}

function startCloudflaredTunnel() {
  if (isCloudflaredDisabledDueToErrors) return;

  const binPath = path.join(__dirname, 'bin', 'cloudflared.exe');
  if (!fs.existsSync(binPath)) {
    console.warn('[Tunnel] cloudflared.exe not found at', binPath);
    return;
  }

  if (cloudflaredProc) {
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
    localtunnelConsecutiveFails = 0;
    isLocaltunnelDisabledDueToErrors = false;
    healthCheckRestartCount = 0;
  }
  if (cloudflaredRestartTimer) clearTimeout(cloudflaredRestartTimer);
  if (localtunnelRestartTimer) clearTimeout(localtunnelRestartTimer);

  activeTunnelUrl = null;
  currentVerifyingUrl = null;
  isTunnelVerifying = true;
  broadcastTunnelUpdate();
  startLocalTunnelService();
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
  startLocalTunnelService();
  startCloudflaredTunnel();
}

// Clean up child process on exit
process.on('exit', () => {
  if (tunnelHealthTimer) clearInterval(tunnelHealthTimer);
  if (localtunnelInstance) try { localtunnelInstance.close(); } catch (e) {}
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
      isVerifying: isTunnelVerifying
    });
    io.emit('tunnel:updated', { 
      publicUrl: activeTunnelUrl,
      isVerifying: isTunnelVerifying
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
    isVerifying: isTunnelVerifying
  });
});

// --- GIT MANAGEMENT & DEPLOYMENT SYNC ENDPOINTS ---
const { exec: gitExec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(gitExec);
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

let isGitOperating = false;

// 1. Get Git Status & Current Commit (Compare Local vs GitHub Remote)
app.get('/api/git/status', async (req, res) => {
  try {
    const logRes = await execPromise('git log -1 --format="%h|%s|%an|%ad" --date=short', { cwd: ROOT_DIR });
    const [hash, message, author, date] = (logRes.stdout || '').trim().split('|');
    
    const statusRes = await execPromise('git status --porcelain', { cwd: ROOT_DIR });
    const rawStatus = (statusRes.stdout || '').trim();
    const changedFiles = rawStatus ? rawStatus.split('\n').map(l => l.trim()) : [];
    const hasUncommittedChanges = changedFiles.length > 0;

    let behindCount = 0;
    let aheadCount = 0;
    let remoteLatestCommit = null;
    let fetchError = null;

    try {
      await execPromise('git fetch origin main', { cwd: ROOT_DIR, timeout: 8000 });
      
      const behindRes = await execPromise('git rev-list --count HEAD..origin/main', { cwd: ROOT_DIR });
      behindCount = parseInt(behindRes.stdout.trim(), 10) || 0;

      const aheadRes = await execPromise('git rev-list --count origin/main..HEAD', { cwd: ROOT_DIR });
      aheadCount = parseInt(aheadRes.stdout.trim(), 10) || 0;

      if (behindCount > 0) {
        const remoteLogRes = await execPromise('git log -1 origin/main --format="%h|%s|%an|%ad" --date=short', { cwd: ROOT_DIR });
        const [rHash, rMessage, rAuthor, rDate] = (remoteLogRes.stdout || '').trim().split('|');
        remoteLatestCommit = {
          hash: rHash || 'origin/main',
          message: rMessage || '',
          author: rAuthor || '',
          date: rDate || ''
        };
      }
    } catch (e) {
      fetchError = e.message;
    }

    let comparison = 'UP_TO_DATE';
    if (behindCount > 0 && (hasUncommittedChanges || aheadCount > 0)) {
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Sync / Backup to GitHub (Push)
app.post('/api/git/push', async (req, res) => {
  if (isGitOperating) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  isGitOperating = true;
  try {
    const customMessage = req.body?.message || `Auto-backup: Quizrun data & settings (${new Date().toLocaleString('ko-KR')})`;
    console.log('[Git Sync] Staging all files...');
    await execPromise('git add .', { cwd: ROOT_DIR });

    const statusRes = await execPromise('git status --porcelain', { cwd: ROOT_DIR });
    let didCommit = false;
    if (statusRes.stdout && statusRes.stdout.trim().length > 0) {
      console.log(`[Git Sync] Committing changes: ${customMessage}`);
      await execPromise(`git commit -m "${customMessage.replace(/"/g, '\\"')}"`, { cwd: ROOT_DIR });
      didCommit = true;
    }

    console.log('[Git Sync] Pushing to GitHub (origin/main)...');
    const pushRes = await execPromise('git push origin main', { cwd: ROOT_DIR, timeout: 30000 });
    console.log('[Git Sync] Push successful:', pushRes.stdout);

    isGitOperating = false;
    res.json({
      success: true,
      message: didCommit ? '변경된 데이터가 깃허브에 성공적으로 백업(Push)되었습니다!' : '이미 깃허브와 최신 상태로 동일합니다.',
      didCommit
    });
  } catch (err) {
    isGitOperating = false;
    console.error('[Git Sync] Push error:', err);
    res.status(500).json({
      success: false,
      message: `깃허브 업로드 중 오류가 발생했습니다: ${err.message}`
    });
  }
});

// 3. Update from GitHub (Pull & Rebuild)
app.post('/api/git/pull', async (req, res) => {
  if (isGitOperating) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  isGitOperating = true;
  try {
    console.log('[Git Update] Pulling latest changes from GitHub...');
    const pullRes = await execPromise('git pull origin main', { cwd: ROOT_DIR, timeout: 30000 });
    console.log('[Git Update] Pull output:', pullRes.stdout);

    // Rebuild frontend production bundle so web UI reflects updates
    console.log('[Git Update] Rebuilding frontend production bundle...');
    await execPromise('npm run build', { cwd: FRONTEND_DIR, timeout: 60000 });
    console.log('[Git Update] Frontend build completed.');

    // Reload persisted quizzes and config into memory
    PERSISTED_QUIZZES = loadPersistedData(QUIZ_DATA_PATH);
    APP_CONFIG = loadPersistedData(APP_CONFIG_PATH, DEFAULT_APP_CONFIG);
    if (typeof io !== 'undefined' && io) {
      io.emit('config:updated', APP_CONFIG);
    }

    isGitOperating = false;
    res.json({
      success: true,
      message: '깃허브 최신 코드로 업데이트 및 빌드가 완료되었습니다! 화면을 새로고침합니다.',
      output: pullRes.stdout
    });
  } catch (err) {
    isGitOperating = false;
    console.error('[Git Update] Pull error:', err);
    res.status(500).json({
      success: false,
      message: `깃허브 업데이트 중 오류가 발생했습니다: ${err.message}`
    });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e8,
  transports: ['websocket', 'polling']
});

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

function savePersistedData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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

  socket.emit('tunnel:updated', { publicUrl: activeTunnelUrl, isVerifying: isTunnelVerifying });
  socket.emit('network:updated', { 
    ip: getLocalIP(),
    allIps: getAllLocalIPs(),
    publicUrl: activeTunnelUrl,
    isVerifying: isTunnelVerifying
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
    const isLobbyMultiplayer = ['word_bomb', 'ox_run', 'catch_mind'].includes(gameId);
    const initialRoomState = (isGameMode && !isLobbyMultiplayer) ? 'game_active' : 'lobby';

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
      });
    } else {
      rooms[pin] = {
        hostId: socket.id,
        quiz: finalQuiz,
        participants: [],
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
      socket.join(cleanPin);
      console.log(`[ScreenView] Socket ${socket.id} joined screen room ${cleanPin}`);
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
            mediaType: currentQ.mediaType || '',
            mediaName: currentQ.mediaName || '',
            mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
            autoplay: currentQ.autoplay ?? true,
            showChosung: currentQ.showChosung ?? true,
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
        mediaType: currentQ.mediaType || '',
        mediaName: currentQ.mediaName || '',
        mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
        autoplay: currentQ.autoplay ?? true,
        showChosung: currentQ.showChosung ?? true,
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
        mediaType: currentQ.mediaType || '',
        mediaName: currentQ.mediaName || '',
        mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
        autoplay: currentQ.autoplay ?? true,
        showChosung: currentQ.showChosung ?? true,
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
        mediaType: currentQ.mediaType || '',
        mediaName: currentQ.mediaName || '',
        mediaDisplayMode: currentQ.mediaDisplayMode || 'audio',
        autoplay: currentQ.autoplay ?? true,
        showChosung: currentQ.showChosung ?? true,
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

    // Broadcast updated participants to host
    io.to(room.hostId).emit('host:participantsUpdated', room.participants);

    // Broadcast judge result to all in the room
    io.to(pin).emit('room:buzzerJudge', {
      isCorrect,
      groupId: buzzedGroupId,
      participantId: buzzedParticipantId,
      groupScores: { ...room.groupScores }
    });

    if (callback) callback({ success: true });
    console.log(`Room ${pin} buzzer judge: Group ${buzzedGroupId} -> ${isCorrect ? 'CORRECT' : 'INCORRECT'}. Scores:`, room.groupScores);
  });

  socket.on('participant:joinRoom', ({ pin, nickname }, callback) => {
    let room = rooms[pin];
    if (!room) {
      // Auto-fallback: if pin is a valid 6-digit string, auto-initialize the room so participants are not blocked
      if (pin && /^\d{6}$/.test(String(pin).trim())) {
        const cleanPin = String(pin).trim();
        rooms[cleanPin] = {
          hostId: null,
          quiz: MOCK_QUIZZES['general'],
          participants: [],
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

    // Check if participant with this nickname already exists (reconnection / page refresh)
    const existingP = room.participants.find(p => p.nickname === nickname);
    if (existingP) {
      if (existingP.disconnectTimer) {
        clearTimeout(existingP.disconnectTimer);
        delete existingP.disconnectTimer;
      }
      existingP.id = socket.id;
      socket.join(pin);
      io.to(room.hostId).emit('host:participantsUpdated', room.participants);
      io.to(pin).emit('host:participantsUpdated', room.participants);
      io.to(pin).emit('stock_game:participant_joined', { participants: room.participants, participant: existingP });
      const currentQ = room.quiz?.questions?.[room.currentQuestionIndex];
      if (callback) callback({ 
        success: true, 
        roomState: room.state === 'lobby' ? 'waiting' : room.state, 
        isBuzzerMode: room.isBuzzerMode,
        quizType: room.quiz?.quizType || 'mcq',
        isGame: room.isGame || false,
        gameId: room.gameId || null,
        groupId: existingP.groupId || null,
        myScore: existingP.score || 0,
        question: currentQ ? currentQ.text : '',
        options: currentQ ? currentQ.options : [],
        currentQuestionIndex: room.currentQuestionIndex || 0,
        totalQuestions: room.quiz?.questions?.length || 0,
        points: currentQ?.points || 10,
        mediaUrl: currentQ?.mediaUrl || '',
        mediaType: currentQ?.mediaType || '',
        mediaName: currentQ?.mediaName || '',
        mediaDisplayMode: currentQ?.mediaDisplayMode || 'audio',
        autoplay: currentQ?.autoplay ?? true,
        showChosung: currentQ?.showChosung ?? true
      });
      if (room.isGame && room.state === 'game_active') {
        socket.emit('room:message', {
          event: 'game:start',
          payload: { gameId: room.gameId }
        });
      }
      return;
    }

    if (room.state !== 'lobby' && !room.isGame) {
      if (callback) callback({ success: false, message: '게임이 이미 시작되었습니다.' });
      return;
    }

    const newParticipant = {
      id: socket.id,
      nickname,
      score: 0,
      hasAnswered: false,
      currentAnswer: null,
      isCorrect: false,
      groupId: null
    };

    room.participants.push(newParticipant);
    socket.join(pin);

    io.to(room.hostId).emit('host:participantsUpdated', room.participants);
    io.to(pin).emit('host:participantsUpdated', room.participants);
    io.to(pin).emit('stock_game:participant_joined', { participants: room.participants, participant: newParticipant });
    if (callback) callback({ 
      success: true, 
      roomState: room.state === 'lobby' ? 'waiting' : room.state, 
      isBuzzerMode: room.isBuzzerMode,
      quizType: room.quiz?.quizType || 'mcq',
      isGame: room.isGame || false,
      gameId: room.gameId || null
    });
    if (room.isGame && room.state === 'game_active') {
      socket.emit('room:message', {
        event: 'game:start',
        payload: { gameId: room.gameId }
      });
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
    const room = rooms[pin];
    if (room) {
      const p = room.participants.find(p => p.id === socket.id);
      if (p) {
        p.groupId = groupId;
        io.to(room.hostId).emit('host:participantsUpdated', room.participants);
        io.to(pin).emit('host:participantsUpdated', room.participants);
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
      io.to(data.pin).emit('room:message', {
        sender: socket.id,
        event: data.event,
        payload: data.payload
      });
      // Direct relay for stock_game events
      if (data.event && data.event.startsWith('stock_game:')) {
        io.to(data.pin).emit(data.event, data.payload || data);
      }
    }
  });

  // --- STOCK GAME DIRECT SOCKET RELAYS ---
  socket.on('stock_game:execute_order', (data) => {
    if (data && data.pin) {
      io.to(data.pin).emit('stock_game:execute_order', data);
      io.to(data.pin).emit('room:message', { sender: socket.id, event: 'stock_game:execute_order', payload: data });
    }
  });

  socket.on('stock_game:predict', (data) => {
    if (data && data.pin) {
      io.to(data.pin).emit('stock_game:predict', data);
      io.to(data.pin).emit('room:message', { sender: socket.id, event: 'stock_game:predict', payload: data });
    }
  });

  socket.on('stock_game:vip_hint_selected', (data) => {
    if (data && data.pin) {
      const room = rooms[data.pin];
      if (room && room.hostId) {
        io.to(room.hostId).emit('stock_game:vip_hint_selected', data);
      }
      io.to(data.pin).emit('stock_game:vip_hint_selected', data);
      io.to(data.pin).emit('room:message', { sender: socket.id, event: 'stock_game:vip_hint_selected', payload: data });
    }
  });

  socket.on('stock_game:participant_activity', (data) => {
    if (data && data.pin) {
      const room = rooms[data.pin];
      if (room && room.hostId) {
        io.to(room.hostId).emit('stock_game:participant_activity', data);
      }
      io.to(data.pin).emit('stock_game:participant_activity', data);
      io.to(data.pin).emit('room:message', { sender: socket.id, event: 'stock_game:participant_activity', payload: data });
    }
  });

  socket.on('stock_game:state_sync', (data) => {
    if (data && data.pin) {
      io.to(data.pin).emit('stock_game:state_sync', data);
    }
  });

  socket.on('stock_game:request_sync', (data) => {
    if (data && data.pin) {
      const room = rooms[data.pin];
      if (room && room.hostId) {
        io.to(room.hostId).emit('stock_game:request_sync', data);
      }
      io.to(data.pin).emit('stock_game:request_sync', data);
      io.to(data.pin).emit('room:message', { sender: socket.id, event: 'stock_game:request_sync', payload: data });
    }
  });

  socket.on('stock_game:state_sync', (data) => {
    if (data && data.pin) {
      io.to(data.pin).emit('stock_game:state_sync', data);
      io.to(data.pin).emit('room:message', { sender: socket.id, event: 'stock_game:state_sync', payload: data });
    }
  });

  // --- HOST DIRECT SCORE ADJUSTMENT ---
  socket.on('host:adjustScore', ({ pin, nickname, delta, exactScore }) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      const p = room.participants.find(p => p.nickname === nickname);
      if (p) {
        if (typeof exactScore === 'number') {
          p.score = exactScore;
        } else if (typeof delta === 'number') {
          p.score += delta;
        }
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

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

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
          }, 60000),
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
                io.to(room.hostId).emit('host:participantsUpdated', room.participants);
                io.to(pin).emit('host:participantsUpdated', room.participants);
                console.log(`Participant ${removed.nickname} left room ${pin}`);
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

