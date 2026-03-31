#!/usr/bin/env node
/**
 * Redo specific avatar images with fixed prompts.
 * Fixes: garbled text on banners, signs, storefronts, and clothing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const OUTPUT_DIR = path.join(__dirname, 'media/images/avatars/scenes');

const FEMALE_DESC = 'a confident Latina woman in her early 30s with dark shoulder-length wavy hair';
const MALE_DESC = 'a professional American man in his late 30s with short brown hair';
const NO_TEXT = 'NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography';

// ============================================================================
// IMAGES TO REDO — fixed prompts
// ============================================================================
const REDO_LIST = [
  {
    lessonId: 'lesson-4-1',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a coral blazer over a soft gray top, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing in a vibrant theme park area with colorful roller coaster tracks and tropical palm trees behind her, festive string lights glowing warmly against a twilight purple sky, magical evening atmosphere, cinematic color grading with warm oranges and cool purples, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
  {
    lessonId: 'lesson-4-2',
    presenter: 'male',
    prompt: `Cinematic digital painting, rich warm lighting, ${MALE_DESC}, wearing a chambray button-down shirt with sleeves rolled up, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing in a vibrant theme park area with colorful roller coaster tracks and tropical palm trees behind him, festive string lights glowing warmly against a twilight purple sky, magical evening atmosphere, cinematic color grading with warm oranges and cool purples, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
  {
    lessonId: 'lesson-4-3',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a coral blazer over a soft gray top, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing near theme park attractions with a colorful ferris wheel and palm trees in the background, festive lanterns and warm ambient lighting, magical golden hour atmosphere, cinematic color grading, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
  {
    lessonId: 'lesson-5-2',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a tailored navy dress with a thin gold belt, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing on a waterfront promenade with container ships and port cranes visible in the distance across calm water, warm coastal golden hour light reflecting on the harbor, cinematic color grading with amber and blue tones, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
  {
    lessonId: 'lesson-7-1',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a black blazer with subtle gold trim and a small gold pin, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing beside a crystal-clear natural spring surrounded by lush green vegetation, Spanish moss hanging from ancient cypress trees, serene Florida wilderness with dappled sunlight, cinematic color grading with rich greens and warm gold highlights, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
  {
    lessonId: 'lesson-7-3',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a plain dark blazer with gold trim on the lapels and a small round gold pin, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing beside a crystal-clear natural spring with a gentle waterfall, lush green vegetation and Spanish moss hanging from cypress trees, serene Florida wilderness, cinematic color grading, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}, no emblem no insignia no patches on clothing`,
  },
  {
    lessonId: 'lesson-8-1',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a white blazer with statement gold earrings, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing in front of a modern university campus building with glass and steel architecture, sunny day with a decorative water fountain and manicured green landscaping in background, blue sky with scattered clouds, cinematic color grading with warm gold and cool blue tones, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
  {
    lessonId: 'lesson-8-3',
    presenter: 'female',
    prompt: `Cinematic digital painting, rich warm lighting, ${FEMALE_DESC}, wearing a white blazer with statement gold earrings, shown from the chest up, looking directly at the viewer with warm engaging eye contact, confident smile, clean facial features, standing on a university campus walkway with modern buildings and palm trees, a water fountain feature and green lawn in the background, bright sunny afternoon, cinematic color grading with warm tones, painterly brushstroke texture, NOT a photograph NOT photorealistic, ${NO_TEXT}`,
  },
];

// ============================================================================
// COMFYUI HELPERS
// ============================================================================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        if (status === 'error') throw new Error('ComfyUI execution error');
      }
    } catch (e) {
      if (e.message.includes('error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Check ComfyUI
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!res.ok) throw new Error();
    console.log('ComfyUI: Connected\n');
  } catch {
    console.error('ERROR: ComfyUI not reachable at', COMFYUI_URL);
    process.exit(1);
  }

  const workflowTemplate = JSON.parse(fs.readFileSync(
    path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json'), 'utf-8'
  ));

  let success = 0;
  let failed = 0;

  for (const item of REDO_LIST) {
    console.log(`━━━ ${item.lessonId.toUpperCase()} (${item.presenter}) ━━━`);

    // Backup old image
    const outputPath = path.join(OUTPUT_DIR, `${item.lessonId}-avatar.png`);
    if (fs.existsSync(outputPath)) {
      const backupPath = path.join(OUTPUT_DIR, `${item.lessonId}-avatar.bak.png`);
      fs.copyFileSync(outputPath, backupPath);
      console.log(`  Backed up old image`);
    }

    // Prepare workflow
    const workflow = JSON.parse(JSON.stringify(workflowTemplate));
    const baseImage = item.presenter === 'female' ? 'presenter-female.png' : 'presenter-male.png';

    // Copy base image to ComfyUI input
    const srcImage = path.join(__dirname, `media/images/avatars/${baseImage}`);
    if (fs.existsSync(srcImage)) {
      fs.copyFileSync(srcImage, path.join(COMFYUI_INPUT, baseImage));
    }

    workflow['78'].inputs.image = baseImage;
    workflow['115:111'].inputs.prompt = item.prompt;
    workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);
    workflow['60'].inputs.filename_prefix = `avatar/${item.lessonId}-avatar-redo`;

    try {
      console.log(`  Submitting to ComfyUI...`);
      const promptId = await submitWorkflow(workflow);
      console.log(`  Prompt ID: ${promptId}`);

      const result = await pollCompletion(promptId);
      const outputs = result.outputs?.['60'];

      if (outputs?.images?.[0]) {
        const img = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, outputPath);
          console.log(`  ✓ Saved: ${item.lessonId}-avatar.png\n`);
          success++;
        }
      }
    } catch (e) {
      console.error(`  ✗ FAILED: ${e.message}\n`);
      failed++;
    }

    // Brief cooldown between images
    if (REDO_LIST.indexOf(item) < REDO_LIST.length - 1) {
      console.log(`  Cooling down (15s)...\n`);
      await sleep(15000);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  DONE: ${success} succeeded, ${failed} failed`);
  console.log(`${'═'.repeat(50)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
