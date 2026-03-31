#!/usr/bin/env node
/**
 * Pipeline Watcher — Spanish InfinityTalk video generation
 *
 * Monitors the Spanish pipeline + ComfyUI health. Auto-restarts on crash.
 *
 * Usage:
 *   node pipeline-watcher-spanish.mjs                     # Start from first incomplete
 *   node pipeline-watcher-spanish.mjs --start lesson-1-1  # Start from specific lesson
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_DIR = 'D:/ComfyUI_windows_portable';
const COMFYUI_BAT = 'run_nvidia_gpu.bat';
const COURSE_DIR = path.resolve('.');
const WATCHER_LOG = path.join(COURSE_DIR, 'pipeline-watcher-spanish.log');

const HEALTH_CHECK_INTERVAL = 30_000;
const COMFYUI_STARTUP_TIMEOUT = 120_000;
const RESTART_COOLDOWN = 15_000;
const MAX_CONSECUTIVE_FAILURES = 3;

const ALL_LESSONS = ['lesson-0-1', 'lesson-1-1', 'lesson-1-2'];

let pipelineProcess = null;
let healthCheckTimer = null;
let isRestarting = false;
let consecutiveFailures = {};
let restartCount = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) {
  const ts = new Date().toLocaleString('en-US', { hour12: false });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(WATCHER_LOG, line + '\n');
}

function logError(msg) {
  const ts = new Date().toLocaleString('en-US', { hour12: false });
  const line = `[${ts}] ERROR: ${msg}`;
  console.error(line);
  fs.appendFileSync(WATCHER_LOG, line + '\n');
}

async function isComfyUIHealthy() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${COMFYUI_URL}/system_stats`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch { return false; }
}

async function waitForComfyUI(timeoutMs = COMFYUI_STARTUP_TIMEOUT) {
  const start = Date.now();
  log('Waiting for ComfyUI...');
  while (Date.now() - start < timeoutMs) {
    if (await isComfyUIHealthy()) { log('ComfyUI healthy'); return true; }
    await sleep(3000);
  }
  logError('ComfyUI did not become healthy');
  return false;
}

function restartComfyUI() {
  log('Restarting ComfyUI...');
  try { execSync('taskkill /F /IM "python.exe" /FI "WINDOWTITLE eq ComfyUI*" 2>nul', { stdio: 'pipe' }); } catch {}
  try {
    execSync(`start /MIN cmd /c "cd /d ${COMFYUI_DIR} && ${COMFYUI_BAT}"`, { stdio: 'pipe', shell: 'cmd.exe', windowsHide: true });
    log('ComfyUI launch command sent');
  } catch (e) { logError(`Failed to launch ComfyUI: ${e.message}`); }
}

function getNextIncompleteLesson(startLesson = null) {
  let startIdx = 0;
  if (startLesson) {
    const idx = ALL_LESSONS.indexOf(startLesson);
    if (idx >= 0) startIdx = idx;
  }
  for (let i = startIdx; i < ALL_LESSONS.length; i++) {
    const id = ALL_LESSONS[i];
    const mp4 = path.join(COURSE_DIR, `media/video/avatars/${id}-avatar-es.mp4`);
    try {
      if (fs.statSync(mp4).size > 10000) continue; // Already done
    } catch {}
    if ((consecutiveFailures[id] || 0) >= MAX_CONSECUTIVE_FAILURES) {
      log(`Skipping ${id} — ${consecutiveFailures[id]} failures`);
      continue;
    }
    return id;
  }
  return null;
}

function allDone() {
  return ALL_LESSONS.every(id => {
    try { return fs.statSync(path.join(COURSE_DIR, `media/video/avatars/${id}-avatar-es.mp4`)).size > 10000; }
    catch { return false; }
  });
}

function killPipeline() {
  if (pipelineProcess && !pipelineProcess.killed) {
    log('Killing pipeline...');
    try { pipelineProcess.kill('SIGTERM'); } catch {}
    pipelineProcess = null;
  }
}

function launchPipeline(startLesson, extraArgs = []) {
  const args = ['generate-infinitytalk-spanish.mjs', '--start', startLesson, ...extraArgs];
  log(`Launching: node ${args.join(' ')}`);

  pipelineProcess = spawn('node', args, {
    cwd: COURSE_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  pipelineProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      const t = line.trim();
      if (t) {
        console.log(`  | ${t}`);
        if (t.includes('COMPLETE:') || t.includes('FAIL') || t.includes('ERROR') || t.includes('DONE')) {
          fs.appendFileSync(WATCHER_LOG, `  | ${t}\n`);
        }
      }
    }
  });

  pipelineProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) logError(`Pipeline: ${msg}`);
  });

  pipelineProcess.on('exit', (code, signal) => {
    log(`Pipeline exited code=${code} signal=${signal}`);
    pipelineProcess = null;
    if (!isRestarting) handleCrash(startLesson);
  });

  return pipelineProcess;
}

async function handleCrash(lastLesson) {
  if (isRestarting) return;
  isRestarting = true;

  try {
    if (allDone()) {
      log('ALL 3 SPANISH VIDEOS COMPLETE!');
      cleanup();
      return;
    }

    restartCount++;
    log(`--- RESTART #${restartCount} ---`);

    const next = getNextIncompleteLesson(lastLesson);
    if (!next) {
      log('No more lessons. Done.');
      cleanup();
      return;
    }

    const crashed = getNextIncompleteLesson(lastLesson);
    if (crashed) {
      consecutiveFailures[crashed] = (consecutiveFailures[crashed] || 0) + 1;
      log(`${crashed} failure count: ${consecutiveFailures[crashed]}/${MAX_CONSECUTIVE_FAILURES}`);
    }

    const healthy = await isComfyUIHealthy();
    if (!healthy) {
      log('ComfyUI down — restarting...');
      restartComfyUI();
      const back = await waitForComfyUI();
      if (!back) { logError('ComfyUI failed to restart'); cleanup(); return; }
    }

    await sleep(RESTART_COOLDOWN);
    launchPipeline(next);
  } finally {
    isRestarting = false;
  }
}

function cleanup() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  killPipeline();
  log('Watcher stopped.');
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  const startLessonArg = args.find((a, i) => args[i - 1] === '--start');
  const forceArg = args.includes('--force') ? ['--force'] : [];

  log(`\n=== Spanish InfinityTalk Watcher ===`);
  log(`Lessons: ${ALL_LESSONS.join(', ')}`);

  const healthy = await isComfyUIHealthy();
  if (!healthy) {
    log('ComfyUI not running — starting it...');
    restartComfyUI();
    const ok = await waitForComfyUI();
    if (!ok) { logError('Could not start ComfyUI'); process.exit(1); }
  }

  const startLesson = startLessonArg || getNextIncompleteLesson();
  if (!startLesson) {
    if (allDone()) { log('All Spanish videos already exist!'); process.exit(0); }
    log('No lessons to process'); process.exit(0);
  }

  log(`Starting from: ${startLesson}`);

  // Health check timer
  healthCheckTimer = setInterval(async () => {
    if (pipelineProcess && !(await isComfyUIHealthy())) {
      logError('ComfyUI health check FAILED');
      killPipeline();
    }
  }, HEALTH_CHECK_INTERVAL);

  launchPipeline(startLesson, forceArg);

  process.on('SIGINT', () => { log('SIGINT received'); cleanup(); });
  process.on('SIGTERM', () => { log('SIGTERM received'); cleanup(); });
}

main().catch(e => { logError(e.message); process.exit(1); });
