const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');
const isCRLF = code.includes('\r\n');
if (isCRLF) code = code.replace(/\r\n/g, '\n');

// 1. Replace isGitOperating definition with Smart Mutex Lock
const targetLockDef = `let isGitOperating = false;`;

const replaceLockDef = `let isGitOperating = false;
let currentGitOp = null;
let gitOperationStartTime = 0;

async function acquireGitLock(operationName = 'git-op', maxWaitMs = 15000) {
  const start = Date.now();
  while (isGitOperating) {
    // Stale lock recovery: If previous operation exceeded 45s, force-release
    if (gitOperationStartTime && (Date.now() - gitOperationStartTime > 45000)) {
      console.warn(\`[Git Mutex] Force-releasing stale git lock (held by \${currentGitOp} for >45s)\`);
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
}`;

if (code.includes(targetLockDef)) {
    code = code.replace(targetLockDef, replaceLockDef);
    console.log('1. Mutex functions added');
} else {
    console.log('1. targetLockDef NOT found');
}

// 2. Add /api/git/reset-lock endpoint and stale check in /api/git/status
const targetStatusRoute = `app.get('/api/git/status', async (req, res) => {
  try {`;

const replaceStatusRoute = `// Emergency reset endpoint for git lock
app.all(['/api/git/reset-lock', '/api/git-reset-lock'], (req, res) => {
  console.log(\`[Git Lock] Manual lock reset called. Previous state: isBusy=\${isGitOperating}, op=\${currentGitOp}\`);
  releaseGitLock();
  res.json({ success: true, message: '동기화 락이 초기화되었습니다. 이제 동기화를 다시 진행하실 수 있습니다.' });
});

app.get('/api/git/status', async (req, res) => {
  // Stale lock auto-cleanup on status check
  if (isGitOperating && gitOperationStartTime && (Date.now() - gitOperationStartTime > 45000)) {
    console.warn(\`[Git Status] Auto-clearing stale git lock (\${currentGitOp})\`);
    releaseGitLock();
  }
  try {`;

if (code.includes(targetStatusRoute)) {
    code = code.replace(targetStatusRoute, replaceStatusRoute);
    console.log('2. Status route & reset-lock added');
} else {
    console.log('2. targetStatusRoute NOT found');
}

// 3. Update /api/git/push with acquireGitLock
const targetPush = `// 2. Sync / Backup to GitHub (Push with Smart Auto-Merge)
app.post('/api/git/push', async (req, res) => {
  if (isGitOperating) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  isGitOperating = true;
  try {`;

const replacePush = `// 2. Sync / Backup to GitHub (Push with Smart Auto-Merge)
app.post('/api/git/push', async (req, res) => {
  const acquired = await acquireGitLock('push', 15000);
  if (!acquired) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  try {`;

if (code.includes(targetPush)) {
    code = code.replace(targetPush, replacePush);
    console.log('3. Push lock updated');
} else {
    console.log('3. targetPush NOT found');
}

// Update push finally block
const targetPushEnd = `    isGitOperating = false;
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
    isGitOperating = false;`;

const replacePushEnd = `    res.json({
      success: true,
      message: didMergeRemote
        ? '다른 컴퓨터의 최신 업데이트와 현재 로컬 데이터를 자동으로 병합하여 깃허브에 백업(Push) 완료했습니다!'
        : didCommit 
          ? '변경된 모든 데이터가 깃허브에 성공적으로 백업(Push)되었습니다!' 
          : '이미 깃허브 원격 저장소와 완벽하게 일치하며 최신 상태입니다.',
      didCommit,
      didMergeRemote
    });
  } catch (err) {`;

if (code.includes(targetPushEnd)) {
    code = code.replace(targetPushEnd, replacePushEnd);
    // Add finally { releaseGitLock(); } after catch block
    const targetPushCatchEnd = `    res.status(500).json({
      success: false,
      message: errMsg
    });
  }
});`;
    const replacePushCatchEnd = `    res.status(500).json({
      success: false,
      message: errMsg
    });
  } finally {
    releaseGitLock();
  }
});`;
    code = code.replace(targetPushCatchEnd, replacePushCatchEnd);
    console.log('3b. Push finally release added');
}

// 4. Update /api/git/pull with acquireGitLock
const targetPull = `// 3. Update from GitHub (Pull & Smart Merge & Rebuild)
app.post('/api/git/pull', async (req, res) => {
  if (isGitOperating) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  isGitOperating = true;
  try {`;

const replacePull = `// 3. Update from GitHub (Pull & Smart Merge & Rebuild)
app.post('/api/git/pull', async (req, res) => {
  const acquired = await acquireGitLock('pull', 15000);
  if (!acquired) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  try {`;

if (code.includes(targetPull)) {
    code = code.replace(targetPull, replacePull);
    console.log('4. Pull lock updated');
} else {
    console.log('4. targetPull NOT found');
}

// Update pull finally block
const targetPullEnd = `    isGitOperating = false;
    res.json({
      success: true,
      message: isAlreadyUpToDate
        ? '이미 깃허브 최신 버전입니다 (변경사항 없음). 프론트엔드 최신 빌드가 완료되었습니다!'
        : '깃허브 최신 코드로 성공적으로 병합 및 빌드가 완료되었습니다! 화면을 새로고침합니다.',
      output: pullRes.stdout
    });
  } catch (err) {
    isGitOperating = false;
    console.error('[Git Update] Pull error:', err);
    let errMsg = \`깃허브 업데이트 중 오류가 발생했습니다: \${err.message || err}\`;
    res.status(500).json({
      success: false,
      message: errMsg
    });
  }
});`;

const replacePullEnd = `    res.json({
      success: true,
      message: isAlreadyUpToDate
        ? '이미 깃허브 최신 버전입니다 (변경사항 없음). 프론트엔드 최신 빌드가 완료되었습니다!'
        : '깃허브 최신 코드로 성공적으로 병합 및 빌드가 완료되었습니다! 화면을 새로고침합니다.',
      output: pullRes.stdout
    });
  } catch (err) {
    console.error('[Git Update] Pull error:', err);
    let errMsg = \`깃허브 업데이트 중 오류가 발생했습니다: \${err.message || err}\`;
    res.status(500).json({
      success: false,
      message: errMsg
    });
  } finally {
    releaseGitLock();
  }
});`;

if (code.includes(targetPullEnd)) {
    code = code.replace(targetPullEnd, replacePullEnd);
    console.log('4b. Pull finally release added');
}

// 5. Update /api/git/sync with acquireGitLock
const targetSync = `// 4. One-Click All-in-One Git & Render Sync (Smart Compare & Merge Local + GitHub -> Push -> Rebuild)
app.all(['/api/git/sync', '/api/git-sync'], async (req, res) => {
  if (isGitOperating) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  isGitOperating = true;
  try {`;

const replaceSync = `// 4. One-Click All-in-One Git & Render Sync (Smart Compare & Merge Local + GitHub -> Push -> Rebuild)
app.all(['/api/git/sync', '/api/git-sync'], async (req, res) => {
  const acquired = await acquireGitLock('one-click-sync', 20000);
  if (!acquired) {
    return res.status(429).json({ success: false, message: '현재 다른 동기화 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.' });
  }
  try {`;

if (code.includes(targetSync)) {
    code = code.replace(targetSync, replaceSync);
    console.log('5. Sync lock updated');
} else {
    console.log('5. targetSync NOT found');
}

const targetSyncEnd = `    isGitOperating = false;
    res.json({
      success: true,
      message: '로컬과 GitHub의 코드를 비교·병합하여 최신 버전으로 동기화 및 배포 완료했습니다! (Render는 약 1분 뒤 자동 반영됩니다)',
      didCommit,
      pull: pullOutput,
      push: pushRes.stdout
    });
  } catch (err) {
    isGitOperating = false;
    console.error('[Git One-Click Sync] Error:', err);
    res.status(500).json({
      success: false,
      message: \`동기화 실패: \${err.message || err}\`
    });
  }
});`;

const replaceSyncEnd = `    res.json({
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
      message: \`동기화 실패: \${err.message || err}\`
    });
  } finally {
    releaseGitLock();
  }
});`;

if (code.includes(targetSyncEnd)) {
    code = code.replace(targetSyncEnd, replaceSyncEnd);
    console.log('5b. Sync finally release added');
}

// 6. Update scheduleAutoGitBackup with acquireGitLock
const targetAutoBackup = `function scheduleAutoGitBackup() {
  if (autoGitBackupTimer) clearTimeout(autoGitBackupTimer);
  autoGitBackupTimer = setTimeout(async () => {
    if (isGitOperating) return;
    isGitOperating = true;
    try {`;

const replaceAutoBackup = `function scheduleAutoGitBackup() {
  if (autoGitBackupTimer) clearTimeout(autoGitBackupTimer);
  autoGitBackupTimer = setTimeout(async () => {
    if (isGitOperating) return;
    const acquired = await acquireGitLock('auto-backup', 1000);
    if (!acquired) return;
    try {`;

if (code.includes(targetAutoBackup)) {
    code = code.replace(targetAutoBackup, replaceAutoBackup);
    console.log('6. scheduleAutoGitBackup updated');
} else {
    console.log('6. targetAutoBackup NOT found');
}

const targetAutoBackupFinally = `    } catch (err) {
      console.warn('[Auto Git Sync] Background sync warning:', err.message || err);
    } finally {
      isGitOperating = false;
    }`;

const replaceAutoBackupFinally = `    } catch (err) {
      console.warn('[Auto Git Sync] Background sync warning:', err.message || err);
    } finally {
      releaseGitLock();
    }`;

if (code.includes(targetAutoBackupFinally)) {
    code = code.replace(targetAutoBackupFinally, replaceAutoBackupFinally);
    console.log('6b. AutoBackup finally updated');
}

if (isCRLF) {
    code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('backend/server.js updated successfully.');
