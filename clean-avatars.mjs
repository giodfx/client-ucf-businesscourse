#!/usr/bin/env node
/**
 * Clean source avatars — replace dynamic background elements with static ones.
 * Uses Qwen Image Edit to remove cars, rockets, rides, people, ships.
 * Backs up originals as .bak.png before overwriting.
 */

import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');
const WORKFLOW_PATH = path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json');

const SHOT_NEG = 'cars, vehicles, road, street, pavement, traffic, highway, automobile, photorealistic, photograph, realistic skin texture, airbrushed, smooth skin, stock photo, professional photo, text, words, letters, signs, banners, logos, writing, typography, ugly, blurry, distorted face, deformed, extra fingers, mutated hands, poorly drawn face';

// Avatars to clean — each gets a specific edit instruction
// Module 5 re-clean: remove gibberish text from buildings/containers (text persists from first clean)
const AVATARS_TO_CLEAN = [
  {
    id: 'lesson-5-1',
    prompt: 'Remove ALL text, letters, words, numbers, writing, and gibberish from every building, container, and sign in the background. Replace any text areas with plain painted surfaces matching the surrounding color. Keep the same person, same pose, same outfit, same lighting. Keep the port and container background exactly as it is. Cinematic digital painting with visible brushstrokes. NO text NO letters NO words NO numbers NO writing anywhere in the image.',
  },
  {
    id: 'lesson-5-2',
    prompt: 'Remove ALL text, letters, words, numbers, writing, and gibberish from every building, container, and sign in the background. Replace any text areas with plain painted surfaces matching the surrounding color. Keep the same person, same pose, same outfit, same lighting. Keep the port and container background exactly as it is. Cinematic digital painting with visible brushstrokes. NO text NO letters NO words NO numbers NO writing anywhere in the image.',
  },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Submit error: ${JSON.stringify(data.error).substring(0, 500)}`);
  if (data.node_errors && Object.keys(data.node_errors).length > 0) {
    throw new Error(`Node errors: ${JSON.stringify(data.node_errors).substring(0, 500)}`);
  }
  return data.prompt_id;
}

async function pollCompletion(promptId, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const data = await res.json();
      if (data[promptId]) {
        const status = data[promptId].status?.status_str;
        if (status === 'success') return data[promptId];
        if (status === 'error') throw new Error(`Execution error: ${JSON.stringify(data[promptId].status).substring(0, 500)}`);
      }
    } catch (e) {
      if (e.message.includes('Execution error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AVATAR CLEANER — Remove dynamic background elements');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Avatars to clean: ${AVATARS_TO_CLEAN.length}`);
  console.log();

  for (let i = 0; i < AVATARS_TO_CLEAN.length; i++) {
    const { id, prompt } = AVATARS_TO_CLEAN[i];
    const avatarPath = path.join(COURSE_DIR, `media/images/avatars/scenes/${id}-avatar.png`);
    const bakPath = path.join(COURSE_DIR, `media/images/avatars/scenes/${id}-avatar.original.png`);

    console.log(`  [${i + 1}/${AVATARS_TO_CLEAN.length}] ${id}`);

    if (!fs.existsSync(avatarPath)) {
      console.log(`    MISSING — skipped`);
      continue;
    }

    // Back up original (only if not already backed up)
    if (!fs.existsSync(bakPath)) {
      fs.copyFileSync(avatarPath, bakPath);
      console.log(`    Backed up → ${id}-avatar.original.png`);
    }

    // Copy to ComfyUI input
    const inputFilename = `clean-${id}-avatar.png`;
    fs.copyFileSync(avatarPath, path.join(COMFYUI_INPUT, inputFilename));

    // Load and configure workflow
    const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf-8'));
    workflow['78'].inputs.image = inputFilename;
    workflow['115:111'].inputs.prompt = prompt;
    workflow['115:110'].inputs.prompt = SHOT_NEG;
    workflow['115:3'].inputs.seed = Math.floor(Math.random() * 999999999999);
    workflow['115:3'].inputs.denoise = 1.0;
    workflow['60'].inputs.filename_prefix = `clean-avatar-${id}`;

    const t0 = Date.now();
    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      // Find output file
      const outputs = result.outputs?.['60']?.images;
      if (!outputs || outputs.length === 0) throw new Error('No output image');

      const outFile = outputs[0].filename;
      const outPath = path.join(COMFYUI_OUTPUT, outFile);

      if (!fs.existsSync(outPath)) throw new Error(`Output not found: ${outFile}`);

      // Copy cleaned avatar back
      fs.copyFileSync(outPath, avatarPath);
      const elapsed = Math.round((Date.now() - t0) / 1000);
      console.log(`    OK — cleaned in ${elapsed}s`);
    } catch (e) {
      const elapsed = Math.round((Date.now() - t0) / 1000);
      console.error(`    FAILED (${elapsed}s): ${e.message}`);
    }
  }

  console.log('\n  DONE — Review cleaned avatars before regenerating shots.');
}

main().catch(e => { console.error(e); process.exit(1); });
