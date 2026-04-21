#!/usr/bin/env node
/**
 * Wait for ComfyUI to be idle, then generate Spanish video for lesson-1-2.
 *
 * - Waits 30 minutes before first check
 * - Polls ComfyUI /queue every 60s until queue_running is empty
 * - Then launches: node generate-infinitytalk-spanish.mjs --start lesson-1-2
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COURSE_DIR = path.resolve('.');
const LOG_FILE = path.join(COURSE_DIR, 'wait-and-generate-es.log');
const INITIAL_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 60 * 1000;       // 60 seconds

function log(msg) {
  const ts = new Date().toLocaleString('en-US', { hour12: false });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function isComfyUIIdle() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${COMFYUI_URL}/queue`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = await res.json();
    const running = data.queue_running?.length || 0;
    const pending = data.queue_pending?.length || 0;
    return running === 0 && pending === 0;
  } catch {
    return false; // ComfyUI not reachable = not idle
  }
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  log('=== Wait-and-Generate Spanish lesson-1-2 ===');
  log(`Waiting ${INITIAL_DELAY_MS / 60000} minutes before first check...`);

  await sleep(INITIAL_DELAY_MS);

  log('Initial delay complete. Now polling ComfyUI for idle state...');

  let checks = 0;
  while (true) {
    checks++;
    const healthy = await isComfyUIHealthy();
    if (!healthy) {
      log(`Check #${checks}: ComfyUI not reachable. Retrying in 60s...`);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const idle = await isComfyUIIdle();
    if (idle) {
      log(`Check #${checks}: ComfyUI is IDLE. Launching Spanish pipeline for lesson-1-2.`);
      break;
    } else {
      log(`Check #${checks}: ComfyUI still busy. Retrying in 60s...`);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  // Launch the Spanish pipeline
  log('Launching: node generate-infinitytalk-spanish.mjs --start lesson-1-2');

  const child = spawn('node', ['generate-infinitytalk-spanish.mjs', '--start', 'lesson-1-2'], {
    cwd: COURSE_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(l => log(`  | ${l}`));
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(l => log(`  ERR| ${l}`));
  });

  child.on('close', (code) => {
    log(`Pipeline exited with code ${code}`);
    if (code === 0) {
      log('SUCCESS: lesson-1-2-es video generation complete!');
    } else {
      log('FAILED: lesson-1-2-es video generation failed. Check logs.');
    }
  });
}

main().catch(e => {
  log(`Fatal error: ${e.message}`);
  process.exit(1);
});
