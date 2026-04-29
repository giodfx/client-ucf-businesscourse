#!/usr/bin/env node
/**
 * Generate WebVTT caption files for all bookend videos.
 * Allocates each sentence proportionally across the audio duration
 * (based on word count) — produces one cue per sentence.
 *
 * Reads bookend-scripts.json + ffprobes the matching .wav files in
 * media/audio/bookend/ to get true durations, then writes:
 *   output/lessons/videos/bookend/<id>-<lang>.vtt
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const SCRIPTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'bookend-scripts.json'), 'utf-8'));
const AUDIO_DIR = path.join(ROOT, 'media', 'audio', 'bookend');
const OUT_DIR = path.join(ROOT, 'output', 'lessons', 'videos', 'bookend');

fs.mkdirSync(OUT_DIR, { recursive: true });

function ffprobeDuration(file) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0', file
    ], { encoding: 'utf-8' });
    return parseFloat(out.trim());
  } catch {
    return null;
  }
}

function splitSentences(text) {
  // Split on sentence terminators (., !, ?, :, ¿, ¡) followed by space + capital
  // but keep each segment's trailing punctuation. Handle Spanish ¿/¡ pairs too.
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑÜ¿¡])/);
  return parts.filter(s => s.length > 0);
}

function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

function buildVtt(sentences, totalDuration) {
  const wordCounts = sentences.map(s => s.trim().split(/\s+/).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  let cursor = 0;
  const lines = ['WEBVTT', ''];

  sentences.forEach((sent, i) => {
    const portion = wordCounts[i] / totalWords;
    const dur = totalDuration * portion;
    const start = cursor;
    const end = Math.min(cursor + dur, totalDuration);
    cursor = end;

    lines.push(`${i + 1}`);
    lines.push(`${fmtTime(start)} --> ${fmtTime(end)}`);
    lines.push(sent.trim());
    lines.push('');
  });

  return lines.join('\n');
}

let generated = 0;
let skipped = 0;

for (const video of SCRIPTS.videos) {
  for (const lang of ['en', 'es']) {
    const wav = path.join(AUDIO_DIR, `${video.id}-${lang}.wav`);
    if (!fs.existsSync(wav)) {
      skipped++;
      continue;
    }
    const dur = ffprobeDuration(wav);
    if (!dur) {
      console.warn(`  WARN: cannot read duration for ${video.id}-${lang}`);
      skipped++;
      continue;
    }
    const script = video[`script_${lang}`];
    if (!script) {
      skipped++;
      continue;
    }
    const sentences = splitSentences(script);
    const vtt = buildVtt(sentences, dur);
    const outFile = path.join(OUT_DIR, `${video.id}-${lang}.vtt`);
    fs.writeFileSync(outFile, vtt, 'utf-8');
    console.log(`  ✓ ${video.id}-${lang}.vtt  (${sentences.length} cues, ${dur.toFixed(1)}s)`);
    generated++;
  }
}

console.log(`\nDone: ${generated} VTT files generated, ${skipped} skipped.`);
