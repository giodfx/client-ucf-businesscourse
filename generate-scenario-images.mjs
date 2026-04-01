#!/usr/bin/env node
/**
 * Generate scenario illustrations via ComfyUI Qwen 2512 GGUF workflow.
 * Uses the same API pattern as generate-hero-images.mjs.
 *
 * Usage:
 *   node generate-scenario-images.mjs [--lesson lesson-X-Y] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────
const COMFYUI_URL = 'http://127.0.0.1:8188';
const WORKFLOW_PATH = path.resolve(__dirname, '../../../workflows/comfyui/image_qwen_Image_2512.json');
const PLAN_PATH = path.join(__dirname, 'image-generation-plan.json');
const OUTPUT_DIR = path.join(__dirname, 'media/images/scenarios');
const POLL_INTERVAL = 3000;      // 3s
const TIMEOUT = 600_000;         // 10 min

// ── Load workflow template ──────────────────────────────────────────────
const WORKFLOW_TEMPLATE = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf-8'));

// ── Load prompts from plan ──────────────────────────────────────────────
const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
const ALL_PROMPTS = plan.section3_qwen2512Scenarios.prompts;

// ── CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const lessonFilter = args.includes('--lesson')
  ? args[args.indexOf('--lesson') + 1]
  : null;

// ── Helpers ─────────────────────────────────────────────────────────────
async function checkComfyUI() {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    console.log(`ComfyUI connected — VRAM: ${(data.system?.vram_total / 1e9).toFixed(1)}GB`);
    return true;
  } catch (e) {
    console.error(`ERROR: Cannot reach ComfyUI at ${COMFYUI_URL}`);
    console.error(`  Make sure ComfyUI is running on the laptop.`);
    return false;
  }
}

async function queuePrompt(workflow) {
  const clientId = `scenario-gen-${Date.now()}`;
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Queue failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.prompt_id;
}

async function waitForCompletion(promptId) {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    if (!res.ok) continue;
    const history = await res.json();
    if (!history[promptId]) continue;

    const status = history[promptId].status;
    if (status?.completed) return history[promptId];
    if (status?.status_str === 'error') {
      const msgs = history[promptId].status?.messages || [];
      throw new Error(`ComfyUI error: ${JSON.stringify(msgs)}`);
    }
  }
  throw new Error(`Timeout after ${TIMEOUT / 1000}s waiting for ${promptId}`);
}

async function downloadImage(result, outputPath) {
  const saveNode = result.outputs?.['60'];
  if (!saveNode?.images?.[0]) {
    throw new Error('No output image found in node 60');
  }
  const { filename, subfolder } = saveNode.images[0];
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=output`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

function makeWorkflow(promptText) {
  const wf = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  // Inject prompt text
  wf['91'].inputs.value = promptText;
  // Random seed
  wf['86:3'].inputs.seed = Math.floor(Math.random() * 2147483647);
  // Ensure dimensions (should already be 1824x1024 in template)
  wf['86:58'].inputs.width = 1824;
  wf['86:58'].inputs.height = 1024;
  return wf;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  UCF BIP — Scenario Illustration Generator      ║');
  console.log('║  ComfyUI Qwen 2512 GGUF                        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  // Filter prompts
  let prompts = ALL_PROMPTS;
  if (lessonFilter) {
    prompts = prompts.filter(p => p.lessonId === lessonFilter);
    if (prompts.length === 0) {
      console.error(`No prompts found for ${lessonFilter}`);
      process.exit(1);
    }
    console.log(`Filtered to: ${lessonFilter} (${prompts.length} image(s))`);
  }

  // Ensure output dir
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check for existing files (skip logic)
  const toGenerate = [];
  for (const p of prompts) {
    const outPath = path.join(OUTPUT_DIR, p.outputFilename);
    if (fs.existsSync(outPath)) {
      const stat = fs.statSync(outPath);
      console.log(`  SKIP ${p.outputFilename} (exists, ${(stat.size / 1024).toFixed(0)}KB)`);
    } else {
      toGenerate.push(p);
    }
  }

  if (toGenerate.length === 0) {
    console.log('\nAll images already exist. Nothing to generate.');
    return;
  }

  console.log(`\nImages to generate: ${toGenerate.length} of ${prompts.length}`);
  console.log();

  if (dryRun) {
    console.log('DRY RUN — prompts that would be sent:\n');
    for (const p of toGenerate) {
      console.log(`  ${p.id}: ${p.title}`);
      console.log(`    → ${p.outputFilename}`);
      console.log(`    Diversity: ${plan.section3_qwen2512Scenarios.diversityRotation[p.diversityIndex]?.ethnicity} ${plan.section3_qwen2512Scenarios.diversityRotation[p.diversityIndex]?.gender}`);
      console.log();
    }
    return;
  }

  // Check ComfyUI connectivity
  if (!(await checkComfyUI())) {
    process.exit(1);
  }

  // Generate each image sequentially (one GPU job at a time)
  let completed = 0;
  const startTime = Date.now();

  for (const p of toGenerate) {
    const idx = completed + 1;
    const outPath = path.join(OUTPUT_DIR, p.outputFilename);

    console.log(`\n[${idx}/${toGenerate.length}] ${p.title}`);
    console.log(`  Lesson: ${p.lessonId}`);
    console.log(`  File: ${p.outputFilename}`);

    const genStart = Date.now();

    try {
      const workflow = makeWorkflow(p.qwenPrompt);
      const promptId = await queuePrompt(workflow);
      console.log(`  Queued: ${promptId}`);
      console.log(`  Waiting for completion...`);

      const result = await waitForCompletion(promptId);
      const bytes = await downloadImage(result, outPath);

      const elapsed = ((Date.now() - genStart) / 1000).toFixed(1);
      console.log(`  DONE — ${(bytes / 1024).toFixed(0)}KB, ${elapsed}s`);
      completed++;
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      console.error(`  Skipping ${p.outputFilename} — you can retry with --lesson ${p.lessonId}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n════════════════════════════════════════════`);
  console.log(`  Completed: ${completed}/${toGenerate.length} images in ${totalTime} min`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`════════════════════════════════════════════`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
