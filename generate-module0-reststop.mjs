#!/usr/bin/env node
/**
 * Generate Module 0 "Rest Stop" Avatar — one-time generation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const AVATAR_DIR = path.join(__dirname, 'media/images/avatars/scenes');
const WORKFLOW_PATH = path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.node_errors && Object.keys(data.node_errors).length > 0) {
    throw new Error(`Node errors: ${JSON.stringify(data.node_errors)}`);
  }
  return data.prompt_id;
}

async function pollCompletion(promptId, timeoutMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const data = await res.json();
      if (data[promptId]) {
        const status = data[promptId].status?.status_str;
        if (status === 'success') return data[promptId];
        if (status === 'error') throw new Error(`ComfyUI error: ${JSON.stringify(data[promptId].status)}`);
      }
    } catch (e) {
      if (e.message.includes('ComfyUI error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

async function main() {
  console.log('='.repeat(60));
  console.log('Module 0 "Rest Stop" Avatar Generation');
  console.log('='.repeat(60));

  // Backup current
  const currentAvatar = path.join(AVATAR_DIR, 'lesson-0-1-avatar.png');
  const bakPath = path.join(AVATAR_DIR, 'lesson-0-1-avatar.bak.png');
  if (fs.existsSync(currentAvatar)) {
    fs.copyFileSync(currentAvatar, bakPath);
    console.log('Backed up current avatar → .bak.png');
  }

  // Load workflow
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf-8'));

  // Set base image (female presenter)
  const baseImage = 'presenter-female.png';
  const srcImage = path.join(__dirname, `media/images/avatars/${baseImage}`);
  const destInput = path.join(COMFYUI_INPUT, baseImage);
  fs.copyFileSync(srcImage, destInput);
  workflow['78'].inputs.image = baseImage;

  // Build rest stop prompt
  const prompt = [
    'Cinematic digital painting, rich warm lighting,',
    'a confident Latina woman in her early 30s with dark shoulder-length wavy hair,',
    'wearing a navy blue top with a delicate gold pendant necklace,',
    'shown from the chest up,',
    'looking directly at the viewer with warm engaging eye contact,',
    'confident welcoming smile, clean facial features with clear jawline and lips,',
    'standing at a scenic Florida highway rest stop welcome area,',
    'covered wooden pavilion with beams behind her,',
    'picnic tables under spreading live oak trees draped with Spanish moss,',
    'sabal palms, a distant winding highway visible through the trees in the background,',
    'warm golden sunset lighting,',
    'cinematic color grading,',
    'painterly brushstroke texture on skin and clothing,',
    'NOT a photograph NOT photorealistic,',
    'digital painting with visible paint texture',
  ].join(' ');

  workflow['115:111'].inputs.prompt = prompt;
  workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);
  workflow['60'].inputs.filename_prefix = 'avatar-v2/lesson-0-1-reststop';

  console.log('\nPrompt:', prompt.substring(0, 120) + '...');
  console.log('\nSubmitting to ComfyUI...');
  const promptId = await submitWorkflow(workflow);
  console.log(`Prompt ID: ${promptId}`);

  const startTime = Date.now();
  const result = await pollCompletion(promptId);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Completed in ${elapsed}s`);

  // Copy output
  const outputs = result.outputs?.['60'];
  if (outputs?.images?.[0]) {
    const img = outputs.images[0];
    const comfyOutputPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
    if (fs.existsSync(comfyOutputPath)) {
      fs.copyFileSync(comfyOutputPath, currentAvatar);
      console.log(`\n✓ Saved: lesson-0-1-avatar.png`);
      console.log(`  Source: ${comfyOutputPath}`);
    }
  }

  console.log('\nDone! Review the image before proceeding.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
