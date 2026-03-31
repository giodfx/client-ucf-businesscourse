#!/usr/bin/env node
/**
 * Generate 13 Road Trip scene images using Qwen 2512 GGUF (project style)
 */
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';
const WF_PATH = 'g:/z-CUSTOM_DEV/CourseFuture/workflows/comfyui/image_qwen_2512_gguf.json';

const SCENES = [
  {
    name: 'scene-01-highway-hub',
    prompt: `Cinematic digital painting, wide open four-lane highway stretching into the distance, low angle POV from the middle of the road looking straight ahead. Dense Florida pine forest and saw palmetto scrub filling both sides of the highway, creating a wild natural green corridor. A single tall sabal palm visible on the right shoulder of the road. No buildings, no structures ahead, just open road disappearing into golden atmospheric haze. Deep blue sky overhead transitioning to warm golden light at the horizon. Wispy clouds streaked across the sky. Fresh dark asphalt with crisp white lane markings receding to the vanishing point. Wild grass and low scrub in the highway median. Painterly brushstrokes visible throughout, atmospheric haze softening the distant horizon, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-02-orange-groves',
    prompt: `Cinematic digital painting, two-lane rural road stretching into the distance through Florida farmland, low angle POV from the middle of the road looking straight ahead. Vast orange groves extending to both horizons, orderly rows of dark green citrus trees heavy with bright orange fruit filling both sides of the road. A rustic wooden fence running along the left side. A weathered water tower and low tin-roofed farm buildings visible in the middle distance. Red dirt shoulders and dry grass along the road edges. The flat agricultural land stretches endlessly ahead under warm golden hour light. Deep blue sky overhead transitioning to rich orange and gold at the horizon. Wispy clouds. Fresh asphalt with faded yellow center line receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant farmland, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-03-lakes-wetlands',
    prompt: `Cinematic digital painting, narrow two-lane road on a raised causeway stretching across vast Florida wetlands, low angle POV from the middle of the road looking straight ahead. Ancient bald cypress trees draped in hanging Spanish moss rising from dark swamp water on both sides, their gnarled trunks and cypress knees emerging from the waterline. No palm trees. A great blue heron standing in shallow water on the left, white egrets perched on a fallen log on the right. Lily pads and aquatic grasses covering still dark water reflecting the golden sky. The road ahead disappears into misty wetland haze glowing amber. Deep blue sky overhead transitioning to warm golden light at the horizon. Wispy clouds reflected in the still water. Weathered asphalt with white lane markings receding into the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze and mist softening the distant wetlands, warm saturated colors with deep moody shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-04-beach-coastal',
    prompt: `Cinematic digital painting, coastal two-lane road stretching into the distance along the Atlantic shoreline, low angle POV from the middle of the road looking straight ahead. The ocean visible to the right with gentle turquoise waves breaking on wide white sand beach catching golden sunset light. Sea oats and tall dune grass swaying on sandy dunes along the right side of the road. Two leaning coconut palms on the beach side, bent by ocean winds. Low coastal scrub and sea grape bushes on the left side. A long wooden fishing pier extending into the ocean in the middle distance. The road curves gently ahead following the coastline toward the glowing ocean horizon. Deep blue sky overhead transitioning to rich orange and gold at the waterline. Wispy clouds. Fresh asphalt with white lane markings. Painterly brushstrokes visible throughout, atmospheric haze softening the distant coastline, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-05-rocket-launch',
    prompt: `Cinematic digital painting, straight two-lane road stretching across flat Florida marshland toward a rocket launch complex on the horizon, low angle POV from the middle of the road looking straight ahead. No trees along the road, only low marsh grass, scrub brush, and sandy shoulders. Flat open landscape of salt marsh and coastal scrub on both sides. On the horizon ahead, massive steel launch gantry towers and a tall rocket on the pad rise dramatically against the sky, backlit by dramatic golden hour light. Industrial support buildings and a water tower clustered near the launch pad. The enormous open sky dominates the composition. Deep blue overhead with dramatic clouds streaked orange and gold near the horizon where the launch complex glows. Straight asphalt road with white lane markings receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant launch facility, warm saturated colors with deep shadows, sense of vast open scale. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-06-theme-park',
    prompt: `Cinematic digital painting, wide four-lane boulevard stretching toward a sprawling theme park complex on the horizon, low angle POV from the middle of the road looking straight ahead. Manicured hedges and colorful tropical flower beds lining both sides of the road. On the horizon ahead, a massive Ferris wheel dominates the skyline, roller coaster tracks arching dramatically through the air, colorful water slides and ride towers in various shapes and heights filling the panorama. Festive pennant flags strung between decorative lamp posts along the road. Warm golden sunset light bathing the entire scene. No castle, no spires. The architecture is modern theme park entertainment — curved steel, bright painted structures, observation towers. Deep blue sky overhead transitioning to warm golden light at the horizon. Fresh asphalt with white lane markings. Painterly brushstrokes visible throughout, atmospheric haze softening the distant park, warm saturated festive colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-07-resort-hotel',
    prompt: `Cinematic digital painting, wide four-lane boulevard stretching into the distance past a Florida resort district, low angle POV from the middle of the road looking straight ahead. On the left side, a large Spanish-colonial style resort hotel with terracotta roof tiles, arched windows, and a porte-cochere entrance with warm lighting. On the right, a modern mid-rise hotel with balconies overlooking a pool area with blue water visible behind a low wall. Lush tropical landscaping with bird of paradise flowers, bougainvillea climbing walls, and a few scattered queen palms among the gardens. An ornamental fountain in a landscaped median ahead. The buildings are three to six stories, not skyscrapers, with warm Florida resort character. Dramatic golden sunset light catching the building facades, amber reflections on windows. Deep blue sky overhead transitioning to warm golden light at the horizon. Fresh asphalt with white lane markings. Painterly brushstrokes visible throughout, atmospheric haze, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-08-shopping-commerce',
    prompt: `Cinematic digital painting, vibrant commercial boulevard stretching into the distance, low angle POV from the middle of the road looking straight ahead. Colorful two-story retail storefronts with awnings in terracotta, teal, and yellow on both sides of the street. Open-air restaurant patios with string lights on the left. Decorative wrought-iron street lamps beginning to glow. Window displays and colorful facades catching warm golden hour light. Pedestrian silhouettes on wide brick sidewalks. Small ornamental trees in planters along the curbs, not palms. A clock tower or bell tower structure visible in the middle distance. The street has warm small-town commercial character, not a highway. Deep blue sky overhead transitioning to rich amber and gold at the horizon. Fresh asphalt with painted lane markings. Painterly brushstrokes visible throughout, atmospheric haze softening the distant street, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-09-office-business',
    prompt: `Cinematic digital painting, sleek corporate boulevard stretching into the distance, low angle POV from the middle of the road looking straight ahead. Modern three-story and five-story glass office buildings on both sides with clean contemporary architecture, reflecting pools and manicured hedges in front. Ornamental crape myrtle trees with pink blooms along the sidewalks, not palms. One single tall sabal palm visible near a building entrance on the right. The glass facades catch dramatic golden hour light, amber and orange reflections glowing brilliantly across the surfaces. A cluster of taller glass office towers visible on the horizon ahead bathed in warm sunset light. Green landscaped medians with low flowering shrubs. Deep blue sky overhead transitioning to rich golden light at the horizon. Fresh dark asphalt with crisp white lane markings receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant towers, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-10-university-campus',
    prompt: `Cinematic digital painting, grand university boulevard stretching into the distance, low angle POV from the middle of the road looking straight ahead. Massive live oak trees with wide spreading canopies draped in Spanish moss forming a natural cathedral arch over the road, dappled golden light filtering through the leaves. No palm trees. Beautiful collegiate architecture on both sides with red brick buildings, arched colonnades, a clock tower rising on the left, and a grand domed building visible on the horizon ahead. Lush green manicured lawns, stone benches, and iron lampposts along wide walkways. A campus gateway arch visible in the middle distance. The buildings are bathed in dramatic warm golden hour light. Deep blue sky visible through the canopy overhead transitioning to rich golden light at the horizon. Fresh asphalt with white lane markings. Painterly brushstrokes visible throughout, atmospheric haze softening the distant campus, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-11-stadium-sports',
    prompt: `Cinematic digital painting, wide four-lane road stretching toward a massive sports stadium complex on the horizon, low angle POV from the middle of the road looking straight ahead. Open grassy areas and parking lots on both sides of the road, not trees. On the horizon ahead, a huge modern sports stadium with a dramatic sweeping curved roof and exposed steel structural arches dominates the skyline, catching dramatic golden sunset light. Tall stadium light towers rise against the deep blue sky on either side. A smaller arena building visible next to the main stadium. The vast scale of the complex creates an imposing horizon. Concrete barriers and metal fencing along the road edges. Deep blue sky overhead transitioning to rich orange and gold at the horizon. Fresh asphalt with white lane markings receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant complex, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-12-port-naval',
    prompt: `Cinematic digital painting, wide industrial road stretching toward a massive commercial port on the horizon, low angle POV from the middle of the road looking straight ahead. Chain-link fencing and concrete barriers along the right side, stacked shipping containers in rows on the left. No trees, industrial landscape. On the horizon ahead, enormous blue and red cargo cranes tower against the sky like steel giants, a massive container ship docked at the terminal with its hull catching dramatic golden sunset light. A freight train loaded with containers crossing on elevated tracks in the middle distance. Warehouses and logistics buildings clustered along the waterfront. Harbor water visible reflecting amber sky between the port structures. Deep blue sky overhead transitioning to rich amber and gold at the waterline. Fresh asphalt with white lane markings receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant port, warm saturated colors with deep industrial shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  },
  {
    name: 'scene-13-downtown-skyline',
    prompt: `Cinematic digital painting, wide six-lane highway stretching into the distance toward a glowing city skyline, low angle POV from the middle of the road looking straight ahead. Low scrub brush and wild grass along the highway shoulders, a concrete median barrier on the left. No palm trees. The city skyline ahead is a dense cluster of modern glass towers and skyscrapers bathed in dramatic golden hour sunset light, orange and amber glow reflecting brilliantly off the glass facades, the skyline large and dominant on the horizon suggesting imminent arrival. Highway overpasses and ramps visible in the middle distance leading into the city. Wispy clouds streaked across the sky transitioning from deep blue overhead to rich orange and gold at the horizon. Fresh dark asphalt with crisp white lane markings and reflective road markers receding to the vanishing point. Painterly brushstrokes visible throughout, atmospheric haze softening the distant skyline, warm saturated colors with deep shadows. Concept art quality, rich and atmospheric. NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography. NOT a photograph NOT photorealistic, digital painting with visible paint texture.`
  }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

async function main() {
  const outputDir = path.resolve('media/images/road-scenes');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n═══ Road Trip Scene Generation — Qwen 2512 GGUF ═══`);
  console.log(`  ${SCENES.length} scenes | 1824x1024 | euler/simple/35 steps/cfg 4/shift 3.1\n`);

  const comfyOutput = 'D:/ComfyUI_windows_portable/ComfyUI/output';

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const destPath = path.join(outputDir, `${scene.name}.png`);

    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      console.log(`  [SKIP] ${scene.name} already exists`);
      continue;
    }

    const workflow = JSON.parse(fs.readFileSync(WF_PATH, 'utf-8'));

    // Set prompt
    workflow['91'].inputs.value = scene.prompt;

    // Set output prefix
    workflow['60'].inputs.filename_prefix = `road-scenes/${scene.name}`;

    // Randomize seed
    workflow['86:3'].inputs.seed = Math.floor(Math.random() * 1e15);

    // Project settings (already defaults in workflow, but be explicit)
    workflow['86:3'].inputs.steps = 35;
    workflow['86:3'].inputs.cfg = 4;
    workflow['86:3'].inputs.sampler_name = 'euler';
    workflow['86:3'].inputs.scheduler = 'simple';
    workflow['86:58'].inputs.width = 1824;
    workflow['86:58'].inputs.height = 1024;
    workflow['86:66'].inputs.shift = 3.1;

    console.log(`  [${i + 1}/${SCENES.length}] ${scene.name}...`);
    const start = Date.now();

    try {
      const promptId = await submitWorkflow(workflow);
      const result = await pollCompletion(promptId);

      const outputs = result.outputs?.['60'];
      if (outputs?.images?.[0]) {
        const img = outputs.images[0];
        const comfyPath = path.join(comfyOutput, img.subfolder || '', img.filename);
        if (fs.existsSync(comfyPath)) {
          fs.copyFileSync(comfyPath, destPath);
          const elapsed = ((Date.now() - start) / 1000).toFixed(0);
          console.log(`  ✓ ${scene.name} (${elapsed}s)`);
        }
      }
    } catch (e) {
      console.error(`  ✗ ${scene.name} FAILED: ${e.message}`);
    }

    // Brief rest between images
    if (i < SCENES.length - 1) await sleep(3000);
  }

  console.log(`\n═══ DONE — ${SCENES.length} scenes ═══\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
