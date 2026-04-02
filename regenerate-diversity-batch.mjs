#!/usr/bin/env node
/**
 * Batch image regeneration for demographic diversity.
 * Queues one image at a time via Qwen 2512 GGUF, waits for completion, copies output.
 * Usage: node regenerate-diversity-batch.mjs [--start N]
 */
import { readFileSync, copyFileSync, existsSync, readdirSync } from 'fs';
import http from 'http';
import path from 'path';

const COMFY_URL = 'http://127.0.0.1:8188';
const COMFY_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const WORKFLOW_PATH = 'G:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/image_qwen_2512_gguf.json';
const IMG_BASE = 'G:/z-CUSTOM_DEV/CourseFuture/clients/UCF/BusinessCourse/output/lessons/images';

const BASE_NEGATIVE = '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲, Asian, East Asian, Indian, South Asian, Chinese, Japanese, Korean, dark skin tone, text, watermark, signature';

const IMAGES = [
  // === HERO IMAGES ===
  {
    id: 'hero-2-1',
    dest: `${IMG_BASE}/lesson-2-1-hero.png`,
    prompt: 'Cinematic digital painting of an elegant European woman with auburn hair in her early 30s, wearing a green blazer over a white blouse, standing at a polished mahogany desk in a luxurious wood-paneled tax office. She works on a laptop with tax documents and a calculator spread before her. Through the window behind her, classical banking facades and palm trees are visible at sunset. Golden hour light streams through window blinds. Painterly brushstrokes visible, warm rich colors. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'hero-3-2',
    dest: `${IMG_BASE}/lesson-3-2-hero.png`,
    prompt: 'Cinematic digital painting of a confident Latina woman with dark brown wavy hair, mid-30s, wearing a burgundy blazer over a gray v-neck top, standing in a modern control room with large windows overlooking Florida marshland and static launch towers at sunset. She points at a wall-mounted map while holding a notebook. Monitor screens glow behind her showing data dashboards. Warm golden lighting from the sunset. Painterly brushstrokes, atmospheric haze. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'hero-5-2',
    dest: `${IMG_BASE}/lesson-5-2-hero.png`,
    prompt: 'Cinematic digital painting of a charismatic European man with light brown hair, early 40s, wearing a navy blazer over a white t-shirt, standing on an elevated terrace gesturing confidently while presenting to a small group of seated professionals. Behind him, a Florida port district with colorful warehouses, container cranes, and palm trees at sunset. He holds papers in one hand. Golden hour lighting, warm saturated colors. Painterly brushstrokes visible, atmospheric haze. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'hero-6-1',
    dest: `${IMG_BASE}/lesson-6-1-hero.png`,
    prompt: 'Cinematic digital painting of a white European woman with brown hair in a cream blazer shaking hands with a Latino man with dark hair in a gray suit on a wooden beach boardwalk at sunset. Ocean waves and sea oats behind them, warm golden hour lighting. A beach restaurant cabana visible in the background. They face each other with warm smiles. Sandy dunes and a wooden railing. Painterly brushstrokes, atmospheric haze, warm saturated colors. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'hero-7-3',
    dest: `${IMG_BASE}/lesson-7-3-hero.png`,
    prompt: 'Cinematic digital painting of an elegant European woman with blonde shoulder-length hair, mid-30s, wearing a burgundy leather jacket over a black top, standing on a wooden dock at a Florida natural spring. She holds a tablet showing charts while leaning on a wooden post. Crystal clear turquoise water with fish visible below, cypress trees draped in Spanish moss, an alligator sunning on a log nearby. Dappled golden sunlight filtering through the canopy. Painterly brushstrokes, lush greens and turquoise. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'hero-8-1',
    dest: `${IMG_BASE}/lesson-8-1-hero.png`,
    prompt: 'Cinematic digital painting of a confident Latina woman with warm brown skin and dark wavy hair highlighted with caramel, mid-30s, wearing a plum blazer over a gold silk blouse, standing at a modern glass railing on a UCF campus at sunset. Behind her, contemporary glass and brick university buildings, a reflecting pool, palm trees, and students walking on pathways. Purple and gold sunset sky. She holds a tablet confidently. Painterly brushstrokes, atmospheric warm lighting. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'hero-8-2',
    dest: `${IMG_BASE}/lesson-8-2-hero.png`,
    prompt: 'Cinematic digital painting of a focused European man with sandy brown hair and light stubble, mid-30s, wearing a denim blue button-up shirt, working at a laptop in a modern open-plan campus co-working space. Through large glass windows behind him, red brick UCF campus buildings and oak trees are visible at sunset. Post-it notes on a whiteboard beside him. Warm golden light streams in. He writes notes while looking at the screen. Painterly brushstrokes, warm saturated colors. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  // === SCENARIO IMAGES ===
  {
    id: 'scenario-1-1',
    dest: `${IMG_BASE}/scenarios/lesson-1-1-entity-comparison.png`,
    prompt: 'Cinematic digital painting of a European man with brown hair and neat beard, mid-30s, in a dark navy suit with a tie, sitting across from a brunette European woman in a blue blazer at a modern glass-walled office overlooking downtown Orlando skyline with palm trees at sunset. They review documents and charts on the table between them. Professional corporate atmosphere, warm golden hour lighting through the windows. Painterly brushstrokes, atmospheric haze. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-2-1',
    dest: `${IMG_BASE}/scenarios/lesson-2-1-tax-advisor-meeting.png`,
    prompt: 'Cinematic digital painting of a European woman with auburn hair in her 30s wearing a dark blazer, sitting across from a Latino man with salt-and-pepper hair in a suit, in an elegant wood-paneled tax office with bookshelves. A laptop shows financial charts between them. Through the window, a classical government building with columns is visible at dusk. Warm lamplight and golden tones. They discuss documents. Painterly brushstrokes. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-2-3',
    dest: `${IMG_BASE}/scenarios/lesson-2-3-bank-rejection.png`,
    prompt: 'Cinematic digital painting of a Latino man with dark wavy hair and light tan skin, early 30s, wearing a navy suit with a light blue dress shirt, standing pensively outside a modern bank building in downtown Orlando. He holds documents and touches his chin thoughtfully. Palm trees line the sidewalk, golden sunset light casts long shadows. He looks concerned but determined. Glass bank entrance behind him. Painterly brushstrokes, warm atmospheric tones. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-4-2',
    dest: `${IMG_BASE}/scenarios/lesson-4-2-immigration-consultation.png`,
    prompt: 'Cinematic digital painting of a Latino man with dark hair, early 30s, in a suit and tie, sitting across from a European woman with blonde hair in a blazer, in a warm professional office. A passport and visa documents are visible on the desk. Through the window, festive theme park architecture with string lights and palm trees at sunset. Warm lamplight, professional atmosphere. They review paperwork together. Painterly brushstrokes, warm golden tones. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-5-1',
    dest: `${IMG_BASE}/scenarios/lesson-5-1-market-adaptation.png`,
    prompt: 'Cinematic digital painting of a Latina woman with brown wavy hair, early 30s, wearing a dark blazer over a light blouse, standing next to a tall African American man in a blue dress shirt. The woman holds a tablet facing the viewer, its screen clearly visible showing colorful bar charts and graphs. Both look down at the tablet screen. Modern office with large windows overlooking a Florida port with container ships and cranes at sunset. Documents and reports on the conference table. Warm golden light. Painterly brushstrokes, atmospheric haze. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-5-2',
    dest: `${IMG_BASE}/scenarios/lesson-5-2-trade-show.png`,
    prompt: 'Cinematic digital painting of a cheerful European woman with strawberry blonde hair, early 30s, wearing a navy blazer over a coral blouse, standing behind a trade show booth displaying product samples. She gestures welcomingly with one hand while a man with a beard holds a tablet nearby. Convention center with blue curtain booths, dramatic overhead lighting. Professional exhibition atmosphere. Painterly brushstrokes, vibrant colors. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-7-4',
    dest: `${IMG_BASE}/scenarios/lesson-7-4-latam-gateway.png`,
    prompt: 'Cinematic digital painting of a Latino man with dark wavy hair and light olive skin, early 30s, wearing a charcoal suit with a tie, standing in a modern airport terminal holding a boarding pass and smartphone. Through the large glass windows behind him, commercial airplanes and palm trees are visible at sunset. Other business travelers walk past with luggage. He looks forward confidently. Warm golden terminal lighting. Painterly brushstrokes, atmospheric haze. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  },
  {
    id: 'scenario-8-2',
    dest: `${IMG_BASE}/scenarios/lesson-8-2-resources-preparation.png`,
    prompt: 'Cinematic digital painting of a European woman with light brown hair in a ponytail, mid-20s, wearing a navy blazer over a light blue blouse, sitting at a desk in a university resource center working on a laptop with a warm smile. Through the window behind her, red brick UCF campus buildings and oak trees with students walking. Brochures, resource guides, and notebooks on the desk. Warm golden sunlight. Painterly brushstrokes, warm tones. Concept art quality. No text, no words, no letters. Wide composition, 16:9 aspect ratio.',
    negative: BASE_NEGATIVE
  }
];

// --- Utility functions ---
function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForCompletion(promptId) {
  while (true) {
    await sleep(10000); // check every 10s
    try {
      const hist = await httpGet(`${COMFY_URL}/history/${promptId}`);
      const entry = hist[promptId];
      if (entry && entry.outputs && entry.outputs['60']) {
        const imgs = entry.outputs['60'].images;
        return imgs[0]; // { filename, subfolder, type }
      }
      if (entry && entry.status && entry.status.status_str === 'error') {
        throw new Error(`ComfyUI error for ${promptId}`);
      }
    } catch (e) {
      if (e.message.includes('error')) throw e;
      // else keep polling
    }
    process.stdout.write('.');
  }
}

async function main() {
  let startIdx = 0;
  const startArg = process.argv.indexOf('--start');
  if (startArg !== -1 && process.argv[startArg + 1]) {
    startIdx = parseInt(process.argv[startArg + 1]) || 0;
  }

  const workflow = JSON.parse(readFileSync(WORKFLOW_PATH, 'utf8'));

  console.log(`\n=== Diversity Batch Regeneration ===`);
  console.log(`Total images: ${IMAGES.length}, starting at index: ${startIdx}\n`);

  for (let i = startIdx; i < IMAGES.length; i++) {
    const img = IMAGES[i];
    console.log(`[${i+1}/${IMAGES.length}] ${img.id}`);
    console.log(`  Prompt: ${img.prompt.substring(0, 80)}...`);

    // Clone workflow and update
    const wf = JSON.parse(JSON.stringify(workflow));
    wf['91']['inputs']['value'] = img.prompt;
    wf['86:7']['inputs']['text'] = img.negative;
    wf['86:3']['inputs']['seed'] = Math.floor(Math.random() * 999999);
    wf['60']['inputs']['filename_prefix'] = `Diversity-${img.id}`;

    // Queue
    const result = await httpPost(`${COMFY_URL}/prompt`, { prompt: wf });
    const promptId = result.prompt_id;
    console.log(`  Queued: ${promptId}`);
    process.stdout.write('  Waiting');

    // Wait for completion
    const output = await waitForCompletion(promptId);
    console.log(` DONE!`);

    // Copy to destination
    const srcFile = path.join(COMFY_OUTPUT, output.subfolder || '', output.filename);
    console.log(`  Source: ${srcFile}`);
    console.log(`  Dest:   ${img.dest}`);

    if (existsSync(srcFile)) {
      copyFileSync(srcFile, img.dest);
      console.log(`  ✓ Copied successfully\n`);
    } else {
      console.log(`  ✗ Source file not found!\n`);
    }
  }

  console.log(`\n=== All done! ===`);
}

main().catch(console.error);
