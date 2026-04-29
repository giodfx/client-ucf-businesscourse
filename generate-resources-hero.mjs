#!/usr/bin/env node
/**
 * Generate a panoramic hero image for the Resources page using Qwen 2512.
 * Theme: knowledge library / resource hub — warm wooden bookshelves,
 * ambient golden light, painterly cinematic style matching the lesson heroes.
 *
 * Output: output/lessons/images/resources-hero.jpg
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMFYUI_URL = 'http://127.0.0.1:8188';
const OUTPUT_DIR = path.join(__dirname, 'output', 'lessons', 'images');

const PROMPT = `Cinematic digital painting, panoramic wide library reading room with warm wooden bookshelves filled with books, vintage globe on a desk, large arched windows with soft golden afternoon light streaming in, comfortable reading chairs, ambient warm tone, polished wooden floors with subtle reflections, intricate moldings, classical architecture with academic elegance, painterly digital art with visible brushstroke texture, NOT photorealistic NOT photograph, rich amber and warm gold color grading, deep depth of field, no people, no text, atmospheric and inviting`;

const NEGATIVE_PROMPT = "people, faces, text, letters, words, signs, watermark, logo, signature, photorealistic, photograph, harsh lighting, modern flat design, cars, vehicles, animals";

const WORKFLOW = {
  "60": { "inputs": { "filename_prefix": "UCF-Resources-Hero", "images": ["86:8", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Image" } },
  "91": { "inputs": { "value": PROMPT }, "class_type": "PrimitiveStringMultiline", "_meta": { "title": "Prompt" } },
  "86:39": { "inputs": { "vae_name": "qwen_image_vae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "Load VAE" } },
  "86:38": { "inputs": { "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image" }, "class_type": "CLIPLoader", "_meta": { "title": "Load CLIP" } },
  "86:37": { "inputs": { "unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors", "weight_dtype": "fp8_e4m3fn" }, "class_type": "UNETLoader", "_meta": { "title": "Load Diffusion Model" } },
  "86:3": { "inputs": { "seed": Math.floor(Math.random() * 2147483647), "steps": 25, "cfg": 4, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["86:66", 0], "positive": ["86:81", 0], "negative": ["86:7", 0], "latent_image": ["86:58", 0] }, "class_type": "KSampler", "_meta": { "title": "KSampler" } },
  "86:58": { "inputs": { "width": 1824, "height": 512, "batch_size": 1 }, "class_type": "EmptySD3LatentImage", "_meta": { "title": "Empty Latent" } },
  "86:81": { "inputs": { "text": ["91", 0], "clip": ["86:38", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "Positive Prompt" } },
  "86:7": { "inputs": { "text": NEGATIVE_PROMPT, "clip": ["86:38", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "Negative Prompt" } },
  "86:8": { "inputs": { "samples": ["86:3", 0], "vae": ["86:39", 0] }, "class_type": "VAEDecode", "_meta": { "title": "VAE Decode" } },
  "86:66": { "inputs": { "shift": 3.1, "model": ["86:37", 0] }, "class_type": "ModelSamplingAuraFlow", "_meta": { "title": "ModelSampling" } }
};

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
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

async function waitForCompletion(promptId, timeoutMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const history = await fetchJSON(`${COMFYUI_URL}/history/${promptId}`);
      if (history[promptId]) {
        const status = history[promptId].status;
        if (status?.completed) return history[promptId];
        if (status?.status_str === 'error') throw new Error(`Generation failed: ${JSON.stringify(status.messages)}`);
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

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('='.repeat(60));
  console.log('Generating Resources Hero Image (Qwen 2512)');
  console.log('='.repeat(60));
  console.log(`Output: ${OUTPUT_DIR}/resources-hero.jpg`);
  console.log(`Resolution: 1824x512 panoramic`);
  console.log('='.repeat(60));

  const clientId = `ucf-resources-hero-${Date.now()}`;
  console.log('\nQueuing workflow...');
  const { prompt_id } = await queuePrompt(WORKFLOW, clientId);
  console.log(`  Prompt ID: ${prompt_id}`);

  console.log('\nGenerating (Qwen 2512 takes ~4-6 min)...');
  const start = Date.now();
  const result = await waitForCompletion(prompt_id);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const saveNode = result.outputs["60"];
  if (!saveNode?.images?.length) throw new Error('No output images');
  const img = saveNode.images[0];

  const rawPath = path.join(OUTPUT_DIR, 'resources-hero-raw.png');
  await downloadImage(img.filename, img.subfolder, rawPath);

  // Convert to JPG via sharp
  const sharp = (await import('sharp')).default;
  const finalPath = path.join(OUTPUT_DIR, 'resources-hero.jpg');
  await sharp(rawPath).jpeg({ quality: 88, progressive: true }).toFile(finalPath);
  fs.unlinkSync(rawPath);

  const sizeKB = (fs.statSync(finalPath).size / 1024).toFixed(0);
  console.log(`\nDONE in ${elapsed}s — ${sizeKB}KB → resources-hero.jpg`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
