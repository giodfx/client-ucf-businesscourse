#!/usr/bin/env node
/**
 * Generate avatar reference characters for the UCF Business Course presenters.
 * Two characters that alternate between scenes:
 *   1. Female — Colombian / Latin American
 *   2. Male — American Caucasian
 *
 * Uses Qwen 2512 FP8 on laptop via Tailscale.
 * Output: media/images/avatars/
 *
 * Usage: node generate-avatar-characters.mjs [--only female|male] [--seed N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const OUTPUT_DIR = path.join(__dirname, 'media', 'images', 'avatars');

const CHARACTERS = [
  {
    id: 'presenter-female',
    name: 'Female Presenter — Colombian',
    filename: 'presenter-female.png',
    prompt: [
      'Cinematic digital painting, a strikingly beautiful Colombian woman in her early 30s',
      'standing confidently in a modern university atrium with an open welcoming posture.',
      'She has warm olive-toned skin, dark brown wavy hair cascading just past her shoulders,',
      'high cheekbones, expressive dark brown eyes, and a warm engaging smile.',
      'She wears an elegant tailored burgundy blazer over a white silk blouse',
      'and fitted dark navy trousers, with subtle gold stud earrings.',
      'Her right hand gestures naturally mid-explanation while her left hand',
      'holds a slim leather portfolio at her side.',
      'Visible from the knees up, half-body framing with breathing room above her head.',
      'The atrium behind her has floor-to-ceiling windows with warm natural light streaming in,',
      'blurred modern architecture with clean lines, lush tropical indoor plants,',
      'and a polished stone floor reflecting the golden light.',
      'Dramatic golden hour lighting illuminates her face with warm amber tones,',
      'creating soft highlights on her hair and blazer fabric.',
      'Painterly brushstrokes visible in fabric textures, hair strands, and architectural surfaces,',
      'atmospheric warmth and depth, warm saturated colors with burgundy and golden tones,',
      'concept art quality, rich and atmospheric.',
      'No text, no words, no letters.',
      'Wide composition, 16:9 aspect ratio.',
      'NOT a photograph, NOT photorealistic.'
    ].join(' ')
  },
  {
    id: 'presenter-male',
    name: 'Male Presenter — American Caucasian',
    filename: 'presenter-male.png',
    prompt: [
      'Cinematic digital painting, a confident and approachable Caucasian American man',
      'in his late 30s standing in a modern business conference lounge',
      'with a relaxed professional posture.',
      'He has light brown hair neatly styled with a slight natural wave,',
      'clean-shaven with a defined jawline, blue-green eyes,',
      'and a warm professional smile that conveys authority and friendliness.',
      'He wears a well-fitted charcoal gray suit jacket over a crisp white dress shirt',
      'with no tie, top button open, and dark dress trousers.',
      'His right hand gestures openly mid-conversation while his left hand',
      'rests casually in his trouser pocket.',
      'Visible from the knees up, half-body framing with breathing room above his head.',
      'The conference lounge behind him has large panoramic windows',
      'revealing a blurred Central Florida skyline at golden hour,',
      'modern low-profile furniture, and warm interior lighting.',
      'Dramatic golden hour lighting creates warm highlights on his face and shoulders,',
      'with subtle rim lighting from the window behind.',
      'Painterly brushstrokes visible in fabric textures, hair, and architectural elements,',
      'atmospheric warmth and depth, warm saturated colors with charcoal and amber tones,',
      'concept art quality, rich and atmospheric.',
      'No text, no words, no letters.',
      'Wide composition, 16:9 aspect ratio.',
      'NOT a photograph, NOT photorealistic.'
    ].join(' ')
  }
];

// Workflow template for Qwen 2512 FP8 on laptop
const WORKFLOW_TEMPLATE = {
  "60": {
    "inputs": { "filename_prefix": "UCF-Avatar", "images": ["86:8", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  },
  "91": {
    "inputs": { "value": "" },
    "class_type": "PrimitiveStringMultiline",
    "_meta": { "title": "Prompt" }
  },
  "86:39": {
    "inputs": { "vae_name": "qwen_image_vae.safetensors" },
    "class_type": "VAELoader",
    "_meta": { "title": "Load VAE" }
  },
  "86:38": {
    "inputs": {
      "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "type": "qwen_image"
    },
    "class_type": "CLIPLoader",
    "_meta": { "title": "Load CLIP" }
  },
  "86:37": {
    "inputs": {
      "unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors",
      "weight_dtype": "fp8_e4m3fn"
    },
    "class_type": "UNETLoader",
    "_meta": { "title": "Load Diffusion Model" }
  },
  "86:3": {
    "inputs": {
      "seed": 0,
      "steps": 30,
      "cfg": 4,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": ["86:66", 0],
      "positive": ["86:81", 0],
      "negative": ["86:7", 0],
      "latent_image": ["86:58", 0]
    },
    "class_type": "KSampler",
    "_meta": { "title": "KSampler" }
  },
  "86:58": {
    "inputs": { "width": 1824, "height": 1024, "batch_size": 1 },
    "class_type": "EmptySD3LatentImage",
    "_meta": { "title": "EmptySD3LatentImage" }
  },
  "86:81": {
    "inputs": {
      "text": ["91", 0],
      "clip": ["86:38", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
  },
  "86:8": {
    "inputs": {
      "samples": ["86:3", 0],
      "vae": ["86:39", 0]
    },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE Decode" }
  },
  "86:66": {
    "inputs": {
      "shift": 3.1,
      "model": ["86:37", 0]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": { "title": "ModelSamplingAuraFlow" }
  },
  "86:7": {
    "inputs": {
      "text": "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲",
      "clip": ["86:38", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
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

async function waitForCompletion(promptId, timeoutMs = 600000) {
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
    await new Promise(r => setTimeout(r, 3000));
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

async function generateCharacter(character, seedOverride) {
  const outputPath = path.join(OUTPUT_DIR, character.filename);

  console.log(`\nGenerating: ${character.name}`);
  console.log(`  Prompt: ${character.prompt.substring(0, 100)}...`);

  const workflow = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  workflow["91"].inputs.value = character.prompt;
  workflow["86:3"].inputs.seed = seedOverride || Math.floor(Math.random() * 2147483647);
  workflow["60"].inputs.filename_prefix = `UCF-${character.id}`;

  console.log(`  Seed: ${workflow["86:3"].inputs.seed}`);
  console.log(`  Steps: ${workflow["86:3"].inputs.steps}`);

  const clientId = `ucf-avatar-${Date.now()}`;

  try {
    const { prompt_id } = await queuePrompt(workflow, clientId);
    console.log(`  Queued: ${prompt_id}`);

    const startTime = Date.now();
    const result = await waitForCompletion(prompt_id, 600000);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const saveNode = result.outputs["60"];
    if (!saveNode?.images?.length) {
      throw new Error('No output images found');
    }

    const img = saveNode.images[0];
    const size = await downloadImage(img.filename, img.subfolder, outputPath);

    console.log(`  DONE in ${elapsed}s — ${(size / 1024 / 1024).toFixed(1)}MB → ${outputPath}`);
    return { id: character.id, status: 'success', path: outputPath, time: elapsed, seed: workflow["86:3"].inputs.seed };

  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return { id: character.id, status: 'error', error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let onlyChar = null;
  let seedOverride = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only' && args[i + 1]) onlyChar = args[i + 1];
    if (args[i] === '--seed' && args[i + 1]) seedOverride = parseInt(args[i + 1]);
  }

  let characters = CHARACTERS;
  if (onlyChar) {
    characters = characters.filter(c => c.id.includes(onlyChar));
    if (characters.length === 0) {
      console.error(`Character "${onlyChar}" not found. Use: female, male`);
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
    console.log('UCF Business Course — Avatar Character Generation');
    console.log('='.repeat(70));
    console.log(`ComfyUI: ${COMFYUI_URL}`);
    console.log(`GPU: ${gpu?.name || 'unknown'}`);
    console.log(`VRAM: ${((gpu?.vram_total || 0) / 1024 / 1024 / 1024).toFixed(1)}GB total, ${((gpu?.vram_free || 0) / 1024 / 1024 / 1024).toFixed(1)}GB free`);
    console.log(`Model: Qwen 2512 FP8 (30 steps for character quality)`);
    console.log(`Resolution: 1824x1024`);
    console.log(`Characters: ${characters.length} to generate`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
  } catch (err) {
    console.error(`Cannot reach ComfyUI at ${COMFYUI_URL}: ${err.message}`);
    process.exit(1);
  }

  const results = [];
  for (const char of characters) {
    const result = await generateCharacter(char, seedOverride);
    results.push(result);
  }

  console.log('\n' + '='.repeat(70));
  console.log('CHARACTER GENERATION SUMMARY');
  console.log('='.repeat(70));

  for (const r of results) {
    if (r.status === 'success') {
      console.log(`  ✓ ${r.id} — seed ${r.seed} — ${r.time}s`);
    } else {
      console.log(`  ✗ ${r.id} — ${r.error}`);
    }
  }

  const success = results.filter(r => r.status === 'success');
  if (success.length > 0) {
    console.log(`\nSave these seeds if you like the characters:`);
    for (const r of success) {
      console.log(`  node generate-avatar-characters.mjs --only ${r.id.replace('presenter-', '')} --seed ${r.seed}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
