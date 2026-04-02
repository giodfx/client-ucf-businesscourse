import fs from 'fs';

// Lessons that already had an image block with the scenario image
const dupes = ['lesson-1-3', 'lesson-2-3', 'lesson-4-1', 'lesson-5-2', 'lesson-6-1', 'lesson-6-2', 'lesson-8-3'];

for (const lid of dupes) {
  const path = `phase1-lessons/${lid}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const before = data.contentBlocks.length;
  data.contentBlocks = data.contentBlocks.filter(b => b.id !== `scenario-img-${lid}`);
  const after = data.contentBlocks.length;
  if (before !== after) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`${lid}: removed duplicate (${before} → ${after} blocks)`);
  }
}
console.log('Done');
