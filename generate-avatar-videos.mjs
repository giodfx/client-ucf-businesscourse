#!/usr/bin/env node
/**
 * Full Avatar Video Production — UCF Business Course
 *
 * Three-stage pipeline for all 26 lessons:
 *   Stage A: Qwen Image Edit → 5 shot variations per lesson
 *   Stage B: LTX-2.3 → 18s video segments with shot cycling
 *   Stage C: FFmpeg → crossfade assembly into final MP4
 *
 * Usage:
 *   node generate-avatar-videos.mjs                        # All lessons, lesson-0-1 first
 *   node generate-avatar-videos.mjs --lesson lesson-0-1    # Single lesson
 *   node generate-avatar-videos.mjs --skip-shots           # Skip Stage A (shots exist)
 *   node generate-avatar-videos.mjs --start lesson-3-1     # Start from a specific lesson
 *
 * Resume is automatic — existing segments and shots are skipped.
 * NEVER run two GPU processes simultaneously.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COMFYUI_URL = 'http://127.0.0.1:8188';
const COMFYUI_INPUT = 'D:/ComfyUI_windows_portable/ComfyUI/input';
const COMFYUI_OUTPUT = 'D:/ComfyUI_windows_portable/ComfyUI/output';
const PROJECT_ROOT = path.resolve('../../..');
const COURSE_DIR = path.resolve('.');

const SEG_DURATION = 18;
const CROSSFADE = 1.5;
const EFFECTIVE_DUR = SEG_DURATION - CROSSFADE;

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON DATA (from AVATAR-VIDEO-PRODUCTION-PLAN.md)
// ═══════════════════════════════════════════════════════════════════════════════

const LESSONS = [
  { id: 'lesson-0-1', module: 0, presenter: 'female' },
  { id: 'lesson-1-1', module: 1, presenter: 'male' },
  { id: 'lesson-1-2', module: 1, presenter: 'female' },
  { id: 'lesson-1-3', module: 1, presenter: 'male' },
  { id: 'lesson-2-1', module: 2, presenter: 'female' },
  { id: 'lesson-2-2', module: 2, presenter: 'male' },
  { id: 'lesson-2-3', module: 2, presenter: 'female' },
  { id: 'lesson-3-1', module: 3, presenter: 'male' },
  { id: 'lesson-3-2', module: 3, presenter: 'female' },
  { id: 'lesson-3-3', module: 3, presenter: 'male' },
  { id: 'lesson-4-1', module: 4, presenter: 'female' },
  { id: 'lesson-4-2', module: 4, presenter: 'male' },
  { id: 'lesson-4-3', module: 4, presenter: 'female' },
  { id: 'lesson-5-1', module: 5, presenter: 'male' },
  { id: 'lesson-5-2', module: 5, presenter: 'female' },
  { id: 'lesson-6-1', module: 6, presenter: 'male' },
  { id: 'lesson-6-2', module: 6, presenter: 'female' },
  { id: 'lesson-6-3', module: 6, presenter: 'male' },
  { id: 'lesson-7-1', module: 7, presenter: 'female' },
  { id: 'lesson-7-2', module: 7, presenter: 'male' },
  { id: 'lesson-7-3', module: 7, presenter: 'female' },
  { id: 'lesson-7-4', module: 7, presenter: 'male' },
  { id: 'lesson-7-5', module: 7, presenter: 'male' },
  { id: 'lesson-8-1', module: 8, presenter: 'female' },
  { id: 'lesson-8-2', module: 8, presenter: 'male' },
  { id: 'lesson-8-3', module: 8, presenter: 'female' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHARACTERS, OUTFITS, SHOT CYCLE
// ═══════════════════════════════════════════════════════════════════════════════

const CHARACTERS = {
  female: 'A confident Latina woman in her early 30s with dark shoulder-length wavy hair',
  male: 'A professional American man in his late 30s with short brown hair',
};

const OUTFITS = {
  0: 'a smart casual navy blue V-neck top with a thin gold necklace',
  1: 'a tailored charcoal blazer over a crisp white blouse',
  2: 'an elegant dark green blazer over a cream blouse',
  3: 'a soft gray cardigan over a light blue top',
  4: 'a structured burgundy blazer over a clean white top',
  5: 'a warm camel jacket over a dark top',
  6: 'a fitted black turtleneck with subtle silver earrings',
  7: 'a relaxed linen blazer over a coral top',
  8: 'a sharp navy blazer over a white top with a small gold lapel pin',
};

// Shot cycle — no same-shot repeated back-to-back
const SHOT_CYCLE = [1, 2, 3, 4, 2, 5, 3, 4, 2, 1, 3, 2, 5, 4, 3, 2, 1, 5, 2, 3, 4, 2, 5, 3];

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE SCENE DESCRIPTIONS — 5 per module (wide, medium, closeup, angle, medwide)
// Each description matches what the model SEES for that specific shot framing.
// Close-ups NEVER describe full environments. Wide shots show everything.
// NEVER use left/right directional references.
// ═══════════════════════════════════════════════════════════════════════════════

const SCENES = {
  // Module 0: Highway / Dashboard Entry — car visible (ONLY module with a vehicle)
  0: [
    /* wide    */ 'Golden hour Florida highway at sunset, warm amber lighting, open road stretching to the horizon, a dark sedan parked nearby, warm evening sky with orange and gold clouds',
    /* medium  */ 'Golden hour Florida highway at sunset, warm amber lighting, a dark sedan partially visible behind, dramatic orange and gold sunset clouds, road fading into the background',
    /* closeup */ 'Warm golden hour lighting, soft blurred bokeh background of sunset sky and distant landscape, out-of-focus golden and amber tones, intimate warm atmosphere',
    /* angle   */ 'Golden hour Florida highway at sunset, warm amber lighting, a dark sedan visible nearby, open road stretching into the distance, dramatic orange and gold sunset sky',
    /* medwide */ 'Dramatic golden hour Florida highway at sunset, intense warm amber and red-orange lighting, a dark sedan nearby, vast open road stretching to the horizon, dramatic red and orange sunset sky with layered clouds',
  ],
  // Module 1: Downtown Orlando — glass towers, palm-lined boulevard
  1: [
    /* wide    */ 'Golden hour downtown Orlando, modern glass office towers catching warm light, royal palm trees lining the boulevard, decorative streetlights, warm amber sunlight flooding the urban canyon',
    /* medium  */ 'Downtown Orlando backdrop partially visible, glass buildings catching golden light, warm amber urban tones fading into the background',
    /* closeup */ 'Warm golden lighting, soft blurred urban bokeh of amber and steel blue tones, out-of-focus glass building reflections, intimate warm atmosphere',
    /* angle   */ 'Downtown Orlando at golden hour, glass tower visible nearby, royal palm trees, warm amber sunlight casting rays through the urban canyon',
    /* medwide */ 'Golden hour downtown Orlando, wide urban boulevard with glass towers and storefronts, royal palm trees, decorative streetlights, dramatic warm light casting long shadows',
  ],
  // Module 2: Financial District — corporate glass, reflecting pools
  2: [
    /* wide    */ 'Corporate office park at golden hour, sleek glass facades reflecting warm light, manicured grounds with reflecting pools, modern professional architecture, warm amber afternoon light',
    /* medium  */ 'Financial district backdrop partially visible, glass facades catching warm light, manicured corporate grounds fading into warm background, professional atmosphere',
    /* closeup */ 'Warm professional golden lighting, soft blurred architectural bokeh of glass reflections and warm amber tones, out-of-focus corporate structures, intimate atmosphere',
    /* angle   */ 'Corporate office park at golden hour, glass building facade visible nearby, reflecting pool catching warm light, manicured grounds, professional atmosphere',
    /* medwide */ 'Golden hour financial district, wide corporate boulevard with glass towers and reflecting pools, manicured grounds, warm amber light flooding the scene',
  ],
  // Module 3: Rocket Base — flat marshland, launch towers, vast sky
  3: [
    /* wide    */ 'Flat Florida marshland at golden hour, launch towers on the distant horizon, vast open sky with dramatic clouds, warm amber lighting, aerospace infrastructure silhouetted against sunset',
    /* medium  */ 'Cape Canaveral backdrop partially visible, launch structures on the horizon, vast sky with warm clouds, open atmosphere fading into the background',
    /* closeup */ 'Warm golden lighting, soft blurred sky bokeh of amber and blue tones, out-of-focus vast open atmosphere, intimate natural warmth',
    /* angle   */ 'Florida marshland at golden hour, launch tower visible nearby on the horizon, dramatic open sky, warm amber lighting, inspiring aerospace atmosphere',
    /* medwide */ 'Golden hour Florida marshland, vast open sky stretching overhead, launch towers on the distant horizon, dramatic orange and gold clouds, warm amber light across the flat landscape',
  ],
  // Module 4: Theme Park — Ferris wheel, coasters, festive (NO castles, NO Disney/Universal)
  4: [
    /* wide    */ 'Colorful theme park boulevard at golden hour, Ferris wheel and roller coaster structures against the warm sky, festive architecture, tropical landscaping, warm festive lighting beginning to glow',
    /* medium  */ 'Theme park backdrop partially visible, festive architecture catching warm light, ride structures fading into the background, warm colorful atmosphere',
    /* closeup */ 'Warm festive golden lighting, soft blurred colorful bokeh of ride lights and sunset, out-of-focus warm tones with hints of festive color, intimate atmosphere',
    /* angle   */ 'Theme park boulevard at golden hour, Ferris wheel visible nearby, colorful architecture, festive lighting beginning to glow, tropical landscaping',
    /* medwide */ 'Golden hour theme park boulevard, wide promenade with Ferris wheel and ride structures, festive architecture and tropical landscaping, warm amber light mixing with colorful festive glow',
  ],
  // Module 5: Port / Shopping — shipping cranes, waterfront, commercial
  5: [
    /* wide    */ 'Commercial port area at golden hour, shipping cranes and container infrastructure in the distance, waterfront promenade, warm amber coastal light, urban commercial atmosphere',
    /* medium  */ 'Port district backdrop partially visible, shipping infrastructure on the horizon, waterfront buildings catching warm light, warm commercial atmosphere fading into background',
    /* closeup */ 'Warm commercial golden lighting, soft blurred urban bokeh of amber and coastal tones, out-of-focus waterfront warmth, intimate atmosphere',
    /* angle   */ 'Commercial port area at golden hour, shipping cranes visible nearby, waterfront promenade, warm amber light, bustling commercial atmosphere',
    /* medwide */ 'Golden hour commercial port district, wide waterfront promenade with shipping cranes and container infrastructure, commercial buildings, warm amber coastal light flooding the scene',
  ],
  // Module 6: Beach — ocean, sandy dunes, sea oats, coastal
  6: [
    /* wide    */ 'Coastal Florida beach at golden hour, turquoise ocean stretching to the horizon, sandy dunes with sea oats, gentle waves catching warm light, relaxed sunset atmosphere',
    /* medium  */ 'Beach backdrop partially visible, ocean and sandy shore fading into warm golden background, gentle sea breeze atmosphere, warm coastal golden lighting',
    /* closeup */ 'Warm coastal golden lighting, soft blurred ocean bokeh of turquoise and amber tones, out-of-focus sandy warmth, gentle atmospheric glow, intimate atmosphere',
    /* angle   */ 'Florida beach at golden hour, ocean visible nearby, sandy dunes with sea oats, gentle waves catching warm light, relaxed coastal atmosphere',
    /* medwide */ 'Golden hour coastal Florida, wide beach with turquoise water and sandy dunes, sea oats swaying gently, dramatic orange and gold sunset reflecting on the ocean, relaxed atmosphere',
  ],
  // Module 7: River Springs — cypress trees, green water, Spanish moss
  7: [
    /* wide    */ 'Natural Florida springs at golden hour, crystal-clear green water reflecting cypress trees, Spanish moss hanging from branches, lush green vegetation, warm dappled natural light',
    /* medium  */ 'River springs backdrop partially visible, cypress trees and green water fading into warm background, Spanish moss visible, warm natural dappled lighting',
    /* closeup */ 'Warm natural dappled lighting, soft blurred green forest bokeh of cypress and spring water reflections, out-of-focus lush green tones, intimate natural atmosphere',
    /* angle   */ 'Natural Florida springs at golden hour, cypress trees visible nearby, crystal-clear green water, Spanish moss hanging from branches, warm natural lighting',
    /* medwide */ 'Golden hour Florida springs, wide natural scene with crystal-clear green water, towering cypress trees with Spanish moss, lush vegetation, warm dappled sunlight filtering through canopy',
  ],
  // Module 8: UCF Headquarters — red brick, live oaks, academic (NO university logos/mascots)
  8: [
    /* wide    */ 'University campus at golden hour, red brick academic buildings with modern architecture, live oak trees with spreading canopy, warm golden afternoon light on campus grounds',
    /* medium  */ 'University campus backdrop partially visible, red brick buildings catching warm light, live oak branches fading into background, warm academic golden lighting',
    /* closeup */ 'Warm academic golden lighting, soft blurred campus bokeh of brick and green tones, out-of-focus live oak canopy, intimate scholarly atmosphere',
    /* angle   */ 'University campus at golden hour, red brick building visible nearby, live oak trees with spreading canopy, modern academic architecture, warm golden afternoon light',
    /* medwide */ 'Golden hour university campus, wide academic grounds with red brick buildings and live oaks, spreading canopy creating dappled shadows, warm golden afternoon light flooding the campus',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

// LTX video — comprehensive anti-text + anti-static-face
const LTX_NEG = [
  'text, words, letters, subtitles, captions, watermark, logo, title card',
  'lower third, typography, writing, signage, banner, label, name tag, credit',
  'overlay graphics, HUD, UI elements, progress bar',
  'closed mouth, static face, frozen expression, mannequin, wax figure, puppet',
  'pc game, console game, video game, cartoon, childish, anime',
  'ugly, blurry, distorted face, deformed mouth, asymmetric eyes, uncanny valley',
  'extra fingers, mutated hands, poorly drawn face, mutation, deformed',
].join(', ');

// Qwen Image Edit — anti-text + quality
const SHOT_NEG = 'text, words, letters, signs, banners, logos, writing, typography, ugly, blurry, distorted face, deformed, extra fingers, mutated hands, poorly drawn face';

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build Qwen Image Edit prompt for shot generation (still image).
 * Takes the existing avatar and reframes it to a different camera angle.
 */
function buildShotEditPrompt(shotNum, lesson) {
  const charDesc = CHARACTERS[lesson.presenter];
  const outfit = OUTFITS[lesson.module];
  const scenes = SCENES[lesson.module];

  let framing, env;
  switch (shotNum) {
    case 1: // Wide — waist up, full environment
      framing = 'shown from waist up with full environment visible, character centered in the composition, confident standing posture';
      env = scenes[0];
      break;
    case 2: // Medium — chest up, hand gesture
      framing = 'shown from chest up, one hand extended in a natural open-palm conversational gesture';
      env = scenes[1];
      break;
    case 3: // Close-up — face and shoulders fill frame
      framing = 'extreme close-up with face and shoulders filling the entire frame, warm engaging eye contact with the viewer, clean facial features with confident expression';
      env = scenes[2];
      break;
    case 4: // Three-quarter — slight angle, gesture
      framing = 'seen from a slight three-quarter angle, one hand raised in a natural conversational gesture';
      env = scenes[3];
      break;
    case 5: // Medium-wide — hips up, relaxed
      framing = 'shown from hips up with relaxed confident posture, more environment and sky visible';
      env = scenes[4];
      break;
  }

  return [
    `Cinematic digital painting, ${framing}, ${charDesc}, wearing ${outfit}, ${env},`,
    'warm golden hour lighting, painterly brushstroke texture, cinematic color grading.',
    'NOT a photograph NOT photorealistic, digital painting with visible paint texture.',
    'NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography.',
  ].join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION-ONLY LTX PROMPTS (with action variants for scene diversity)
//
// CRITICAL: For I2V (image-to-video), prompts must describe ONLY MOTION.
// The input image already provides all visual info (identity, clothing, scene).
// The audio provides lip-sync timing. The text prompt shapes motion style only.
//
// Prompt enhancer (node 340:342) MUST be disabled (sampling_mode: "off").
// When enabled, it rewrites prompts via Gemma 3 12B → causes hallucinations.
//
// RULES:
// 1. Describe MOTION ONLY — never describe scene, character, or camera framing.
// 2. Include lip-sync instruction ("speaks to the camera with natural lip movements").
// 3. Keep prompts short: 20-40 words. Long prompts confuse the model.
// 4. Use action variants when a shot repeats for visual diversity.
// 5. Match motion to shot type: wide=body shifts, close-up=micro-expressions.
// ═══════════════════════════════════════════════════════════════════════════════

const VERIFIED_SHOTS = {
  'lesson-0-1': {
    // Shot 1: WIDE — waist up
    1: {
      actions: [
        'A woman speaks confidently to the camera with natural lip movements, relaxed posture, subtle weight shifts, hair gently swaying in a light breeze',
        'A woman speaks to the camera with natural lip movements, slight forward lean sharing a confidence, warm steady gaze, hair gently moving in an evening breeze',
        'A woman speaks to the camera with natural lip movements, relaxed upright posture with occasional gentle nod for emphasis, hair swaying in a light breeze, confident warm energy',
      ],
    },

    // Shot 2: MEDIUM — chest up
    2: {
      actions: [
        'A woman speaks to the camera with clear lip movements, occasional subtle hand gestures for emphasis, natural head movements, hair gently swaying in a light breeze',
        'A woman speaks to the camera with clear lip movements, emphatic point with a slight forward lean and gentle nod, animated conversational energy, hair gently moving',
        'A woman speaks to the camera with clear lip movements, relaxed confident delivery with a knowing smile between sentences, hair gently swaying',
        'A woman speaks to the camera with clear lip movements, warm animated delivery with natural hand movement for emphasis, gentle head tilts, hair moving softly',
      ],
    },

    // Shot 3: CLOSE-UP — face fills frame
    3: {
      actions: [
        'A woman speaks directly to the camera with natural lip movements, warm engaging eye contact, subtle micro-expressions and small smiles between phrases, minimal head movement',
        'A woman speaks directly to the camera with natural lip movements, confident gaze, slight eyebrow raise while making a key point, composed warm expression',
        'A woman speaks directly to the camera with natural lip movements, intimate warm delivery, a slight knowing nod, gentle smile forming naturally',
      ],
    },

    4: {
      actions: [
        'A woman speaks toward the camera with natural lip movements, natural hand gestures emphasizing her points, subtle head turns, hair gently swaying in a light breeze',
        'A woman speaks toward the camera with natural lip movements, animated open-palm gesture presenting an idea, engaged forward-leaning body language, hair gently moving',
        'A woman speaks toward the camera with natural lip movements, gentle deliberate hand movement for emphasis, shifting weight naturally, confident warm expression, hair swaying',
      ],
    },

    // Shot 5: MEDIUM-WIDE — relaxed posture
    5: {
      actions: [
        'A woman speaks to the camera with natural lip movements, relaxed natural body language, subtle weight shifts, hair gently moving in an evening breeze, warm confident demeanor',
        'A woman speaks to the camera with natural lip movements, casual confident stance with a slight lean toward the camera, warm approachable energy, hair gently swaying',
      ],
    },
  },
};

/**
 * Build LTX-2.3 MOTION-ONLY video prompt.
 *
 * For I2V, the image provides all visual info (identity, clothing, scene).
 * The audio provides lip-sync. The prompt controls MOTION STYLE ONLY.
 * Keep prompts short (20-40 words). Never describe the scene or character.
 *
 * @param {number} shotNum — which shot image (1-5)
 * @param {object} lesson — lesson data
 * @param {number} variantIdx — how many times this shot has been used already
 *                              (cycles through action variants for scene diversity)
 */
function buildLtxPrompt(shotNum, lesson, variantIdx = 0) {
  // Use verified motion prompts when available
  const verified = VERIFIED_SHOTS[lesson.id]?.[shotNum];
  if (verified) {
    return verified.actions[variantIdx % verified.actions.length];
  }

  // Template fallback — motion-only prompts per shot type.
  // These describe ONLY motion, gestures, and energy — never scene/character/camera.
  const gender = lesson.presenter;
  const subject = gender === 'female' ? 'A woman' : 'A man';
  const hairMotion = gender === 'female' ? ', hair gently swaying in a light breeze' : '';

  const TEMPLATE_ACTIONS = {
    1: [ // Wide — body shifts, posture
      `${subject} speaks confidently to the camera with natural lip movements, relaxed posture, subtle weight shifts${hairMotion}`,
      `${subject} speaks to the camera with natural lip movements, slight forward lean, warm steady gaze${hairMotion}`,
      `${subject} speaks to the camera with natural lip movements, relaxed upright posture with occasional gentle nod${hairMotion}`,
    ],
    2: [ // Medium — hand gestures, head movements
      `${subject} speaks to the camera with clear lip movements, occasional subtle hand gestures, natural head movements${hairMotion}`,
      `${subject} speaks to the camera with clear lip movements, emphatic point with a slight forward lean and gentle nod${hairMotion}`,
      `${subject} speaks to the camera with clear lip movements, relaxed confident delivery with a knowing smile between sentences${hairMotion}`,
      `${subject} speaks to the camera with clear lip movements, warm animated delivery with natural hand movement, gentle head tilts${hairMotion}`,
    ],
    3: [ // Close-up — micro-expressions, eye contact
      `${subject} speaks directly to the camera with natural lip movements, warm engaging eye contact, subtle micro-expressions and small smiles`,
      `${subject} speaks directly to the camera with natural lip movements, confident gaze, slight eyebrow raise while making a point`,
      `${subject} speaks directly to the camera with natural lip movements, intimate warm delivery, a slight knowing nod, gentle smile forming naturally`,
    ],
    4: [ // Three-quarter — gestures, head turns
      `${subject} speaks toward the camera with natural lip movements, natural hand gestures emphasizing points, subtle head turns${hairMotion}`,
      `${subject} speaks toward the camera with natural lip movements, animated open-palm gesture presenting an idea, engaged body language${hairMotion}`,
      `${subject} speaks toward the camera with natural lip movements, gentle deliberate hand movement for emphasis, shifting weight naturally${hairMotion}`,
    ],
    5: [ // Medium-wide — relaxed body language
      `${subject} speaks to the camera with natural lip movements, relaxed natural body language, subtle weight shifts${hairMotion}, warm confident demeanor`,
      `${subject} speaks to the camera with natural lip movements, casual confident stance, slight lean toward the camera, warm approachable energy${hairMotion}`,
    ],
  };

  const actions = TEMPLATE_ACTIONS[shotNum];
  return actions[variantIdx % actions.length];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fileExists(fp) {
  return fs.existsSync(fp) && fs.statSync(fp).size > 0;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getAudioDuration(wavPath) {
  try {
    const out = execSync(`ffprobe -v quiet -print_format json -show_format "${wavPath}"`, { encoding: 'utf-8' });
    return parseFloat(JSON.parse(out).format.duration);
  } catch { return 0; }
}

async function comfyuiHealthCheck() {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    return res.ok;
  } catch { return false; }
}

async function comfyuiQueueEmpty() {
  try {
    const res = await fetch(`${COMFYUI_URL}/queue`);
    const data = await res.json();
    return data.queue_running?.length === 0 && data.queue_pending?.length === 0;
  } catch { return false; }
}

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

async function pollCompletion(promptId, timeoutMs = 900000) {
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
  throw new Error('Timeout waiting for ComfyUI');
}

function copyToComfyInput(srcPath, destFilename) {
  fs.copyFileSync(srcPath, path.join(COMFYUI_INPUT, destFilename));
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE A: SHOT GENERATION (Qwen Image Edit)
// Generates 5 camera angle variations from the existing avatar image.
// ~3-5s per shot, ~30s per lesson.
// ═══════════════════════════════════════════════════════════════════════════════

async function stageA_generateShots(lesson) {
  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
  ensureDir(shotDir);

  // Check if all 5 shots already exist
  const existing = [1, 2, 3, 4, 5].filter(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
  if (existing.length === 5) {
    console.log(`    [SKIP] All 5 shots exist for ${lesson.id}`);
    return true;
  }

  // Load avatar image
  const avatarPath = path.join(COURSE_DIR, `media/images/avatars/scenes/${lesson.id}-avatar.png`);
  if (!fileExists(avatarPath)) {
    console.error(`    ✗ Missing avatar: ${lesson.id}-avatar.png`);
    return false;
  }

  // Copy avatar to ComfyUI input
  const avatarFilename = `ucf-${lesson.id}-avatar-ref.png`;
  copyToComfyInput(avatarPath, avatarFilename);

  // Load Qwen Image Edit workflow
  const workflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/02_qwen_Image_edit_subgraphed.json');
  if (!fs.existsSync(workflowPath)) {
    console.error(`    ✗ Missing workflow: 02_qwen_Image_edit_subgraphed.json`);
    return false;
  }

  for (const shotNum of [1, 2, 3, 4, 5]) {
    const shotPath = path.join(shotDir, `shot-${shotNum}.png`);
    if (fileExists(shotPath)) {
      console.log(`    [SKIP] shot-${shotNum}.png exists`);
      continue;
    }

    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

    // Set input image (node 78)
    workflow['78'].inputs.image = avatarFilename;

    // Set positive prompt (node 115:111)
    const prompt = buildShotEditPrompt(shotNum, lesson);
    workflow['115:111'].inputs.prompt = prompt;

    // Set negative prompt (node 115:110) — empty per plan
    if (workflow['115:110']?.inputs) {
      workflow['115:110'].inputs.prompt = SHOT_NEG;
    }

    // Randomize seed
    if (workflow['115:3']?.inputs) {
      workflow['115:3'].inputs.seed = Math.floor(Math.random() * 1e15);
    }

    // Output filename
    workflow['60'].inputs.filename_prefix = `avatar-shots/${lesson.id}-shot-${shotNum}`;

    console.log(`    Shot ${shotNum}/5 (${['Wide','Medium','Close-up','3/4 Angle','Med-Wide'][shotNum-1]})...`);
    const shotStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId, 120000);

      const outputs = result.outputs?.['60'];
      if (outputs?.images?.[0]) {
        const img = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, shotPath);
          const elapsed = ((Date.now() - shotStart) / 1000).toFixed(0);
          console.log(`    ✓ shot-${shotNum}.png (${elapsed}s)`);
        }
      }
    } catch (e) {
      console.error(`    ✗ shot-${shotNum} FAILED: ${e.message}`);
      return false;
    }

    await sleep(2000);
  }

  const allExist = [1, 2, 3, 4, 5].every(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
  return allExist;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE B: VIDEO SEGMENT GENERATION (LTX-2.3)
// 18s segments at 1280x720, cycling through 5 shot angles.
// Each segment gets a per-shot LTX prompt matching its camera framing.
// ~3 min per segment on RTX 4090.
// ═══════════════════════════════════════════════════════════════════════════════

async function stageB_generateSegments(lesson) {
  const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments/${lesson.id}-multishot`);
  ensureDir(segDir);

  // Concat scene audio into one WAV
  const audioScenesDir = path.join(COURSE_DIR, `media/audio/scenes/${lesson.id}`);
  const vdPath = path.join(COURSE_DIR, `video-scripts/${lesson.id}-video-data.json`);
  if (!fs.existsSync(vdPath)) {
    console.error(`    ✗ Missing video-data: ${lesson.id}-video-data.json`);
    return [];
  }
  const vd = JSON.parse(fs.readFileSync(vdPath, 'utf-8'));

  const sceneAudioFiles = vd.scenes
    .map(s => path.join(audioScenesDir, `${lesson.id}-scene-${s.sceneNumber}.wav`))
    .filter(f => fs.existsSync(f));

  if (sceneAudioFiles.length === 0) {
    console.error(`    ✗ No audio files found for ${lesson.id}`);
    return [];
  }

  const fullAudioPath = path.join(COMFYUI_INPUT, `ucf-${lesson.id}-full.wav`);

  if (sceneAudioFiles.length === 1) {
    fs.copyFileSync(sceneAudioFiles[0], fullAudioPath);
  } else {
    const concatList = path.join(COMFYUI_INPUT, `ucf-${lesson.id}-audiolist.txt`);
    fs.writeFileSync(concatList, sceneAudioFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -ar 16000 -ac 1 -c:a pcm_s16le "${fullAudioPath}"`, { stdio: 'pipe' });
    try { fs.unlinkSync(concatList); } catch {}
  }

  const totalDuration = getAudioDuration(fullAudioPath);
  if (totalDuration <= 0) {
    console.error(`    ✗ Zero audio duration for ${lesson.id}`);
    return [];
  }

  const numSegments = Math.ceil(totalDuration / EFFECTIVE_DUR);
  console.log(`    Audio: ${totalDuration.toFixed(1)}s → ${numSegments} segments`);

  // Load LTX workflow template
  const ltxWorkflowPath = path.join(PROJECT_ROOT, 'workflows/comfyui/video_ltx2_3_ia2v.json');
  if (!fs.existsSync(ltxWorkflowPath)) {
    console.error(`    ✗ Missing workflow: video_ltx2_3_ia2v.json`);
    return [];
  }

  const segmentPaths = [];
  const segStart = Date.now();

  // Track how many times each shot has been used — cycles through action variants
  const shotUsage = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * EFFECTIVE_DUR;
    const segDur = Math.min(SEG_DURATION, totalDuration - offset);
    if (segDur < 2) break;

    const segVideoPath = path.join(segDir, `seg-${String(seg).padStart(3, '0')}.mp4`);

    // Resume: skip existing segments
    if (fileExists(segVideoPath)) {
      console.log(`    [SKIP] seg${seg} exists`);
      segmentPaths.push(segVideoPath);
      continue;
    }

    // Pick shot for this segment
    const shotNum = SHOT_CYCLE[seg % SHOT_CYCLE.length];
    const shotImage = path.join(shotDir, `shot-${shotNum}.png`);

    if (!fileExists(shotImage)) {
      console.error(`    ✗ Missing shot image: ${lesson.id}/shot-${shotNum}.png`);
      continue;
    }

    // Copy shot image to ComfyUI input
    const imageFilename = `ucf-${lesson.id}-ms-seg${seg}.png`;
    copyToComfyInput(shotImage, imageFilename);

    // Trim audio for this segment
    const audioFilename = `ucf-${lesson.id}-ms-seg${seg}.wav`;
    execSync(
      `ffmpeg -y -i "${fullAudioPath}" -ss ${offset} -t ${segDur} -ar 16000 -ac 1 -c:a pcm_s16le "${path.join(COMFYUI_INPUT, audioFilename)}"`,
      { stdio: 'pipe' }
    );

    // Configure workflow
    const workflow = JSON.parse(fs.readFileSync(ltxWorkflowPath, 'utf-8'));
    workflow['269'].inputs.image = imageFilename;
    workflow['276'].inputs.audio = audioFilename;
    workflow['276'].inputs.audioUI = '';
    workflow['340:330'].inputs.value = 1280;
    workflow['340:324'].inputs.value = 720;
    workflow['340:331'].inputs.value = segDur;

    // === CRITICAL LTX-2.3 SETTINGS ===
    const variantIdx = shotUsage[shotNum];
    shotUsage[shotNum]++;
    const motionPrompt = buildLtxPrompt(shotNum, lesson, variantIdx);
    // BYPASS prompt enhancer entirely — rewire CLIPTextEncode (340:306) to read
    // our prompt directly instead of from the enhancer (340:342).
    // Setting sampling_mode="off" outputs EMPTY text → frozen face with no motion.
    // Instead, we inject our prompt string directly into the CLIP encoder's text input.
    workflow['340:306'].inputs.text = motionPrompt;  // Direct string, bypasses enhancer
    workflow['340:319'].inputs.value = motionPrompt;  // Also set the original field for logging
    // Keep strength and cfg at ORIGINAL values that produced working lip-sync
    const isCloseUp = shotNum === 3;
    workflow['340:334'].inputs.img_compression = isCloseUp ? 15 : 10;
    workflow['340:325'].inputs.strength = isCloseUp ? 0.65 : 0.75;
    workflow['340:293'].inputs.strength_model = 0.4;
    // cfg stays at workflow default of 1.0 — don't override
    // Negative prompt + motion-only positive prompt
    workflow['340:314'].inputs.text = LTX_NEG;
    workflow['340:286'].inputs.noise_seed = Math.floor(Math.random() * 1e15);
    workflow['341'].inputs.filename_prefix = `video/ucf-${lesson.id}-ms-seg${seg}`;

    const shotName = ['Wide', 'Medium', 'Close-up', '3/4 Angle', 'Med-Wide'][shotNum - 1];
    const verified = VERIFIED_SHOTS[lesson.id]?.[shotNum];
    const totalVariants = verified ? verified.actions.length : 3;
    console.log(`    [${timestamp()}] Seg ${seg + 1}/${numSegments}: shot-${shotNum} (${shotName}), variant ${(variantIdx % totalVariants) + 1}/${totalVariants}, ${segDur.toFixed(1)}s from ${offset.toFixed(1)}s`);

    const thisSegStart = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      const outputs = result.outputs?.['341'];
      if (outputs?.images?.[0]) {
        const vid = outputs.images[0];
        const comfyPath = path.join(COMFYUI_OUTPUT, vid.subfolder || '', vid.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, segVideoPath);
          segmentPaths.push(segVideoPath);
          const elapsed = ((Date.now() - thisSegStart) / 1000).toFixed(0);
          console.log(`    ✓ seg${seg} (${elapsed}s) — shot-${shotNum}`);
        } else {
          console.error(`    ✗ seg${seg} output file not found in ComfyUI output`);
        }
      } else {
        console.error(`    ✗ seg${seg} no output in result`);
      }
    } catch (e) {
      console.error(`    ✗ seg${seg} FAILED: ${e.message}`);
    }

    // GPU rest between segments
    if (seg < numSegments - 1) await sleep(5000);
  }

  // Keep a copy of the full audio for Stage C (original Qwen3-TTS audio)
  const stableAudioPath = path.join(segDir, 'full-audio-original.wav');
  if (fs.existsSync(fullAudioPath)) {
    fs.copyFileSync(fullAudioPath, stableAudioPath);
    try { fs.unlinkSync(fullAudioPath); } catch {}
  }

  const totalElapsed = ((Date.now() - segStart) / 1000 / 60).toFixed(1);
  console.log(`    Segments: ${segmentPaths.length}/${numSegments} generated in ${totalElapsed}min`);

  return segmentPaths;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE C: ASSEMBLY (FFmpeg crossfade)
// Crossfade dissolve between segments for natural camera-cut feel.
// Fallback: simple concat with trim if xfade fails.
// ═══════════════════════════════════════════════════════════════════════════════

function stageC_assembleVideo(lesson, segmentPaths) {
  if (segmentPaths.length === 0) {
    console.error(`    ✗ No segments to assemble for ${lesson.id}`);
    return null;
  }

  const outputPath = path.join(COURSE_DIR, `media/video/avatars/${lesson.id}-avatar.mp4`);
  const segDir = path.join(COURSE_DIR, `media/video/avatars/segments/${lesson.id}-multishot`);

  // Use original Qwen3-TTS audio instead of LTX re-encoded audio.
  // LTX re-encodes audio (16kHz mono → 48kHz stereo AAC) causing quality differences
  // between segments. The original concatenated WAV sounds consistent throughout.
  const originalAudio = path.join(segDir, 'full-audio-original.wav');
  const useOriginalAudio = fs.existsSync(originalAudio);
  if (useOriginalAudio) {
    console.log(`    Using original Qwen3-TTS audio (bypassing LTX re-encoding)`);
  }

  if (segmentPaths.length === 1) {
    if (useOriginalAudio) {
      // Mux original audio onto single segment's video
      execSync(
        `ffmpeg -y -i "${segmentPaths[0]}" -i "${originalAudio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
        { stdio: 'pipe' }
      );
      console.log(`    ✓ Single segment + original audio`);
    } else {
      fs.copyFileSync(segmentPaths[0], outputPath);
      console.log(`    ✓ Single segment copied as final`);
    }
    return outputPath;
  }

  // Assemble video with crossfade (VIDEO ONLY), then mux original audio
  console.log(`    Assembling ${segmentPaths.length} segments with ${CROSSFADE}s crossfade...`);

  const videoOnlyPath = path.join(segDir, 'assembled-video-only.mp4');

  try {
    // Build video-only xfade filter chain (no audio crossfade needed)
    let videoFilters = [];
    let currentInput = '[0:v]';
    for (let i = 1; i < segmentPaths.length; i++) {
      const nextInput = `[${i}:v]`;
      const outputLabel = i < segmentPaths.length - 1 ? `[v${i}]` : '[vout]';
      const offset = (i * EFFECTIVE_DUR).toFixed(2);
      videoFilters.push(`${currentInput}${nextInput}xfade=transition=fade:duration=${CROSSFADE}:offset=${offset}${outputLabel}`);
      currentInput = outputLabel;
    }

    const filterComplex = videoFilters.join(';');

    const filterScriptPath = path.join(segDir, 'filter-complex.txt');
    fs.writeFileSync(filterScriptPath, filterComplex);

    const inputArgs = segmentPaths.map(p => `-i "${p}"`).join(' ');
    const cmd = `ffmpeg -y ${inputArgs} -filter_complex_script "${filterScriptPath}" -map "[vout]" -an -c:v libx264 -crf 18 -preset fast "${videoOnlyPath}"`;

    execSync(cmd, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
    console.log(`    ✓ Video crossfade complete`);

  } catch (e) {
    console.log(`    Crossfade failed (${e.message.substring(0, 100)}), using fallback concat...`);

    // Fallback: simple concat with trim for clean cuts (video only)
    const trimmedPaths = [];
    for (let i = 0; i < segmentPaths.length; i++) {
      const trimmed = path.join(segDir, `trimmed-${String(i).padStart(3, '0')}.mp4`);
      if (i === 0) {
        execSync(
          `ffmpeg -y -i "${segmentPaths[i]}" -t ${SEG_DURATION - 0.5} -an -c:v libx264 -crf 18 -preset fast "${trimmed}"`,
          { stdio: 'pipe' }
        );
      } else {
        execSync(
          `ffmpeg -y -i "${segmentPaths[i]}" -ss 0.75 -an -c:v libx264 -crf 18 -preset fast "${trimmed}"`,
          { stdio: 'pipe' }
        );
      }
      trimmedPaths.push(trimmed);
    }

    const concatList = path.join(segDir, 'concat-list.txt');
    fs.writeFileSync(concatList, trimmedPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatList}" -an -c:v libx264 -crf 18 -preset fast "${videoOnlyPath}"`,
      { stdio: 'pipe' }
    );
    console.log(`    ✓ Fallback concat complete`);
  }

  // Mux original audio onto the assembled video
  if (useOriginalAudio && fs.existsSync(videoOnlyPath)) {
    execSync(
      `ffmpeg -y -i "${videoOnlyPath}" -i "${originalAudio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
      { stdio: 'pipe' }
    );
    console.log(`    ✓ Original audio muxed → ${lesson.id}-avatar.mp4`);
    try { fs.unlinkSync(videoOnlyPath); } catch {}
  } else if (fs.existsSync(videoOnlyPath)) {
    // No original audio available — fall back to using LTX audio from segments
    console.log(`    ⚠ No original audio found, falling back to LTX audio`);
    // Re-assemble with audio this time
    const inputArgs = segmentPaths.map(p => `-i "${p}"`).join(' ');
    const concatList = path.join(segDir, 'concat-list-fallback.txt');
    fs.writeFileSync(concatList, segmentPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k "${outputPath}"`,
      { stdio: 'pipe' }
    );
    try { fs.unlinkSync(videoOnlyPath); } catch {}
  }

  return outputPath;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS ONE LESSON (Stages A → B → C)
// ═══════════════════════════════════════════════════════════════════════════════

async function processLesson(lesson, skipShots = false) {
  const lessonStart = Date.now();
  const mod = lesson.module;
  const gender = lesson.presenter;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${lesson.id.toUpperCase()} | Module ${mod} | ${gender.toUpperCase()}`);
  console.log(`  Outfit: ${OUTFITS[mod]}`);
  console.log(`${'═'.repeat(60)}`);

  // Stage A: Generate shot variations
  if (!skipShots) {
    console.log(`\n  [STAGE A] Shot Generation (Qwen Image Edit)`);
    const shotsOk = await stageA_generateShots(lesson);
    if (!shotsOk) {
      console.error(`  ✗ Shot generation failed for ${lesson.id} — skipping`);
      return false;
    }
  } else {
    // Verify shots exist even if skipping generation
    const shotDir = path.join(COURSE_DIR, `media/images/avatars/shots/${lesson.id}`);
    const allExist = [1, 2, 3, 4, 5].every(n => fileExists(path.join(shotDir, `shot-${n}.png`)));
    if (!allExist) {
      console.error(`  ✗ --skip-shots used but shots missing for ${lesson.id}`);
      return false;
    }
    console.log(`  [STAGE A] Skipped — shots verified`);
  }

  // Stage B: Generate video segments
  console.log(`\n  [STAGE B] Video Segments (LTX-2.3)`);
  const segmentPaths = await stageB_generateSegments(lesson);
  if (segmentPaths.length === 0) {
    console.error(`  ✗ No segments generated for ${lesson.id}`);
    return false;
  }

  // Stage C: Assemble final video
  console.log(`\n  [STAGE C] Assembly (FFmpeg)`);
  const outputPath = stageC_assembleVideo(lesson, segmentPaths);
  if (!outputPath || !fileExists(outputPath)) {
    console.error(`  ✗ Assembly failed for ${lesson.id}`);
    return false;
  }

  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  const videoDuration = getAudioDuration(outputPath);
  const totalElapsed = ((Date.now() - lessonStart) / 1000 / 60).toFixed(1);

  console.log(`\n  ✓ COMPLETE: ${lesson.id}-avatar.mp4`);
  console.log(`    ${segmentPaths.length} segments | ${videoDuration.toFixed(0)}s | ${fileSizeMB}MB | ${totalElapsed}min`);

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const lessonFilter = args.includes('--lesson') ? args[args.indexOf('--lesson') + 1] : null;
  const startFrom = args.includes('--start') ? args[args.indexOf('--start') + 1] : null;
  const skipShots = args.includes('--skip-shots');

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  AVATAR VIDEO PRODUCTION — UCF Business Course');
  console.log('  Multi-shot pipeline: Shots → Segments → Assembly');
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Lessons: ${lessonFilter || (startFrom ? `starting from ${startFrom}` : 'ALL (lesson-0-1 first)')}`);
  console.log(`  Skip shots: ${skipShots}`);
  console.log(`  Segment: ${SEG_DURATION}s | Crossfade: ${CROSSFADE}s | Resolution: 1280x720`);
  console.log(`  Started: ${new Date().toLocaleString()}`);
  console.log();

  // ComfyUI health check
  const healthy = await comfyuiHealthCheck();
  if (!healthy) {
    console.error('ERROR: ComfyUI is not running at', COMFYUI_URL);
    process.exit(1);
  }

  const queueClear = await comfyuiQueueEmpty();
  if (!queueClear) {
    console.error('ERROR: ComfyUI queue is not empty — clear it before starting');
    process.exit(1);
  }
  console.log('  ComfyUI: Connected, queue empty\n');

  // Determine lesson list
  let lessonsToProcess;
  if (lessonFilter) {
    const lesson = LESSONS.find(l => l.id === lessonFilter);
    if (!lesson) {
      console.error(`ERROR: Unknown lesson: ${lessonFilter}`);
      process.exit(1);
    }
    lessonsToProcess = [lesson];
  } else if (startFrom) {
    const startIdx = LESSONS.findIndex(l => l.id === startFrom);
    if (startIdx === -1) {
      console.error(`ERROR: Unknown lesson: ${startFrom}`);
      process.exit(1);
    }
    lessonsToProcess = LESSONS.slice(startIdx);
  } else {
    // Default: lesson-0-1 first, then rest in order
    lessonsToProcess = [...LESSONS];
  }

  const results = { success: [], failed: [] };
  const pipelineStart = Date.now();

  for (let i = 0; i < lessonsToProcess.length; i++) {
    const lesson = lessonsToProcess[i];

    try {
      const success = await processLesson(lesson, skipShots);
      if (success) {
        results.success.push(lesson.id);
      } else {
        results.failed.push(lesson.id);
      }
    } catch (e) {
      console.error(`\n  FATAL ERROR on ${lesson.id}: ${e.message}`);
      results.failed.push(lesson.id);
    }

    // GPU cooldown between lessons (30s)
    if (i < lessonsToProcess.length - 1) {
      console.log(`\n  Cooling down (30s)...`);
      await sleep(30000);
    }
  }

  // Summary
  const totalElapsed = ((Date.now() - pipelineStart) / 1000 / 60 / 60).toFixed(1);
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  PIPELINE COMPLETE');
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Finished: ${new Date().toLocaleString()}`);
  console.log(`  Total time: ${totalElapsed} hours`);
  console.log(`  Success: ${results.success.length} lessons`);
  if (results.failed.length > 0) {
    console.log(`  Failed: ${results.failed.length} — ${results.failed.join(', ')}`);
  }
  console.log();
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
