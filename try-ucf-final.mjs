import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const WF_PATH = 'g:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/02_qwen_Image_edit_subgraphed.json';
const OUTPUT_DIR = path.resolve('media/images/road-scenes');

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
    } catch (e) { if (e.message.includes('Error:')) throw e; }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

async function run(name, inputFile, prompt, negative) {
  fs.copyFileSync(inputFile, path.join(COMFYUI_INPUT, path.basename(inputFile)));
  const workflow = JSON.parse(fs.readFileSync(WF_PATH, 'utf-8'));
  workflow['78'].inputs.image = path.basename(inputFile);
  workflow['115:111'].inputs.prompt = prompt;
  workflow['115:110'].inputs.prompt = negative;
  workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);
  workflow['115:3'].inputs.steps = 4;
  workflow['115:3'].inputs.cfg = 1;
  workflow['115:3'].inputs.denoise = 1.0;
  workflow['60'].inputs.filename_prefix = `ucf-final/${name}`;

  console.log(`\n── ${name} ──`);
  const start = Date.now();
  const promptId = await submitWorkflow(workflow);
  console.log(`  Prompt ID: ${promptId}`);
  const result = await pollCompletion(promptId);
  const outputs = result.outputs?.['60'];
  if (outputs?.images?.[0]) {
    const img = outputs.images[0];
    const comfyPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
    if (fs.existsSync(comfyPath)) {
      const dest = path.join(OUTPUT_DIR, `${name}.png`);
      fs.copyFileSync(comfyPath, dest);
      console.log(`  ✓ Saved (${((Date.now()-start)/1000).toFixed(0)}s)`);
      return dest;
    }
  }
}

const INPUT = path.resolve('media/images/road-scenes/brian-ucf-padded-v2.png');
const NEG = 'photograph, photorealistic, realistic, stock photo, text, letters, words, signs, logos';

const prompt1 = `Transform this photograph into a cinematic digital painting. Add a straight two-lane road stretching from the bottom center of the image toward the campus buildings ahead. The road has a yellow center line and white lane markings. Keep the same modern university buildings, the central water fountain, the green lawn, and the palm trees. Convert the entire image to a painterly digital painting style with visible brushstrokes, warm golden afternoon light, deep blue sky with white clouds. NOT a photograph NOT photorealistic, digital painting with visible paint texture. NO text NO letters NO words NO signs.`;

const prompt2 = `Convert this campus photograph into a cinematic digital painting in the style of concept art. The bottom section is a road — make it a smooth two-lane road with yellow center line that blends naturally into the green campus lawns on either side. The road leads toward the modern university building and fountain ahead. Transform all surfaces to visible painterly brushstrokes. Warm golden hour afternoon light. Keep the exact same campus building architecture, fountain, trees, and student groups. Rich atmospheric painting. NOT a photograph. NO text NO signs.`;

const prompt3 = `Transform into a cinematic digital painting. The dark bottom area should become a paved two-lane road with yellow center line leading straight toward the campus building and fountain ahead. Green grass lawns on both sides of the road. Convert the photographic style to rich painterly brushstrokes with warm golden afternoon light. Keep the modern campus buildings with their brown columns and glass walls, the water fountain, and the students on the lawn exactly as they are. Add palm trees along the road edges. Deep blue sky with fluffy white clouds. Concept art quality. NOT a photograph. NO text.`;

async function main() {
  console.log('═══ UCF Final — 3 variations from padded 16:9 photo ═══');
  const ok = await (async () => { try { return (await fetch(`${COMFYUI_URL}/system_stats`)).ok; } catch { return false; } })();
  if (!ok) { console.error('ComfyUI not running'); process.exit(1); }
  
  await run('ucf-final-a', INPUT, prompt1, NEG);
  await sleep(3000);
  await run('ucf-final-b', INPUT, prompt2, NEG);
  await sleep(3000);
  await run('ucf-final-c', INPUT, prompt3, NEG);
  
  console.log('\n═══ Done ═══\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
