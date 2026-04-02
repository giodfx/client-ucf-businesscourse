import fs from 'fs';

const genFiles = fs.readdirSync('generated')
  .filter(f => f.startsWith('content-phase1-module') && f.endsWith('.json'))
  .sort();

const issues = [];

for (const gf of genFiles) {
  const gen = JSON.parse(fs.readFileSync('generated/' + gf, 'utf-8'));
  if (!gen.lessons) continue;

  for (const gl of gen.lessons) {
    const indPath = 'phase1-lessons/' + gl.lessonId + '.json';
    if (!fs.existsSync(indPath)) {
      issues.push(`${gl.lessonId}: NOT in phase1-lessons (would be LOST)`);
      continue;
    }
    const il = JSON.parse(fs.readFileSync(indPath, 'utf-8'));

    const genIds = new Set(gl.contentBlocks.map(b => b.id));
    const indIds = new Set(il.contentBlocks.map(b => b.id));

    // Blocks only in generated (excluding reflections we intentionally removed)
    const onlyGen = gl.contentBlocks.filter(b => !indIds.has(b.id) && b.type !== 'reflection');
    const onlyInd = il.contentBlocks.filter(b => !genIds.has(b.id));

    if (onlyGen.length > 0) {
      issues.push(`${gl.lessonId}: blocks ONLY in generated (WOULD BE LOST): ${onlyGen.map(b => b.id + '(' + b.type + ')').join(', ')}`);
    }
    if (onlyInd.length > 0) {
      issues.push(`${gl.lessonId}: blocks only in phase1-lessons (newer): ${onlyInd.map(b => b.id + '(' + b.type + ')').join(', ')}`);
    }

    // Check content differences in shared blocks
    for (const gb of gl.contentBlocks) {
      if (gb.type === 'reflection') continue;
      const ib = il.contentBlocks.find(b => b.id === gb.id);
      if (ib && gb.content && ib.content && gb.content !== ib.content) {
        const diff = Math.abs(gb.content.length - ib.content.length);
        if (diff > 50) {
          issues.push(`${gl.lessonId}/${gb.id}: content differs by ${diff} chars (gen:${gb.content.length} vs ind:${ib.content.length})`);
        }
      }
    }
  }
}

if (issues.length === 0) {
  console.log('ALL CLEAR - phase1-lessons has everything from generated (minus reflections)');
  console.log('Safe to rebuild generated/ from phase1-lessons/');
} else {
  console.log(`ISSUES FOUND (${issues.length}):`);
  issues.forEach(i => console.log('  ' + i));
}
