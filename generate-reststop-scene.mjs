#!/usr/bin/env node
/**
 * Generate Rest Stop Road Scene for Module 0 — same pipeline as regenerate-road-scenes-v2.mjs
 */
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const WF_PATH = 'g:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/image_qwen_2512_gguf.json';
const OUTPUT_DIR = path.resolve('media/images/road-scenes');

const SCENE = {
  name: 'scene-00-rest-stop',
  label: 'Rest Stop (Module 0 - Start Here)',
  prompt: `Cinematic digital painting, a single-lane access road curving gently and ending ahead at a large Florida highway rest stop service plaza, low angle POV from the middle of this road looking straight ahead at the building. The road ends at a wide paved parking lot. Beyond the parking lot stands a large modern rest stop welcome center building with a dramatic peaked angular roof, stone and stucco walls in warm peach and tan tones, a tall glass entrance atrium with an angular canopy extending outward, and a blue-gray metal roof. The building is wide and substantial, a real highway service plaza like on the Florida Turnpike. A few tall light poles in the parking lot. Tall sabal palms and live oak trees with Spanish moss frame the scene on both sides of the access road and around the parking lot edges. Tropical landscaping with hedges and flower beds near the building entrance. No highway visible, we have already taken the exit. The feeling of arriving at the destination, the road ends here. Warm golden sunset light bathing the building facade in amber glow, dramatic sky behind. Deep blue sky overhead transitioning to rich orange and gold at the horizon. Fresh asphalt access road with white edge markings. Painterly brushstrokes visible throughout, atmospheric haze, warm saturated colors with deep shadows, welcoming arrival mood. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography NO flags NO people NO cars NO trucks NO vehicles. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function submitWorkflow(workflow) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
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
        if (status === 'error') throw new Error(`Execution error`);
      }
    } catch (e) {
      if (e.message.includes('Execution error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

async function main() {
  console.log('='.repeat(60));
  console.log(`Rest Stop Road Scene Generation (Module 0)`);
  console.log(`Settings: 1824x1024 | 35 steps | CFG 4 | Euler | Shift 3.1`);
  console.log('='.repeat(60));

  const workflow = JSON.parse(fs.readFileSync(WF_PATH, 'utf-8'));

  workflow['91'].inputs.value = SCENE.prompt;
  workflow['60'].inputs.filename_prefix = `road-scenes-v2/${SCENE.name}`;
  workflow['86:3'].inputs.seed = Math.floor(Math.random() * 1e15);
  workflow['86:3'].inputs.steps = 35;
  workflow['86:3'].inputs.cfg = 4;
  workflow['86:3'].inputs.sampler_name = 'euler';
  workflow['86:3'].inputs.scheduler = 'simple';
  workflow['86:58'].inputs.width = 1824;
  workflow['86:58'].inputs.height = 1024;
  workflow['86:66'].inputs.shift = 3.1;

  console.log(`\nPrompt: ${SCENE.prompt.substring(0, 100)}...`);
  console.log('\nSubmitting to ComfyUI...');

  const start = Date.now();
  const promptId = await submitWorkflow(workflow);
  console.log(`Prompt ID: ${promptId}`);

  const result = await pollCompletion(promptId);
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);

  const outputs = result.outputs?.['60'];
  if (outputs?.images?.[0]) {
    const img = outputs.images[0];
    const comfyPath = path.join('D:/ComfyUI_windows_portable/ComfyUI/output', img.subfolder || '', img.filename);
    const destPath = path.join(OUTPUT_DIR, `${SCENE.name}.png`);
    if (fs.existsSync(comfyPath)) {
      fs.copyFileSync(comfyPath, destPath);
      console.log(`\n✓ Saved: ${SCENE.name}.png (${elapsed}s)`);
    }
  }

  console.log('Done! Review the image before proceeding.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
