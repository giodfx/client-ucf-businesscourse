#!/usr/bin/env node
/**
 * Regenerate 5 Road Scene Images — Brian's Theme Feedback (April 7, 2026)
 *
 * Scenes to regenerate:
 *   scene-05: Space Center (rocket off to side, not centered on road)
 *   scene-06: Theme Park (roller coasters prominent, Ferris wheel background, castle entrance)
 *   scene-04: Beach (wide flat Daytona-style, calm, not windy)
 *   scene-03: Springs (circular spring pool visible through forest clearing)
 *   scene-10: UCF Campus (modern contemporary, NOT red brick Southern style)
 *
 * Usage:
 *   node regenerate-road-scenes-v2.mjs                # generate all 5
 *   node regenerate-road-scenes-v2.mjs --dry-run      # preview prompts only
 *   node regenerate-road-scenes-v2.mjs --scene scene-05-space-center  # single scene
 *   node regenerate-road-scenes-v2.mjs --force        # overwrite even if exists
 */
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const WF_PATH = 'g:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/image_qwen_2512_gguf.json';
const OUTPUT_DIR = path.resolve('media/images/road-scenes');

const SCENES = [
  {
    name: 'scene-05-rocket-launch',
    label: 'Space Center',
    feedback: 'Rocket off to the side, not centered on road. Space Center feel, not just launchpad.',
    prompt: `Cinematic digital painting, straight two-lane road stretching across flat Florida coastal marshland, low angle POV from the middle of the road looking straight ahead into golden atmospheric haze on the distant horizon. Low salt marsh grass and sandy scrub on both sides of the road. The road ahead is completely clear and open, nothing blocking the vanishing point. Far off to the RIGHT side of the frame, well away from the road, a massive white rectangular Vehicle Assembly Building and a single tall rocket on a launch tower stand against the dramatic sky, partially silhouetted. A small water tower near the complex. The space center structures are clearly to the RIGHT, separated from the road by wide empty marshland. The vast flat coastal marsh dominates the left side of the image. Deep blue sky overhead with dramatic clouds streaked orange and gold from the setting sun. Fresh asphalt with yellow center line receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant space center on the right, warm saturated colors with deep shadows, sense of vast open scale. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-06-theme-park',
    label: 'Theme Park',
    feedback: 'Roller coasters prominent, Ferris wheel in background, castle entrance, no weird hedges.',
    prompt: `Cinematic digital painting, wide four-lane boulevard stretching toward a sprawling theme park complex, low angle POV from the middle of the road looking straight ahead. Tall royal palm trees lining both sides of the road with colorful pennant flags strung between decorative lamp posts. Tropical flower beds and lush landscaping along the road shoulders. Ahead on the horizon, dramatic steel roller coaster tracks arch and loop prominently across the sky in bright red and yellow paint, a grand stone medieval fortress entrance with thick round towers and pointed rooftops rises in the center as the park gate, and a large Ferris wheel sits further back on the right side of the skyline. The fortress entrance has warm amber stone walls with iron portcullis gates, round turrets with cone roofs, and medieval banners hanging from the walls. NOT a Disney castle, NOT Cinderella castle, NOT a princess castle. Colorful ride towers and observation spires fill the panorama behind. Festive warm golden sunset light bathes the entire scene. Deep blue sky overhead transitioning to rich orange and gold at the horizon. Fresh asphalt with white lane markings. Painterly brushstrokes visible throughout, atmospheric haze softening the distant park, warm saturated festive colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-04-beach-coastal',
    label: 'Beach (Daytona-style wide)',
    feedback: 'Wide Daytona beach, transition from road to sand via access road and toll booth.',
    prompt: `Cinematic digital painting, a two-lane road that narrows ahead into a small sandy access road leading to a wide flat beach, low angle POV from the middle of the road looking straight ahead. In the middle distance where the asphalt ends, a small wooden beach access toll booth hut with a raised gate arm sits at the entrance to the sand. Beyond the toll booth, the road transitions to hard-packed golden sand. Past the sand entrance, an enormously wide flat Daytona Beach style shoreline stretches hundreds of yards to calm turquoise ocean water on the distant horizon. Low sandy dunes with sea grass and sea oats line both sides of the road as it narrows toward the beach entrance. A few palm trees stand tall and still in calm air. A long fishing pier extends into the calm ocean far in the distance beyond the beach. No wind, peaceful golden hour atmosphere. Deep blue sky overhead transitioning to warm peach and amber at the ocean horizon. Soft clouds. Painterly brushstrokes visible throughout, atmospheric haze softening the distant ocean, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-03-lakes-wetlands',
    label: 'Springs (Wekiva/Rock Springs style)',
    feedback: 'Circular spring pool visible through forest, not swamp alongside road.',
    prompt: `Cinematic digital painting, a narrow two-lane road winding through dense lush Florida forest, low angle POV from the middle of the road looking straight ahead. Massive live oak trees and bald cypress trees with thick trunks and Spanish moss draping from their branches create a green canopy overhead. Lush ferns, palmetto, and green undergrowth on both sides of the road. Ahead through a natural clearing in the trees, a circular natural spring pool is visible in the middle distance, its crystal-clear turquoise blue water glowing brilliantly in the golden sunlight, surrounded by a ring of green vegetation and white sandy banks. The spring is a perfectly round pool of impossibly clear water visible through the gap in the forest ahead. Dappled golden sunlight filtering through the canopy creating warm light patches on the road and forest floor. Deep green canopy overhead with golden light streaming through gaps. Weathered asphalt road with faded markings leading toward the spring clearing. Painterly brushstrokes visible throughout, atmospheric haze and dappled light, rich saturated greens and warm golden tones. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-10-university-campus',
    label: 'UCF Campus (modern, not red brick)',
    feedback: 'Modern contemporary UCF buildings, central fountain, palms. NOT Southern red brick.',
    prompt: `Cinematic digital painting, a wide campus boulevard stretching into the distance through a modern university campus, low angle POV from the middle of the road looking straight ahead. Contemporary two-story and three-story academic buildings on both sides with clean horizontal architecture, large windows, flat modern rooflines, and tan concrete and glass facades. Tall palm trees and green landscaped lawns with students sitting in small groups on the grass. Ahead in the middle distance, a prominent circular water fountain shoots streams of water upward from a plaza surrounded by green lawn. Modern walkways with lamp posts lead between the buildings. The campus has a bright, open, subtropical Florida feel with wide spaces and contemporary design. Warm golden afternoon light bathing the buildings, amber reflections on glass facades. Deep blue sky with a few white clouds overhead. Fresh asphalt with white lane markings. Painterly brushstrokes visible throughout, atmospheric haze softening the distant campus, warm saturated colors. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  }
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
        if (status === 'error') throw new Error(`Execution error: ${JSON.stringify(data[promptId].status).substring(0, 500)}`);
      }
    } catch (e) {
      if (e.message.includes('Execution error')) throw e;
    }
    await sleep(5000);
  }
  throw new Error('Timeout');
}

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const bakPath = filePath.replace('.png', '.bak.png');
    fs.copyFileSync(filePath, bakPath);
    return true;
  }
  return false;
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const sceneArg = args.find((a, i) => args[i - 1] === '--scene');

  const targetScenes = sceneArg
    ? SCENES.filter(s => s.name.includes(sceneArg))
    : SCENES;

  if (targetScenes.length === 0) {
    console.error(`No scene matching "${sceneArg}". Available: ${SCENES.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n═══ Road Scene Regeneration v2 — Brian's Feedback ═══`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'GENERATE'} | Scenes: ${targetScenes.length} | Force: ${force}`);
  console.log(`Settings: 1824x1024 | 35 steps | CFG 4 | Euler | Shift 3.1\n`);

  if (!dryRun) {
    const ok = await comfyuiHealthCheck();
    if (!ok) {
      console.error('ERROR: ComfyUI not running at ' + COMFYUI_URL);
      process.exit(1);
    }
    console.log('ComfyUI: connected\n');
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const comfyOutput = 'D:/ComfyUI_windows_portable/ComfyUI/output';

  let success = 0;

  for (let i = 0; i < targetScenes.length; i++) {
    const scene = targetScenes[i];
    const destPath = path.join(OUTPUT_DIR, `${scene.name}.png`);

    console.log(`── [${i + 1}/${targetScenes.length}] ${scene.label} (${scene.name}) ──`);
    console.log(`   Feedback: ${scene.feedback}`);

    if (dryRun) {
      console.log(`   Prompt: ${scene.prompt.substring(0, 120)}...`);
      console.log();
      continue;
    }

    if (fs.existsSync(destPath) && !force) {
      console.log(`   [SKIP] Already exists. Use --force to overwrite.`);
      continue;
    }

    // Backup existing
    if (backupFile(destPath)) {
      console.log(`   Backed up: ${scene.name}.png → .bak.png`);
    }

    // Load workflow
    const workflow = JSON.parse(fs.readFileSync(WF_PATH, 'utf-8'));

    // Set prompt
    workflow['91'].inputs.value = scene.prompt;

    // Set output prefix
    workflow['60'].inputs.filename_prefix = `road-scenes-v2/${scene.name}`;

    // Randomize seed
    workflow['86:3'].inputs.seed = Math.floor(Math.random() * 1e15);

    // Ensure correct settings
    workflow['86:3'].inputs.steps = 35;
    workflow['86:3'].inputs.cfg = 4;
    workflow['86:3'].inputs.sampler_name = 'euler';
    workflow['86:3'].inputs.scheduler = 'simple';
    workflow['86:58'].inputs.width = 1824;
    workflow['86:58'].inputs.height = 1024;
    workflow['86:66'].inputs.shift = 3.1;

    console.log(`   Submitting to ComfyUI...`);
    const start = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      console.log(`   Prompt ID: ${promptId}`);
      const result = await pollCompletion(promptId);

      const outputs = result.outputs?.['60'];
      if (outputs?.images?.[0]) {
        const img = outputs.images[0];
        const comfyPath = path.join(comfyOutput, img.subfolder || '', img.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, destPath);
          const elapsed = ((Date.now() - start) / 1000).toFixed(0);
          console.log(`   ✓ Saved: ${scene.name}.png (${elapsed}s)`);
          success++;
        }
      }
    } catch (e) {
      console.error(`   ✗ FAILED: ${e.message}`);
    }

    // Brief rest between images
    if (i < targetScenes.length - 1) await sleep(3000);
    console.log();
  }

  console.log(`═══ Summary ═══`);
  if (dryRun) {
    console.log(`  Would generate: ${targetScenes.length} images`);
  } else {
    console.log(`  Generated: ${success}/${targetScenes.length} images`);
    console.log(`  Backups: .bak.png files preserved`);
  }
  console.log();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
