/**
 * ComfyUI Watchdog — keeps long-running batches alive by restarting ComfyUI
 * before VRAM fragmentation kills it.
 *
 * Three triggers:
 *   1. Proactive restart every N videos (default 8) — covers gradual fragmentation
 *   2. Health check before each video — recovers from any death between videos
 *   3. Stall detection (caller-driven) — segment >2.5× rolling median = restart
 *
 * Restart sequence (Windows):
 *   1. netstat -ano | findstr :8188 → get PID
 *   2. taskkill /F /T /PID <pid>
 *   3. Wait for port to clear (poll netstat)
 *   4. Spawn ComfyUI .bat detached, with its own console window
 *   5. Poll /system_stats until 200 OK
 *   6. Extra warmup window (30s) before queueing next workflow
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execp = promisify(exec);

const DEFAULTS = {
  url: 'http://127.0.0.1:8188',
  port: 8188,
  bat: 'D:\\ComfyUI_windows_portable\\run_nvidia_gpu.bat',
  restartEveryVideos: 8,
  stallMultiplier: 2.5,
  stallMinSamples: 5,
  readyTimeoutMs: 600000,    // 10 min — cold ComfyUI needs to load ~17GB fp8 from disk
  readyPollMs: 5000,
  postRestartWarmupMs: 60000,  // 60s grace after /system_stats responds (model warmup)
  killTimeoutMs: 30000,
  killPollMs: 1000,
};

export class ComfyUIWatchdog {
  constructor(opts = {}) {
    Object.assign(this, DEFAULTS, opts);
    this.log = opts.log || ((m) => console.log(m));

    this.videosSinceRestart = 0;
    this.segmentTimings = [];
    this.totalRestarts = 0;
    this.startedAt = Date.now();
  }

  // ─────────────────────────────────────────────────────────────────
  // Windows process management
  // ─────────────────────────────────────────────────────────────────

  async findPidOnPort() {
    try {
      const { stdout } = await execp(`netstat -ano | findstr :${this.port}`);
      const lines = stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.includes('LISTENING') && l.includes(`:${this.port}`));
      if (lines.length === 0) return null;
      const parts = lines[0].split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      return Number.isFinite(pid) && pid > 0 ? pid : null;
    } catch {
      return null;
    }
  }

  async killByPid(pid) {
    try {
      await execp(`taskkill /F /T /PID ${pid}`);
      return true;
    } catch (e) {
      this.log(`  [watchdog] taskkill failed for PID ${pid}: ${e.message}`);
      return false;
    }
  }

  async waitForPortClear() {
    const start = Date.now();
    while (Date.now() - start < this.killTimeoutMs) {
      const pid = await this.findPidOnPort();
      if (!pid) return true;
      await new Promise((r) => setTimeout(r, this.killPollMs));
    }
    return false;
  }

  spawnComfyUI() {
    // Run the .bat directly through cmd.exe with `/B` (no new console),
    // detached + unref so it survives parent process exit.
    // `start` with a window title works in interactive shells but is unreliable
    // when the parent itself was launched via `nohup` from bash — the new
    // console flash can be blocked by Windows.
    const child = spawn('cmd.exe', ['/c', this.bat], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  }

  async waitForReady() {
    const start = Date.now();
    while (Date.now() - start < this.readyTimeoutMs) {
      try {
        const res = await fetch(`${this.url}/system_stats`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, this.readyPollMs));
    }
    return false;
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.url}/system_stats`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Public restart
  // ─────────────────────────────────────────────────────────────────

  async restart(reason) {
    this.totalRestarts++;
    const elapsedMin = ((Date.now() - this.startedAt) / 60000).toFixed(1);
    this.log(
      `\n  ──── COMFYUI RESTART #${this.totalRestarts} ────  reason: ${reason}  (uptime ${elapsedMin}m)`
    );

    const pid = await this.findPidOnPort();
    if (pid) {
      this.log(`  [watchdog] killing PID ${pid}...`);
      await this.killByPid(pid);
      const cleared = await this.waitForPortClear();
      if (!cleared) {
        this.log(`  [watchdog] WARN: port :${this.port} still occupied after ${this.killTimeoutMs / 1000}s`);
      }
    } else {
      this.log(`  [watchdog] no process listening on :${this.port}`);
    }

    this.log(`  [watchdog] spawning ${this.bat}...`);
    this.spawnComfyUI();

    this.log(`  [watchdog] waiting for /system_stats to respond...`);
    const up = await this.waitForReady();
    if (!up) {
      throw new Error(
        `Watchdog: ComfyUI did not respond within ${this.readyTimeoutMs / 1000}s after restart`
      );
    }

    this.log(`  [watchdog] up. Warming up ${this.postRestartWarmupMs / 1000}s before next job...`);
    await new Promise((r) => setTimeout(r, this.postRestartWarmupMs));

    this.videosSinceRestart = 0;
    this.segmentTimings = [];
    this.startedAt = Date.now();
    this.log(`  [watchdog] ready\n`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Stall detection (caller passes per-segment elapsed time)
  // ─────────────────────────────────────────────────────────────────

  recordSegmentTime(durationSec) {
    this.segmentTimings.push(durationSec);
    if (this.segmentTimings.length > 20) this.segmentTimings.shift();
  }

  segmentMedian() {
    if (this.segmentTimings.length < this.stallMinSamples) return null;
    const sorted = [...this.segmentTimings].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  isStalled(currentDurationSec) {
    const m = this.segmentMedian();
    if (!m) return false;
    return currentDurationSec > m * this.stallMultiplier;
  }

  // ─────────────────────────────────────────────────────────────────
  // Hooks for pipeline
  // ─────────────────────────────────────────────────────────────────

  async beforeVideo() {
    const alive = await this.checkHealth();
    if (!alive) {
      await this.restart('ComfyUI not responding');
      return;
    }
    if (this.videosSinceRestart >= this.restartEveryVideos) {
      await this.restart(`proactive defrag (every ${this.restartEveryVideos} videos)`);
    }
  }

  afterVideoSuccess() {
    this.videosSinceRestart++;
  }

  async onStall(reason) {
    await this.restart(`stall: ${reason}`);
  }

  status() {
    const med = this.segmentMedian();
    return {
      totalRestarts: this.totalRestarts,
      videosSinceRestart: this.videosSinceRestart,
      segmentMedianSec: med ? med.toFixed(1) : 'n/a',
      sampleCount: this.segmentTimings.length,
    };
  }
}
