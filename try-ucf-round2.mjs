#!/usr/bin/env node
/**
 * UCF Campus Round 2 — Padded Brian photo → road scene
 */
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const WF_PATH = 'g:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/02_qwen_Image_edit_subgraphed.json';
const OUTPUT_DIR = path.resolve('media/images/road-scenes');

const PADDED_IMG = path.resolve('media/images/road-scenes/brian-ucf-padded.png');

const VARIATIONS = [
  {
    name: 'ucf-var5-padded-road',
    label: 'Padded photo → full road scene (natural)',
    prompt: `Transform this into a cinematic digital painting. The dark area at the bottom is a road — fill it in as a smooth two-lane asphalt road with a yellow center line stretching toward the campus buildings ahead. Blend the road naturally into the green lawn on both sides. Convert the entire photograph to a painterly digital painting style with visible brushstrokes, warm golden afternoon light, and rich atmospheric color. Keep the same modern campus building with the glass entrance, the central water fountain, the green lawns, students, and the blue sky with white clouds. Add palm trees along the road edges. NOT a photograph NOT photorealistic, digital painting with visible paint texture. NO text NO letters NO signs.`,
    negative: 'photograph, photorealistic, text, letters, signs, logos, blurry, distorted',
  },
  {
    name: 'ucf-var6-padded-sunset',
    label: 'Padded photo → sunset road scene',
    prompt: `Convert this photograph into a cinematic digital painting with warm golden sunset lighting. The dark bottom section should become a smooth paved road with yellow center line leading toward the campus. Blend the road seamlessly into green lawns on both sides. Transform all surfaces to painterly brushstroke texture. The modern university building with horizontal architecture and glass walls should glow with warm amber sunset reflections. The water fountain in the center catches golden light. Palm trees line both sides of the road. Students sit on the lawn. Deep blue sky with dramatic sunset clouds above. Rich warm saturated colors throughout. NOT a photograph, digital painting style with visible paint texture. NO text NO signs.`,
    negative: 'photograph, photorealistic, text, letters, signs, logos, cold, blue tint',
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
        if (status === 'error') throw new Error(`Error: ${JSON.stringify(data[promptId].status).substring(0, 500)}`);
      }
    } catch (e) {
      if (e.message.includes('Error:')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

async function main() {
  console.log(`\n═══ UCF Campus Round 2 — Padded Photo ═══\n`);

  const ok = await (async () => { try { return (await fetch(`${COMFYUI_URL}/system_stats`)).ok; } catch { return false; } })();
  if (!ok) { console.error('ComfyUI not running'); process.exit(1); }
  console.log('ComfyUI: connected\n');

  // Copy padded image to ComfyUI input
  fs.copyFileSync(PADDED_IMG, path.join(COMFYUI_INPUT, 'brian-ucf-padded.png'));

  let success = 0;
  for (let i = 0; i < VARIATIONS.length; i++) {
    const v = VARIATIONS[i];
    console.log(`── [${i + 1}/${VARIATIONS.length}] ${v.label} ──`);

    const workflow = JSON.parse(fs.readFileSync(WF_PATH, 'utf-8'));
    workflow['78'].inputs.image = 'brian-ucf-padded.png';
    workflow['115:111'].inputs.prompt = v.prompt;
    workflow['115:110'].inputs.prompt = v.negative;
    workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);
    workflow['115:3'].inputs.steps = 4;
    workflow['115:3'].inputs.cfg = 1;
    workflow['115:3'].inputs.denoise = 1.0;
    workflow['60'].inputs.filename_prefix = `ucf-variations/${v.name}`;

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
    if (i < VARIATIONS.length - 1) await sleep(3000);
    console.log();
  }

  console.log(`═══ Done: ${success}/${VARIATIONS.length} ═══\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
