import fs from 'fs';
import path from 'path';

const genDir = 'generated';
const bpPath = fs.existsSync('blueprint-v2-design-infused.json') ? 'blueprint-v2-design-infused.json'
  : fs.existsSync('blueprint.json') ? 'blueprint.json'
  : 'blueprint-v1-content-pure.json';
const bp = JSON.parse(fs.readFileSync(bpPath, 'utf-8'));
console.log(`Using blueprint: ${bpPath}`);
const modules = bp.courseStructure.modules;
console.log(`Blueprint has ${modules.length} modules\n`);

for (const mod of modules) {
  const moduleNum = mod.id.replace('module-', '');

  // Load existing generated file for module-level metadata
  let existingMod = {};
  const existingPath = path.join(genDir, `content-phase1-module${moduleNum}.json`);
  const existingPathHyphen = path.join(genDir, `content-phase1-module-${moduleNum}.json`);

  if (fs.existsSync(existingPath)) {
    existingMod = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
  } else if (fs.existsSync(existingPathHyphen)) {
    existingMod = JSON.parse(fs.readFileSync(existingPathHyphen, 'utf-8'));
  }

  // Build lessons array from phase1-lessons
  const lessons = [];
  for (const lesson of mod.lessons) {
    const lessonFile = path.join('phase1-lessons', `${lesson.id}.json`);
    if (fs.existsSync(lessonFile)) {
      lessons.push(JSON.parse(fs.readFileSync(lessonFile, 'utf-8')));
    } else {
      console.log(`  WARNING: ${lessonFile} not found`);
    }
  }

  // Build module file preserving existing metadata
  const moduleData = {
    moduleId: mod.id,
    title: existingMod.title || mod.title,
    description: existingMod.description || '',
    landscapeTheme: existingMod.landscapeTheme || '',
    lessons,
  };
  if (existingMod.learningOutcomes) moduleData.learningOutcomes = existingMod.learningOutcomes;
  if (existingMod.weekNumber != null) moduleData.weekNumber = existingMod.weekNumber;

  // Write as non-hyphenated format
  fs.writeFileSync(existingPath, JSON.stringify(moduleData, null, 2) + '\n', 'utf-8');
  console.log(`content-phase1-module${moduleNum}.json: ${lessons.length} lessons`);

  // Remove hyphenated duplicate if it exists
  if (fs.existsSync(existingPathHyphen)) {
    fs.unlinkSync(existingPathHyphen);
    console.log(`  Removed duplicate: content-phase1-module-${moduleNum}.json`);
  }
}

console.log('\nDone. generated/ rebuilt from phase1-lessons/');
