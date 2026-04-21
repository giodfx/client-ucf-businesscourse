/**
 * Generate circular face badge images from full avatar images.
 * Crops the top portion (face area) of each avatar and creates 96x96 circular PNG badges.
 * Output: output/lessons/images/avatars/faces/lesson-X-Y-face.png
 */

import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';

const AVATAR_DIR = 'media/images/avatars/scenes';
const OUTPUT_DIR = 'output/lessons/images/avatars/faces';
const BADGE_SIZE = 96;
// Avatar images are wide landscape (~1360x760) with the person centered.
// Face is roughly at: horizontal center, vertical 5%-50% from top.
// We crop a square region from the center-top area to capture the head/shoulders.

async function main() {
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Find all lesson-*-avatar.png files (skip .bak and .original)
  const files = (await readdir(AVATAR_DIR))
    .filter(f => f.match(/^lesson-\d+-\d+-avatar\.png$/) && !f.includes('.bak') && !f.includes('.original'));

  console.log(`Found ${files.length} avatar images to process`);

  for (const file of files) {
    const lessonId = file.replace('-avatar.png', '');
    const inputPath = join(AVATAR_DIR, file);
    const outputPath = join(OUTPUT_DIR, `${lessonId}-face.png`);

    try {
      // Get image dimensions
      const meta = await sharp(inputPath).metadata();
      const { width, height } = meta;

      // Strategy: use Sharp's attention-based crop to find the face automatically
      // For landscape avatars (1360x760), this centers on the most visually
      // interesting region (the person's face).

      // Create circular mask
      const circle = Buffer.from(
        `<svg width="${BADGE_SIZE}" height="${BADGE_SIZE}">
          <circle cx="${BADGE_SIZE/2}" cy="${BADGE_SIZE/2}" r="${BADGE_SIZE/2}" fill="white"/>
        </svg>`
      );

      await sharp(inputPath)
        .resize(BADGE_SIZE, BADGE_SIZE, { fit: 'cover', position: sharp.strategy.attention })
        .composite([{ input: circle, blend: 'dest-in' }])
        .png()
        .toFile(outputPath);

      console.log(`  ${lessonId}: ${width}x${height} → ${BADGE_SIZE}x${BADGE_SIZE} circle`);
    } catch (err) {
      console.error(`  ${lessonId}: ERROR — ${err.message}`);
    }
  }

  console.log(`\nDone! Face badges saved to ${OUTPUT_DIR}/`);
}

main().catch(console.error);
