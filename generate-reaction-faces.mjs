#!/usr/bin/env node
/**
 * Generate avatar reaction face images for quiz feedback using Qwen Image Edit.
 * Creates correct (happy/celebratory) and incorrect (encouraging/supportive) variants
 * for each module's avatar.
 *
 * Usage: node generate-reaction-faces.mjs [--module N] [--force]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = 'http://127.0.0.1:8188';
const AVATARS_DIR = path.join(__dirname, 'media', 'images', 'avatars', 'scenes');
const OUTPUT_DIR = path.join(__dirname, 'output', 'lessons', 'images', 'avatars', 'reactions');

// Module -> first lesson avatar (source face)
const MODULE_AVATARS = {
  0: 'lesson-0-1-avatar.png',
  1: 'lesson-1-1-avatar.png',
  2: 'lesson-2-1-avatar.png',
  3: 'lesson-3-1-avatar.png',
  4: 'lesson-4-1-avatar.png',
  5: 'lesson-5-1-avatar.png',
  6: 'lesson-6-1-avatar.png',
  7: 'lesson-7-1-avatar.png',
  8: 'lesson-8-1-avatar.png',
};

// Edit prompts for each reaction state
const REACTION_PROMPTS = {
  correct: {
    editPrompt: "Extreme close-up headshot. Change the person's facial expression to a big warm genuine smile showing teeth, eyes bright and crinkled with joy, eyebrows slightly raised in a celebratory expression, looking directly at the viewer. Keep the same person, same hairstyle, same background.",
    negativePrompt: ""
  },
  incorrect: {
    editPrompt: "Extreme close-up headshot. Change the person's facial expression to a gentle warm encouraging smile with a slight sympathetic head tilt, soft caring eyes, one eyebrow slightly raised, a supportive expression. Keep the same person, same hairstyle, same background.",
    negativePrompt: ""
  }
};

// Qwen Image Edit workflow template
function buildWorkflow(imageFilename, editPrompt, negativePrompt, seed) {
  return {
    "60": {
      "inputs": {
        "filename_prefix": "UCF-Reaction",
        "images": ["115:8", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    },
    "78": {
      "inputs": { "image": imageFilename },
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
        "prompt": negativePrompt,
        "clip": ["115:38", 0],
        "vae": ["115:39", 0],
        "image1": ["115:93", 0]
      },
      "class_type": "TextEncodeQwenImageEditPlus",
      "_meta": { "title": "TextEncodeQwenImageEditPlus" }
    },
    "115:111": {
      "inputs": {
        "prompt": editPrompt,
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
    "115:88": {
      "inputs": { "pixels": ["115:93", 0], "vae": ["115:39", 0] },
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
        "seed": seed,
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
      "inputs": { "samples": ["115:3", 0], "vae": ["115:39", 0] },
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
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function uploadImage(filePath) {
  const filename = path.basename(filePath);
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('image', blob, filename);

  const res = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.name; // filename as stored in ComfyUI input
}

async function queuePrompt(workflow, clientId) {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  if (!res.ok) throw new Error(`Queue failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function waitForCompletion(promptId, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const history = await fetchJSON(`${COMFYUI_URL}/history/${promptId}`);
      if (history[promptId]) {
        const status = history[promptId].status;
        if (status?.completed) return history[promptId];
        if (status?.status_str === 'error') {
          throw new Error(`Generation failed: ${JSON.stringify(status.messages)}`);
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

// Per-module face center coordinates (as fraction of image dimensions)
// All avatars are ~1360×760 wide landscapes — pre-crop to face before Qwen edit
// { cx: horizontal center, cy: vertical center } — both as 0-1 fractions
const FACE_REGIONS = {
  0: { cx: 0.45, cy: 0.28 },  // Latina woman, slightly left of center
  1: { cx: 0.67, cy: 0.28 },  // Man on right side
  2: { cx: 0.48, cy: 0.30 },  // Latina woman, centered
  3: { cx: 0.45, cy: 0.28 },  // Man, slightly left of center
  4: { cx: 0.48, cy: 0.28 },  // Woman, centered
  5: { cx: 0.45, cy: 0.28 },  // Man, slightly left-center
  6: { cx: 0.48, cy: 0.28 },  // Man, centered
  7: { cx: 0.42, cy: 0.28 },  // Latina woman, slightly left
  8: { cx: 0.48, cy: 0.28 },  // Latina woman, centered
};

async function preCropFace(avatarPath, moduleIdx) {
  // Pre-crop avatar to head+shoulders region before uploading to Qwen Image Edit.
  // This ensures Qwen edits a face-focused image and the output is already a headshot.
  const region = FACE_REGIONS[moduleIdx];
  if (!region) return avatarPath;

  const sharp = (await import('sharp')).default;
  const metadata = await sharp(avatarPath).metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Extract a square region centered on the face — tight head+shoulders crop
  const cropSize = Math.round(h * 0.38);
  const cx = Math.round(w * region.cx);
  const cy = Math.round(h * region.cy);
  let left = Math.max(0, cx - Math.round(cropSize / 2));
  let top = Math.max(0, cy - Math.round(cropSize / 2));
  // Clamp to image bounds
  if (left + cropSize > w) left = w - cropSize;
  if (top + cropSize > h) top = h - cropSize;

  const tempPath = avatarPath.replace('.png', '-face-crop.png');
  await sharp(avatarPath)
    .extract({ left, top, width: cropSize, height: cropSize })
    .png()
    .toFile(tempPath);

  console.log(`  Pre-cropped face: ${cropSize}×${cropSize} at (${left}, ${top})`);
  return tempPath;
}

async function cropToCircle(inputPath, outputPath, size = 160) {
  // Qwen output is already face-focused (pre-cropped) — just center-crop and circle-mask
  const sharp = (await import('sharp')).default;

  const metadata = await sharp(inputPath).metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Use 92% of the shorter dimension — aggressive crop, face fills circle
  // Offset upward (40% instead of 50%) because face sits in upper portion of headshot
  const faceSize = Math.min(w, h) * 0.92;
  const left = Math.round((w - faceSize) / 2);
  const top = Math.round(h * 0.40 - faceSize / 2); // 40% vertical center — face is upper

  // Create circular mask
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
    </svg>`
  );

  await sharp(inputPath)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: Math.round(Math.min(faceSize, w - left)),
      height: Math.round(Math.min(faceSize, h - top))
    })
    .resize(size, size, { fit: 'cover' })
    .composite([{
      input: circle,
      blend: 'dest-in'
    }])
    .png()
    .toFile(outputPath);
}

async function generateReaction(moduleIdx, reactionType, comfyuiFilename, force = false) {
  const outputFilename = `module-${moduleIdx}-${reactionType}.png`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  const rawPath = path.join(OUTPUT_DIR, `module-${moduleIdx}-${reactionType}-raw.png`);

  if (!force && fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 5000) {
      console.log(`  SKIP ${outputFilename} — already exists`);
      return 'skipped';
    }
  }

  const reaction = REACTION_PROMPTS[reactionType];
  const seed = Math.floor(Math.random() * 2147483647);
  const workflow = buildWorkflow(comfyuiFilename, reaction.editPrompt, reaction.negativePrompt, seed);

  console.log(`  Generating ${outputFilename}...`);

  const clientId = `ucf-reaction-${Date.now()}`;
  const { prompt_id } = await queuePrompt(workflow, clientId);
  console.log(`    Queued: ${prompt_id}`);

  const startTime = Date.now();
  const result = await waitForCompletion(prompt_id);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const outputs = result.outputs;
  const saveNode = outputs["60"];
  if (!saveNode?.images?.length) throw new Error('No output images');

  const img = saveNode.images[0];

  // Download raw (full image)
  await downloadImage(img.filename, img.subfolder, rawPath);

  // Crop to circular face (Qwen output is already face-focused from pre-crop)
  // 256px output — 2× retina quality at 80px display size
  await cropToCircle(rawPath, outputPath, 256);

  // Clean up raw file
  fs.unlinkSync(rawPath);

  const finalSize = fs.statSync(outputPath).size;
  console.log(`    DONE in ${elapsed}s — ${(finalSize / 1024).toFixed(0)}KB → ${outputFilename}`);
  return 'success';
}

async function main() {
  const args = process.argv.slice(2);
  let onlyModule = null;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--module' && args[i + 1]) onlyModule = parseInt(args[i + 1]);
    if (args[i] === '--force') force = true;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check ComfyUI
  try {
    const stats = await fetchJSON(`${COMFYUI_URL}/system_stats`);
    const gpu = stats.devices?.[0];
    console.log('='.repeat(60));
    console.log('UCF Business Course — Avatar Reaction Face Generation');
    console.log('='.repeat(60));
    console.log(`ComfyUI: ${COMFYUI_URL}`);
    console.log(`GPU: ${gpu?.name || 'unknown'}`);
    console.log(`Model: Qwen Image Edit 2509 (fp8) + Lightning LoRA`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error(`Cannot reach ComfyUI at ${COMFYUI_URL}: ${err.message}`);
    process.exit(1);
  }

  const modules = onlyModule !== null ? [onlyModule] : [0, 1, 2, 3, 4, 5, 6, 7, 8];

  let success = 0;
  let errors = 0;

  for (const modIdx of modules) {
    const avatarFile = MODULE_AVATARS[modIdx];
    const avatarPath = path.join(AVATARS_DIR, avatarFile);

    if (!fs.existsSync(avatarPath)) {
      console.error(`\n  ERROR: Avatar not found: ${avatarFile}`);
      errors += 2;
      continue;
    }

    console.log(`\n[Module ${modIdx}] Source: ${avatarFile}`);

    // Pre-crop face for off-center avatars (if needed)
    const uploadPath = await preCropFace(avatarPath, modIdx);

    // Upload avatar (or face crop) to ComfyUI
    console.log(`  Uploading to ComfyUI...`);
    const comfyuiFilename = await uploadImage(uploadPath);
    console.log(`  Uploaded as: ${comfyuiFilename}`);

    // Clean up temp face crop if created
    if (uploadPath !== avatarPath && fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }

    // Generate correct reaction
    try {
      const r1 = await generateReaction(modIdx, 'correct', comfyuiFilename, force);
      if (r1 === 'success') success++;
    } catch (err) {
      console.error(`    FAILED (correct): ${err.message}`);
      errors++;
    }

    // Generate incorrect reaction
    try {
      const r2 = await generateReaction(modIdx, 'incorrect', comfyuiFilename, force);
      if (r2 === 'success') success++;
    } catch (err) {
      console.error(`    FAILED (incorrect): ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`DONE: ${success} generated, ${errors} errors`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
