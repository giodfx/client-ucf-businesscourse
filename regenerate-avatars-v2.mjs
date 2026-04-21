#!/usr/bin/env node
/**
 * Regenerate Avatar Images — UCF Business Course
 *
 * Targeted regeneration for 5 modules based on Brian's video script feedback:
 *   Module 1: Scene fix (street+cars → rooftop terrace)
 *   Module 2: Scene fix (indoor atrium → banking facades)
 *   Module 6: Gender swap (Male → Female Latina, beach)
 *   Module 7: Gender swap (Female → Male, springs)
 *   Module 8: Scene fix (glass building → red brick UCF)
 *
 * Usage:
 *   node regenerate-avatars-v2.mjs                  # regenerate all 5 modules
 *   node regenerate-avatars-v2.mjs --module 1       # single module
 *   node regenerate-avatars-v2.mjs --dry-run        # preview prompts only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const COURSE_DIR = __dirname;
const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const AVATAR_DIR = path.join(COURSE_DIR, 'media/images/avatars/scenes');
const WORKFLOW_PATH = path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json');

// ============================================================================
// CHARACTER DESCRIPTIONS
// ============================================================================

const FEMALE_DESC = 'a confident Latina woman in her early 30s with dark shoulder-length wavy hair';
const MALE_DESC = 'a professional American man in his late 30s with short brown hair';

// ============================================================================
// MODULES TO REGENERATE — Updated per Brian's video scripts (April 2, 2026)
// ============================================================================

const REGEN_MODULES = {
  1: {
    presenter: 'male',
    lessons: ['lesson-1-1', 'lesson-1-2', 'lesson-1-3'],
    outfit: 'a fitted charcoal suit with a white open-collar shirt',
    location: 'on a rooftop terrace overlooking the Orlando skyline, modern glass buildings and palm trees in the distance, glass railing, clear blue sky, warm golden afternoon light',
    reason: 'Scene mismatch: had city street with cars, Brian wants rooftop terrace with Orlando skyline',
  },
  2: {
    presenter: 'female',
    lessons: ['lesson-2-1', 'lesson-2-2', 'lesson-2-3'],
    outfit: 'an elegant emerald green blouse with subtle gold earrings',
    location: 'in front of classical banking facades with reflecting pools and manicured topiary gardens, warm afternoon light, elegant stone columns and archways',
    reason: 'Scene mismatch: had indoor atrium/lobby, Brian wants classical banking facades with reflecting pools',
  },
  6: {
    presenter: 'female',
    lessons: ['lesson-6-1', 'lesson-6-2', 'lesson-6-3'],
    outfit: 'a flowing printed blouse with gold accessories',
    location: 'on sandy dunes with tall sea oats and a warm ocean sunset behind her, soft golden light, calm tropical beach atmosphere, palm trees in the distance',
    reason: 'Gender mismatch: had Male, Brian wants Female (Latina) on sandy dunes with sea oats and ocean sunset',
  },
  7: {
    presenter: 'male',
    lessons: ['lesson-7-1', 'lesson-7-2', 'lesson-7-3', 'lesson-7-4', 'lesson-7-5'],
    outfit: 'a UCF polo shirt in black with gold accents',
    location: 'beside cypress trees draped with Spanish moss, lush ferns and green vegetation, dappled sunlight filtering through the canopy, serene Florida wilderness',
    reason: 'Gender mismatch: had Female, Brian wants Male with cypress trees, Spanish moss, and ferns',
  },
  8: {
    presenter: 'female',
    lessons: ['lesson-8-1', 'lesson-8-2', 'lesson-8-3'],
    outfit: 'a white blazer with statement gold earrings',
    location: 'in front of red brick UCF campus buildings with mature live oak trees, a campus fountain visible nearby, warm sunny day, university campus atmosphere with green lawns',
    reason: 'Scene mismatch: had modern glass building, Brian wants red brick UCF buildings with live oaks and campus fountain',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function comfyuiHealthCheck() {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    return res.ok;
  } catch { return false; }
}

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
        const entry = data[promptId];
        const status = entry.status?.status_str;
        if (status === 'success') return entry;
        if (status === 'error') throw new Error(`ComfyUI error: ${JSON.stringify(entry.status)}`);
      }
    } catch (e) {
      if (e.message.includes('ComfyUI error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error(`Timeout waiting for prompt ${promptId}`);
}

function copyToComfyInput(srcPath, destFilename) {
  const dest = path.join(COMFYUI_INPUT, destFilename);
  fs.copyFileSync(srcPath, dest);
  return destFilename;
}

function backupAvatar(lessonId) {
  const avatarPath = path.join(AVATAR_DIR, `${lessonId}-avatar.png`);
  if (fs.existsSync(avatarPath)) {
    const bakPath = path.join(AVATAR_DIR, `${lessonId}-avatar.bak.png`);
    fs.copyFileSync(avatarPath, bakPath);
    return true;
  }
  return false;
}

// ============================================================================
// MAIN GENERATION
// ============================================================================

async function generateAvatar(lessonId, modConfig) {
  const { presenter, outfit, location } = modConfig;
  const charDesc = presenter === 'female' ? FEMALE_DESC : MALE_DESC;

  // Load workflow
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf-8'));

  // Set base image
  const baseImage = presenter === 'female' ? 'presenter-female.png' : 'presenter-male.png';
  const srcImage = path.join(COURSE_DIR, `media/images/avatars/${baseImage}`);
  copyToComfyInput(srcImage, baseImage);
  workflow['78'].inputs.image = baseImage;

  // Build prompt
  const prompt = [
    'Cinematic digital painting, rich warm lighting,',
    `${charDesc},`,
    `wearing ${outfit},`,
    'shown from the chest up,',
    'looking directly at the viewer with warm engaging eye contact,',
    'confident smile, clean facial features with clear jawline and lips,',
    `${location},`,
    'cinematic color grading,',
    'painterly brushstroke texture on skin and clothing,',
    'NOT a photograph NOT photorealistic,',
    'digital painting with visible paint texture',
  ].join(' ');

  workflow['115:111'].inputs.prompt = prompt;

  // Randomize seed
  workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);

  // Set output filename prefix
  workflow['60'].inputs.filename_prefix = `avatar-v2/${lessonId}-avatar`;

  console.log(`  Submitting: ${lessonId} (${presenter})...`);
  const promptId = await submitWorkflow(workflow);
  console.log(`  Prompt ID: ${promptId}`);

  const result = await pollCompletion(promptId);

  // Find and copy output image
  const outputs = result.outputs?.['60'];
  if (outputs?.images?.[0]) {
    const img = outputs.images[0];
    const comfyOutputPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
    if (fs.existsSync(comfyOutputPath)) {
      const destPath = path.join(AVATAR_DIR, `${lessonId}-avatar.png`);
      fs.copyFileSync(comfyOutputPath, destPath);
      console.log(`  ✓ Saved: ${lessonId}-avatar.png`);
      return destPath;
    }
  }

  console.error(`  ✗ Could not find output for ${lessonId}`);
  return null;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const moduleArg = args.find((a, i) => args[i - 1] === '--module');
  const targetModules = moduleArg ? [parseInt(moduleArg)] : Object.keys(REGEN_MODULES).map(Number);

  console.log('═══ Avatar Regeneration v2 — Brian Video Script Feedback ═══');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (preview only)' : 'GENERATE'}`);
  console.log(`Modules: ${targetModules.join(', ')}`);
  console.log();

  if (!dryRun) {
    const ok = await comfyuiHealthCheck();
    if (!ok) {
      console.error('ERROR: ComfyUI not running at ' + COMFYUI_URL);
      process.exit(1);
    }
    console.log('ComfyUI: connected\n');
  }

  let total = 0;
  let success = 0;

  for (const mod of targetModules) {
    const config = REGEN_MODULES[mod];
    if (!config) {
      console.log(`Module ${mod}: not in regeneration list, skipping`);
      continue;
    }

    console.log(`── Module ${mod} ──`);
    console.log(`  Reason: ${config.reason}`);
    console.log(`  Presenter: ${config.presenter}`);
    console.log(`  Lessons: ${config.lessons.join(', ')}`);

    if (dryRun) {
      const charDesc = config.presenter === 'female' ? FEMALE_DESC : MALE_DESC;
      console.log(`  Prompt preview: "...${charDesc}, wearing ${config.outfit}, ...${config.location}..."`);
      console.log();
      total += config.lessons.length;
      continue;
    }

    for (const lessonId of config.lessons) {
      total++;
      const backed = backupAvatar(lessonId);
      if (backed) console.log(`  Backed up: ${lessonId}-avatar.png → .bak.png`);

      try {
        const result = await generateAvatar(lessonId, config);
        if (result) success++;
      } catch (err) {
        console.error(`  ERROR generating ${lessonId}: ${err.message}`);
      }
    }
    console.log();
  }

  console.log('── Summary ──');
  if (dryRun) {
    console.log(`  Would generate: ${total} avatar images`);
  } else {
    console.log(`  Generated: ${success}/${total} avatar images`);
    console.log(`  Backups saved as .bak.png (originals preserved)`);
  }
  console.log('\nNext steps:');
  console.log('  1. Review generated images visually');
  console.log('  2. If approved, regenerate 5-shot variants for affected lessons');
  console.log('  3. Re-render InfinityTalk videos for affected lessons');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
