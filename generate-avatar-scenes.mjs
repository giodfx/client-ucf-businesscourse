#!/usr/bin/env node
/**
 * Generate avatar scene images using Qwen Image Edit.
 * Takes the reference avatar (presenter-female.png / presenter-male.png)
 * and places them into lesson-appropriate scenes while preserving character identity.
 *
 * Uses Qwen Image Edit 2509 + Lightning 4-step LoRA for fast generation.
 *
 * Usage: node generate-avatar-scenes.mjs [--only lesson-X-Y] [--seed N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const OUTPUT_DIR = path.join(__dirname, 'media', 'images', 'avatars', 'scenes');

// Scene definitions — presenter alternates female/male per lesson
const SCENES = [
  {
    lessonId: 'lesson-0-1',
    lessonTitle: 'Start Here — What To Expect And How To Use This Program',
    presenter: 'female',
    sourceImage: 'presenter-female.png',
    prompt: [
      'Cinematic digital painting, the same woman preserved exactly,',
      'standing confidently in a modern university welcome center atrium,',
      'wearing an elegant tailored burgundy blazer over a white silk blouse',
      'and fitted dark navy trousers, with subtle gold stud earrings,',
      'her right hand gesturing welcomingly toward the viewer,',
      'warm engaging smile, half-body framing visible from the knees up.',
      'Behind her a bright contemporary university lobby with floor-to-ceiling windows,',
      'sleek welcome desk, digital information kiosks, lush indoor tropical plants,',
      'modern geometric light fixtures hanging from a high ceiling,',
      'students and professionals walking through the space in the background.',
      'Dramatic golden hour lighting streaming through the tall windows,',
      'warm amber tones on her face and blazer, soft natural shadows,',
      'painterly brushstrokes visible in architecture and fabric textures,',
      'warm saturated colors with burgundy and golden tones,',
      'concept art quality, rich and atmospheric.',
      'NOT a photograph, NOT photorealistic.'
    ].join(' ')
  },
  {
    lessonId: 'lesson-1-1',
    lessonTitle: 'Choosing Your U.S. Business Entity',
    presenter: 'male',
    sourceImage: 'presenter-male.png',
    prompt: [
      'Cinematic digital painting, the same man preserved exactly,',
      'standing confidently in a modern downtown Orlando business district,',
      'wearing a well-fitted charcoal gray suit jacket over a crisp white dress shirt,',
      'no tie with top button open, dark dress trousers,',
      'his right hand gesturing toward the glass towers of the business district,',
      'warm professional smile, half-body framing visible from the knees up.',
      'Behind him a wide boulevard lined with modern glass office towers,',
      'a prominent county courthouse building with classical columns visible down the street,',
      'palm trees lining the sidewalks, professionals walking on the pavement,',
      'a few sedans parked along the curb.',
      'Dramatic golden hour lighting casting long warm shadows down the boulevard,',
      'glass facades reflecting amber sunset tones, deep blue sky above,',
      'painterly brushstrokes visible in architecture and street surfaces,',
      'warm saturated colors with charcoal and golden amber tones,',
      'concept art quality, rich and atmospheric.',
      'NOT a photograph, NOT photorealistic.'
    ].join(' ')
  }
];

// Qwen Image Edit workflow template
const WORKFLOW_TEMPLATE = {
  "60": {
    "inputs": { "filename_prefix": "UCF-AvatarScene", "images": ["115:8", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  },
  "78": {
    "inputs": { "image": "" },  // Source avatar image injected here
    "class_type": "LoadImage",
    "_meta": { "title": "Load Image" }
  },
  "115:75": {
    "inputs": { "strength": 1, "model": ["115:66", 0] },
    "class_type": "CFGNorm",
    "_meta": { "title": "CFGNorm" }
  },
  "115:39": {
    "inputs": { "vae_name": "qwen_image_vae.safetensors" },
    "class_type": "VAELoader",
    "_meta": { "title": "Load VAE" }
  },
  "115:38": {
    "inputs": {
      "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "type": "qwen_image",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": { "title": "Load CLIP" }
  },
  "115:37": {
    "inputs": {
      "unet_name": "qwen_image_edit_2509_fp8_e4m3fn.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": { "title": "Load Diffusion Model" }
  },
  "115:110": {
    "inputs": {
      "prompt": "",
      "clip": ["115:38", 0],
      "vae": ["115:39", 0],
      "image1": ["115:93", 0]
    },
    "class_type": "TextEncodeQwenImageEditPlus",
    "_meta": { "title": "TextEncodeQwenImageEditPlus" }
  },
  "115:66": {
    "inputs": { "shift": 3, "model": ["115:89", 0] },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": { "title": "ModelSamplingAuraFlow" }
  },
  "115:111": {
    "inputs": {
      "prompt": "",  // Scene prompt injected here
      "clip": ["115:38", 0],
      "vae": ["115:39", 0],
      "image1": ["115:93", 0]
    },
    "class_type": "TextEncodeQwenImageEditPlus",
    "_meta": { "title": "TextEncodeQwenImageEditPlus" }
  },
  "115:112": {
    "inputs": { "width": 1824, "height": 1024, "batch_size": 1 },
    "class_type": "EmptySD3LatentImage",
    "_meta": { "title": "EmptySD3LatentImage" }
  },
  "115:88": {
    "inputs": {
      "pixels": ["115:93", 0],
      "vae": ["115:39", 0]
    },
    "class_type": "VAEEncode",
    "_meta": { "title": "VAE Encode" }
  },
  "115:93": {
    "inputs": {
      "upscale_method": "lanczos",
      "megapixels": 1,
      "resolution_steps": 1,
      "image": ["78", 0]
    },
    "class_type": "ImageScaleToTotalPixels",
    "_meta": { "title": "ImageScaleToTotalPixels" }
  },
  "115:3": {
    "inputs": {
      "seed": 0,
      "steps": 4,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": ["115:75", 0],
      "positive": ["115:111", 0],
      "negative": ["115:110", 0],
      "latent_image": ["115:88", 0]
    },
    "class_type": "KSampler",
    "_meta": { "title": "KSampler" }
  },
  "115:8": {
    "inputs": {
      "samples": ["115:3", 0],
      "vae": ["115:39", 0]
    },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE Decode" }
  },
  "115:89": {
    "inputs": {
      "lora_name": "Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors",
      "strength_model": 1,
      "model": ["115:37", 0]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": { "title": "Load LoRA" }
  }
};

async function queuePrompt(workflow, clientId) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Queue failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function waitForCompletion(promptId, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      if (res.ok) {
        const history = await res.json();
        if (history[promptId]) {
          const status = history[promptId].status;
          if (status?.completed) return history[promptId];
          if (status?.status_str === 'error') {
            throw new Error(`Generation failed: ${JSON.stringify(status.messages)}`);
          }
        }
      }
    } catch (e) {
      if (e.message.includes('Generation failed')) throw e;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Timeout after ${timeoutMs / 1000}s`);
}

async function downloadImage(filename, subfolder, outputPath) {
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=output`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

async function generateScene(scene, seedOverride) {
  const outputPath = path.join(OUTPUT_DIR, `${scene.lessonId}-avatar.png`);

  console.log(`\n[${scene.lessonId}] ${scene.lessonTitle}`);
  console.log(`  Presenter: ${scene.presenter} (${scene.sourceImage})`);
  console.log(`  Prompt: ${scene.prompt.substring(0, 100)}...`);

  const workflow = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  workflow["78"].inputs.image = scene.sourceImage;
  workflow["115:111"].inputs.prompt = scene.prompt;
  workflow["115:3"].inputs.seed = seedOverride || Math.floor(Math.random() * 2147483647);
  workflow["60"].inputs.filename_prefix = `UCF-Avatar-${scene.lessonId}`;

  console.log(`  Seed: ${workflow["115:3"].inputs.seed}`);

  const clientId = `ucf-scene-${Date.now()}`;

  try {
    const { prompt_id } = await queuePrompt(workflow, clientId);
    console.log(`  Queued: ${prompt_id}`);

    const startTime = Date.now();
    const result = await waitForCompletion(prompt_id);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const saveNode = result.outputs["60"];
    if (!saveNode?.images?.length) {
      throw new Error('No output images found');
    }

    const img = saveNode.images[0];
    const size = await downloadImage(img.filename, img.subfolder, outputPath);

    console.log(`  DONE in ${elapsed}s — ${(size / 1024 / 1024).toFixed(1)}MB → ${outputPath}`);
    return { lessonId: scene.lessonId, status: 'success', path: outputPath, time: elapsed, seed: workflow["115:3"].inputs.seed };

  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return { lessonId: scene.lessonId, status: 'error', error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let onlyLesson = null;
  let seedOverride = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only' && args[i + 1]) onlyLesson = args[i + 1];
    if (args[i] === '--seed' && args[i + 1]) seedOverride = parseInt(args[i + 1]);
  }

  let scenes = SCENES;
  if (onlyLesson) {
    scenes = scenes.filter(s => s.lessonId === onlyLesson);
    if (scenes.length === 0) {
      console.error(`Lesson "${onlyLesson}" not found. Available: ${SCENES.map(s => s.lessonId).join(', ')}`);
      process.exit(1);
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check ComfyUI
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`);
    const stats = await res.json();
    const gpu = stats.devices?.[0];
    console.log('='.repeat(70));
    console.log('UCF Business Course — Avatar Scene Generation (Qwen Edit)');
    console.log('='.repeat(70));
    console.log(`ComfyUI: ${COMFYUI_URL}`);
    console.log(`GPU: ${gpu?.name || 'unknown'}`);
    console.log(`Model: Qwen Image Edit 2509 + Lightning 4-step LoRA`);
    console.log(`Scenes: ${scenes.length} to generate`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
  } catch (err) {
    console.error(`Cannot reach ComfyUI at ${COMFYUI_URL}: ${err.message}`);
    process.exit(1);
  }

  const results = [];
  for (const scene of scenes) {
    const result = await generateScene(scene, seedOverride);
    results.push(result);
  }

  console.log('\n' + '='.repeat(70));
  console.log('SCENE GENERATION SUMMARY');
  console.log('='.repeat(70));
  for (const r of results) {
    if (r.status === 'success') {
      console.log(`  ✓ ${r.lessonId} — seed ${r.seed} — ${r.time}s`);
    } else {
      console.log(`  ✗ ${r.lessonId} — ${r.error}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
