#!/usr/bin/env node
/**
 * Pipeline Watcher — Auto-restart for InfinityTalk video generation
 *
 * Monitors the pipeline process + ComfyUI health. If either crashes:
 *   1. Restarts ComfyUI if it's down
 *   2. Waits for ComfyUI to become healthy
 *   3. Finds the next incomplete lesson
 *   4. Relaunches the pipeline from that lesson
 *
 * Usage:
 *   node pipeline-watcher.mjs                    # Start from first incomplete lesson
 *   node pipeline-watcher.mjs --start lesson-3-1 # Start from specific lesson (first run only)
 *   node pipeline-watcher.mjs --force             # Pass --force to pipeline
 *
 * The watcher keeps running until ALL 26 lessons have completed videos.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_DIR = 'D:/ComfyUI_windows_portable';
const COMFYUI_BAT = 'run_nvidia_gpu.bat';
const COURSE_DIR = path.resolve('.');
const PROGRESS_FILE = path.join(COURSE_DIR, '.infinitytalk-progress.json');
const WATCHER_LOG = path.join(COURSE_DIR, 'pipeline-watcher.log');

const HEALTH_CHECK_INTERVAL = 30_000;   // Check ComfyUI every 30s
const COMFYUI_STARTUP_TIMEOUT = 120_000; // Wait up to 2min for ComfyUI to come back
const RESTART_COOLDOWN = 15_000;         // Wait 15s before restarting pipeline after crash
const MAX_CONSECUTIVE_FAILURES = 3;      // Give up on a lesson after 3 consecutive failures

const ALL_LESSONS = [
  'lesson-0-1', 'lesson-1-1', 'lesson-1-2', 'lesson-1-3',
  'lesson-2-1', 'lesson-2-2', 'lesson-2-3',
  'lesson-3-1', 'lesson-3-2', 'lesson-3-3',
  'lesson-4-1', 'lesson-4-2', 'lesson-4-3',
  'lesson-5-1', 'lesson-5-2',
  'lesson-6-1', 'lesson-6-2', 'lesson-6-3',
  'lesson-7-1', 'lesson-7-2', 'lesson-7-3', 'lesson-7-4', 'lesson-7-5',
  'lesson-8-1', 'lesson-8-2', 'lesson-8-3',
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

let pipelineProcess = null;
let healthCheckTimer = null;
let isRestarting = false;
let consecutiveFailures = {};  // { lessonId: count }
let restartCount = 0;
let watcherStartTime = Date.now();

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// COMFYUI MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function isComfyUIHealthy() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${COMFYUI_URL}/system_stats`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForComfyUI(timeoutMs = COMFYUI_STARTUP_TIMEOUT) {
  const start = Date.now();
  log('Waiting for ComfyUI to become healthy...');
  while (Date.now() - start < timeoutMs) {
    if (await isComfyUIHealthy()) {
      log('ComfyUI is healthy');
      return true;
    }
    await sleep(3000);
  }
  logError(`ComfyUI did not become healthy within ${timeoutMs / 1000}s`);
  return false;
}

function restartComfyUI() {
  log('Restarting ComfyUI...');
  try {
    // Kill any existing ComfyUI python processes
    execSync('taskkill /F /IM "python.exe" /FI "WINDOWTITLE eq ComfyUI*" 2>nul', { stdio: 'pipe' });
  } catch {
    // May fail if no matching process — that's fine
  }

  // Launch ComfyUI in a new minimized window
  try {
    execSync(`start /MIN cmd /c "cd /d ${COMFYUI_DIR} && ${COMFYUI_BAT}"`, {
      stdio: 'pipe',
      shell: 'cmd.exe',
      windowsHide: true,
    });
    log('ComfyUI launch command sent');
  } catch (e) {
    logError(`Failed to launch ComfyUI: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════════════════

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return { completed: {}, errors: {}, startedAt: null };
  }
}

function getCompletedLessons() {
  const progress = loadProgress();
  return new Set(Object.keys(progress.completed || {}));
}

function getNextIncompleteLessonAfter(startLesson = null) {
  const completed = getCompletedLessons();
  // Also check for actual MP4 files (belt and suspenders)
  const withVideo = new Set(ALL_LESSONS.filter(id =>
    fs.existsSync(path.join(COURSE_DIR, `media/video/avatars/${id}-avatar.mp4`)) &&
    fs.statSync(path.join(COURSE_DIR, `media/video/avatars/${id}-avatar.mp4`)).size > 10000
  ));

  let startIdx = 0;
  if (startLesson) {
    const idx = ALL_LESSONS.indexOf(startLesson);
    if (idx >= 0) startIdx = idx;
  }

  for (let i = startIdx; i < ALL_LESSONS.length; i++) {
    const id = ALL_LESSONS[i];
    if (!completed.has(id) && !withVideo.has(id)) {
      // Check if this lesson has been failing too many times
      if ((consecutiveFailures[id] || 0) >= MAX_CONSECUTIVE_FAILURES) {
        log(`Skipping ${id} — failed ${consecutiveFailures[id]} consecutive times`);
        continue;
      }
      return id;
    }
  }
  return null; // All done!
}

function clearErrorsFromProgress() {
  const progress = loadProgress();
  if (Object.keys(progress.errors || {}).length > 0) {
    log(`Clearing ${Object.keys(progress.errors).length} error(s) from progress file`);
    progress.errors = {};
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2) + '\n');
  }
}

function allLessonsComplete() {
  const completed = getCompletedLessons();
  const withVideo = new Set(ALL_LESSONS.filter(id => {
    const mp4 = path.join(COURSE_DIR, `media/video/avatars/${id}-avatar.mp4`);
    return fs.existsSync(mp4) && fs.statSync(mp4).size > 10000;
  }));
  return ALL_LESSONS.every(id => completed.has(id) || withVideo.has(id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function killPipeline() {
  if (pipelineProcess && !pipelineProcess.killed) {
    log('Killing pipeline process...');
    try {
      pipelineProcess.kill('SIGTERM');
    } catch {}
    pipelineProcess = null;
  }
}

function launchPipeline(startLesson, extraArgs = []) {
  const args = ['generate-infinitytalk-pipeline.mjs', '--videos-only', '--start', startLesson, ...extraArgs];
  log(`Launching pipeline: node ${args.join(' ')}`);

  pipelineProcess = spawn('node', args, {
    cwd: COURSE_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Stream pipeline stdout
  pipelineProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      // Only log meaningful lines (skip empty/whitespace)
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`  | ${trimmed}`);
        // Also log key events to watcher log
        if (trimmed.includes('COMPLETE:') || trimmed.includes('FAIL') || trimmed.includes('ERROR') || trimmed.includes('PIPELINE')) {
          fs.appendFileSync(WATCHER_LOG, `  | ${trimmed}\n`);
        }
      }
    }
  });

  pipelineProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) {
      logError(`Pipeline stderr: ${msg}`);
    }
  });

  pipelineProcess.on('exit', (code, signal) => {
    const exitMsg = `Pipeline exited with code=${code} signal=${signal}`;

    if (code === 0) {
      log(exitMsg + ' (clean exit)');
    } else {
      logError(exitMsg);
    }

    pipelineProcess = null;

    // Don't auto-restart if we're already in a restart cycle
    if (!isRestarting) {
      handlePipelineCrash(startLesson);
    }
  });

  return pipelineProcess;
}

async function handlePipelineCrash(lastStartLesson) {
  if (isRestarting) return;
  isRestarting = true;

  try {
    // Check if all lessons are actually done
    if (allLessonsComplete()) {
      log('ALL 26 LESSONS COMPLETE! Watcher shutting down.');
      printFinalSummary();
      cleanup();
      return;
    }

    restartCount++;
    log(`--- RESTART #${restartCount} ---`);

    // Figure out which lesson was being worked on when it crashed
    const nextLesson = getNextIncompleteLessonAfter(lastStartLesson);
    if (!nextLesson) {
      // Maybe all remaining lessons hit MAX_CONSECUTIVE_FAILURES
      log('No more lessons to process (all complete or max failures). Shutting down.');
      printFinalSummary();
      cleanup();
      return;
    }

    // Track consecutive failures for the lesson that was in progress
    // Find the lesson that was probably in progress (first incomplete from lastStartLesson)
    const crashedLesson = getNextIncompleteLessonAfter(lastStartLesson);
    if (crashedLesson) {
      consecutiveFailures[crashedLesson] = (consecutiveFailures[crashedLesson] || 0) + 1;
      log(`${crashedLesson} failure count: ${consecutiveFailures[crashedLesson]}/${MAX_CONSECUTIVE_FAILURES}`);
    }

    // Check ComfyUI health
    const healthy = await isComfyUIHealthy();
    if (!healthy) {
      log('ComfyUI is down — restarting...');
      restartComfyUI();
      const recovered = await waitForComfyUI();
      if (!recovered) {
        logError('ComfyUI failed to recover. Retrying in 60s...');
        await sleep(60000);
        restartComfyUI();
        const recovered2 = await waitForComfyUI(180_000);
        if (!recovered2) {
          logError('ComfyUI still not recovering. Watcher giving up.');
          cleanup();
          return;
        }
      }
    } else {
      log('ComfyUI is still healthy — pipeline crashed for other reason');
    }

    // Clear errors from progress so pipeline doesn't skip lessons
    clearErrorsFromProgress();

    // Cooldown before restart
    log(`Cooling down ${RESTART_COOLDOWN / 1000}s before restart...`);
    await sleep(RESTART_COOLDOWN);

    // Recalculate next lesson after clearing errors
    const resumeLesson = getNextIncompleteLessonAfter();
    if (!resumeLesson) {
      log('All lessons complete after clearing errors. Done!');
      printFinalSummary();
      cleanup();
      return;
    }

    log(`Resuming from ${resumeLesson}`);
    launchPipeline(resumeLesson, forceArg ? ['--force'] : []);

  } finally {
    isRestarting = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

async function healthMonitor() {
  // Don't check if we're already restarting
  if (isRestarting) return;

  // Don't check if pipeline isn't running
  if (!pipelineProcess) return;

  const healthy = await isComfyUIHealthy();
  if (!healthy) {
    logError('ComfyUI health check FAILED while pipeline is running');
    // Kill the pipeline — it'll trigger the exit handler which calls handlePipelineCrash
    killPipeline();
  }
}

function startHealthMonitor() {
  healthCheckTimer = setInterval(healthMonitor, HEALTH_CHECK_INTERVAL);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS / SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function printStatus() {
  const completed = getCompletedLessons();
  const withVideo = new Set(ALL_LESSONS.filter(id => {
    const mp4 = path.join(COURSE_DIR, `media/video/avatars/${id}-avatar.mp4`);
    return fs.existsSync(mp4) && fs.statSync(mp4).size > 10000;
  }));
  const done = ALL_LESSONS.filter(id => completed.has(id) || withVideo.has(id));
  const remaining = ALL_LESSONS.filter(id => !completed.has(id) && !withVideo.has(id));
  const elapsed = formatTime((Date.now() - watcherStartTime) / 1000);

  log(`STATUS: ${done.length}/${ALL_LESSONS.length} complete | ${remaining.length} remaining | ${restartCount} restarts | uptime ${elapsed}`);
  if (remaining.length > 0 && remaining.length <= 10) {
    log(`  Remaining: ${remaining.join(', ')}`);
  }
}

function printFinalSummary() {
  const elapsed = formatTime((Date.now() - watcherStartTime) / 1000);
  const completed = getCompletedLessons();

  log('');
  log('════════════════════════════════════════════════════════');
  log('  WATCHER COMPLETE');
  log('════════════════════════════════════════════════════════');
  log(`  Lessons: ${completed.size}/${ALL_LESSONS.length}`);
  log(`  Restarts: ${restartCount}`);
  log(`  Total time: ${elapsed}`);

  const missing = ALL_LESSONS.filter(id => !completed.has(id));
  if (missing.length > 0) {
    log(`  Missing: ${missing.join(', ')}`);
  }

  if (Object.keys(consecutiveFailures).length > 0) {
    log(`  Failure counts:`);
    for (const [id, count] of Object.entries(consecutiveFailures)) {
      log(`    ${id}: ${count} failures`);
    }
  }
  log('════════════════════════════════════════════════════════');
}

// Print periodic status every 30 minutes
setInterval(printStatus, 30 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function cleanup() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  killPipeline();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const startFromArg = args.includes('--start') ? args[args.indexOf('--start') + 1] : null;
const forceArg = args.includes('--force');

async function main() {
  log('');
  log('════════════════════════════════════════════════════════');
  log('  PIPELINE WATCHER — InfinityTalk Video Generation');
  log('════════════════════════════════════════════════════════');
  log(`  ComfyUI: ${COMFYUI_URL}`);
  log(`  Health check: every ${HEALTH_CHECK_INTERVAL / 1000}s`);
  log(`  Max consecutive failures per lesson: ${MAX_CONSECUTIVE_FAILURES}`);
  log(`  Restart cooldown: ${RESTART_COOLDOWN / 1000}s`);
  log('');

  // Check initial state
  printStatus();

  if (allLessonsComplete()) {
    log('All 26 lessons already have videos! Nothing to do.');
    return;
  }

  // Ensure ComfyUI is running
  let healthy = await isComfyUIHealthy();
  if (!healthy) {
    log('ComfyUI is not running — starting it...');
    restartComfyUI();
    healthy = await waitForComfyUI();
    if (!healthy) {
      logError('Could not start ComfyUI. Exiting.');
      process.exit(1);
    }
  } else {
    log('ComfyUI is healthy');
  }

  // Clear any stale errors
  clearErrorsFromProgress();

  // Find starting lesson
  const startLesson = startFromArg || getNextIncompleteLessonAfter();
  if (!startLesson) {
    log('All lessons complete! Nothing to do.');
    return;
  }

  log(`Starting pipeline from ${startLesson}`);

  // Start health monitoring
  startHealthMonitor();

  // Launch pipeline
  launchPipeline(startLesson, forceArg ? ['--force'] : []);

  // Keep process alive
  process.on('SIGINT', () => {
    log('SIGINT received — shutting down watcher');
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('SIGTERM received — shutting down watcher');
    cleanup();
    process.exit(0);
  });
}

main().catch(e => {
  logError(`Watcher fatal: ${e.message}`);
  cleanup();
  process.exit(1);
});
