#!/usr/bin/env node
/**
 * Try UCF Campus Road Scene Variations — Qwen Image Edit
 *
 * Option 1: Brian's photo → add road POV + convert to digital painting
 * Option 2: Our generated scene → edit to match Brian's reference buildings
 */
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const WF_PATH = 'g:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/02_qwen_Image_edit_subgraphed.json';
const OUTPUT_DIR = path.resolve('media/images/road-scenes');

// Brian's reference photo
const BRIAN_PHOTO = path.resolve('Feedback/April 6/themes-images-v2/image22.png');
// Our generated UCF scene
const GENERATED_UCF = path.resolve('media/images/road-scenes/scene-10-university-campus.png');

const VARIATIONS = [
  // ── Option 1: Brian's photo as input ──
  {
    name: 'ucf-var1-photo-to-road',
    label: 'Photo → Road Scene (full transform)',
    inputImage: BRIAN_PHOTO,
    inputFilename: 'brian-ucf-reference.png',
    prompt: `Transform this photograph into a cinematic digital painting. Add a straight two-lane road stretching from the bottom center of the image toward the campus buildings ahead. The road has a yellow center line and white lane markings. Keep the same modern university buildings, the central water fountain, the green lawn, and the palm trees. Convert the entire image to a painterly digital painting style with visible brushstrokes, warm golden afternoon light, deep blue sky with white clouds. NOT a photograph NOT photorealistic, digital painting with visible paint texture. NO text NO letters NO words NO signs.`,
    negative: 'photograph, photorealistic, realistic, stock photo, text, letters, words, signs, logos',
  },
  {
    name: 'ucf-var2-photo-to-road-v2',
    label: 'Photo → Road Scene (emphasize road POV)',
    inputImage: BRIAN_PHOTO,
    inputFilename: 'brian-ucf-reference.png',
    prompt: `Change this image into a cinematic digital painting viewed from the middle of a road looking straight ahead. Add a paved road at the bottom of the image leading toward the campus. The modern tan and glass university buildings remain on both sides. The water fountain stays in the center distance. Add warm golden sunset lighting. Convert all surfaces to painterly brushstroke texture. The road stretches ahead toward the fountain with the buildings flanking it on left and right. Palm trees line the road. Students visible on the green lawns. Rich atmospheric haze. NOT a photograph, digital painting style.`,
    negative: 'photograph, photorealistic, realistic skin, airbrushed, text, letters, signs, logos',
  },
  // ── Option 2: Generated scene as input ──
  {
    name: 'ucf-var3-gen-to-realistic',
    label: 'Generated → More like Brian reference',
    inputImage: GENERATED_UCF,
    inputFilename: 'generated-ucf-scene.png',
    prompt: `Make the campus buildings look more like a real UCF campus. Change the architecture to have more glass curtain walls with tan concrete frames, flat overhanging roof canopies, and horizontal sun shades. The main building ahead should have a wide glass entrance atrium. Keep the road, the water fountain in the center, the palm trees, and the green lawns. Keep the same painterly digital painting style and warm golden lighting. Add a few more students sitting on the grass in small groups. The buildings should feel like modern Florida subtropical campus architecture.`,
    negative: 'photograph, photorealistic, text, letters, signs, logos, red brick, colonial, traditional',
  },
  {
    name: 'ucf-var4-gen-refine',
    label: 'Generated → Wider campus feel',
    inputImage: GENERATED_UCF,
    inputFilename: 'generated-ucf-scene.png',
    prompt: `Adjust the campus buildings to have wider, lower proportions — two to three stories maximum, not tall. Add overhanging flat roof canopies extending past the building walls for shade. The buildings should have large floor-to-ceiling glass windows with slim tan concrete columns. Make the central fountain taller and more prominent with multiple water jets. Add flowering bushes and tropical landscaping along the building edges. Keep the road, palm trees, green lawns, students, and warm golden painterly style. The campus should feel open, airy, and subtropical.`,
    negative: 'photograph, photorealistic, text, letters, signs, logos, tall buildings, skyscrapers, red brick',
  },
];

// ── Utilities ──

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
  if (data.node_errors && Object.keys(data.node_errors).length > 0)
    throw new Error(`Node errors: ${JSON.stringify(data.node_errors)}`);
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
        if (status === 'error') throw new Error(`Execution error: ${JSON.stringify(data[promptId].status).substring(0, 500)}`);
      }
    } catch (e) {
      if (e.message.includes('Execution error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const varArg = args.find((a, i) => args[i - 1] === '--var');

  const targets = varArg
    ? VARIATIONS.filter(v => v.name.includes(varArg))
    : VARIATIONS;

  console.log(`\n═══ UCF Campus Variations — Qwen Image Edit ═══`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'GENERATE'} | Variations: ${targets.length}`);
  console.log(`Settings: Qwen Image Edit | 4 steps | CFG 1 | denoise 1.0 | Lightning LoRA\n`);

  if (!dryRun) {
    const ok = await comfyuiHealthCheck();
    if (!ok) {
      console.error('ERROR: ComfyUI not running at ' + COMFYUI_URL);
      process.exit(1);
    }
    console.log('ComfyUI: connected\n');
  }

  let success = 0;

  for (let i = 0; i < targets.length; i++) {
    const v = targets[i];
    console.log(`── [${i + 1}/${targets.length}] ${v.label} (${v.name}) ──`);

    if (dryRun) {
      console.log(`   Input: ${path.basename(v.inputImage)}`);
      console.log(`   Prompt: ${v.prompt.substring(0, 120)}...`);
      console.log();
      continue;
    }

    // Copy input image to ComfyUI input folder
    if (!fs.existsSync(v.inputImage)) {
      console.error(`   ERROR: Input image not found: ${v.inputImage}`);
      continue;
    }
    fs.copyFileSync(v.inputImage, path.join(COMFYUI_INPUT, v.inputFilename));
    console.log(`   Input: ${v.inputFilename}`);

    // Load workflow
    const workflow = JSON.parse(fs.readFileSync(WF_PATH, 'utf-8'));

    // Set input image
    workflow['78'].inputs.image = v.inputFilename;

    // Set positive prompt
    workflow['115:111'].inputs.prompt = v.prompt;

    // Set negative prompt
    workflow['115:110'].inputs.prompt = v.negative;

    // Randomize seed
    workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);

    // Ensure correct settings
    workflow['115:3'].inputs.steps = 4;
    workflow['115:3'].inputs.cfg = 1;
    workflow['115:3'].inputs.denoise = 1.0;
    workflow['115:3'].inputs.sampler_name = 'euler';
    workflow['115:3'].inputs.scheduler = 'simple';

    // Set output prefix
    workflow['60'].inputs.filename_prefix = `ucf-variations/${v.name}`;

    console.log(`   Submitting to ComfyUI...`);
    const start = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      console.log(`   Prompt ID: ${promptId}`);
      const result = await pollCompletion(promptId);

      const outputs = result.outputs?.['60'];
      if (outputs?.images?.[0]) {
        const img = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
        if (fs.existsSync(comfyPath)) {
          const destPath = path.join(OUTPUT_DIR, `${v.name}.png`);
          fs.copyFileSync(comfyPath, destPath);
          const elapsed = ((Date.now() - start) / 1000).toFixed(0);
          console.log(`   ✓ Saved: ${v.name}.png (${elapsed}s)`);
          success++;
        }
      }
    } catch (e) {
      console.error(`   ✗ FAILED: ${e.message}`);
    }

    if (i < targets.length - 1) await sleep(3000);
    console.log();
  }

  console.log(`═══ Summary ═══`);
  console.log(`  Generated: ${success}/${targets.length} variations`);
  console.log(`  Output: ${OUTPUT_DIR}/ucf-var*.png`);
  console.log();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
