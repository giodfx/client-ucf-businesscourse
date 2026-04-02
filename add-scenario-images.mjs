import fs from 'fs';

const images = {
  'lesson-0-1': { src: 'images/scenarios/lesson-0-1-expansion-strategy.jpg', alt: 'International entrepreneur reviewing expansion strategy documents at a modern workspace' },
  'lesson-1-1': { src: 'images/scenarios/lesson-1-1-entity-comparison.jpg', alt: 'Entrepreneurs comparing business entity types with legal documents on a conference table' },
  'lesson-1-2': { src: 'images/scenarios/lesson-1-2-registered-agent.jpg', alt: 'Registered agent reviewing Florida business formation documents' },
  'lesson-1-3': { src: 'images/scenarios/lesson-1-3-bank-meeting.jpg', alt: 'Founder at Bank Meeting' },
  'lesson-2-1': { src: 'images/scenarios/lesson-2-1-tax-advisor-meeting.jpg', alt: 'International founder consulting with a tax advisor about U.S. business taxes' },
  'lesson-2-2': { src: 'images/scenarios/lesson-2-2-sales-tax-research.jpg', alt: 'Business owner researching Florida sales tax requirements on a laptop' },
  'lesson-2-3': { src: 'images/scenarios/lesson-2-3-bank-rejection.jpg', alt: 'Founder Facing Bank Rejection' },
  'lesson-3-1': { src: 'images/scenarios/lesson-3-1-trademark-attorney.jpg', alt: 'Founder meeting with a trademark attorney to protect intellectual property' },
  'lesson-3-2': { src: 'images/scenarios/lesson-3-2-insurance-broker.jpg', alt: 'Insurance broker explaining business coverage options to a startup founder' },
  'lesson-3-3': { src: 'images/scenarios/lesson-3-3-attorney-consultation.jpg', alt: 'Entrepreneur consulting with a business attorney about legal decisions' },
  'lesson-4-1': { src: 'images/scenarios/lesson-4-1-irs-classification.jpg', alt: 'IRS Classification Decision' },
  'lesson-4-2': { src: 'images/scenarios/lesson-4-2-immigration-consultation.jpg', alt: 'International founder in an immigration consultation discussing visa options' },
  'lesson-4-3': { src: 'images/scenarios/lesson-4-3-payroll-planning.jpg', alt: 'Business owner planning payroll and employee compensation at a desk' },
  'lesson-5-1': { src: 'images/scenarios/lesson-5-1-market-adaptation.jpg', alt: 'Entrepreneur adapting their product strategy for the U.S. market' },
  'lesson-5-2': { src: 'images/scenarios/lesson-5-2-trade-show.jpg', alt: 'Founder at U.S. Trade Show' },
  'lesson-6-1': { src: 'images/scenarios/lesson-6-1-meeting-communication.jpg', alt: 'Two Founders in Meeting — Communication Styles' },
  'lesson-6-2': { src: 'images/scenarios/lesson-6-2-networking-event.jpg', alt: 'Networking Event — Elevator Pitch Moment' },
  'lesson-6-3': { src: 'images/scenarios/lesson-6-3-cultural-misalignment.jpg', alt: 'International founder navigating cultural differences in a U.S. business meeting' },
  'lesson-7-1': { src: 'images/scenarios/lesson-7-1-advisory-consultation.jpg', alt: 'Founder meeting with a business advisor at a Central Florida resource center' },
  'lesson-7-2': { src: 'images/scenarios/lesson-7-2-ecosystem-networking.jpg', alt: 'Entrepreneurs networking at a Central Florida tech ecosystem event' },
  'lesson-7-3': { src: 'images/scenarios/lesson-7-3-economic-sectors.jpg', alt: 'Aerial view of Central Florida economic sectors including tech parks and industry' },
  'lesson-7-4': { src: 'images/scenarios/lesson-7-4-latam-gateway.jpg', alt: 'Florida as a gateway connecting Latin American and U.S. business markets' },
  'lesson-8-1': { src: 'images/scenarios/lesson-8-1-mentor-consultation.jpg', alt: 'Founder meeting with a mentor to review business readiness before launch' },
  'lesson-8-2': { src: 'images/scenarios/lesson-8-2-resources-preparation.jpg', alt: 'Entrepreneur organizing resources and preparation materials for U.S. market entry' },
  'lesson-8-3': { src: 'images/scenarios/lesson-8-3-ucf-meeting.jpg', alt: 'Founder at UCF 1:1 Meeting' }
};

let count = 0;
for (const [lessonId, imgInfo] of Object.entries(images)) {
  const filePath = `phase1-lessons/${lessonId}.json`;
  if (!fs.existsSync(filePath)) { console.log(`SKIP ${lessonId}`); continue; }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Skip if already has this image block
  if (data.contentBlocks.some(b => b.id === `scenario-img-${lessonId}`)) {
    console.log(`  ${lessonId}: already has scenario image`);
    continue;
  }

  const imgBlock = {
    type: 'in-lesson-image',
    id: `scenario-img-${lessonId}`,
    imagePath: imgInfo.src,
    title: imgInfo.alt
  };

  // Insert before first branching-scenario or scenario block
  const scenIdx = data.contentBlocks.findIndex(b =>
    b.type === 'branching-scenario' || b.type === 'scenario'
  );
  if (scenIdx >= 0) {
    data.contentBlocks.splice(scenIdx, 0, imgBlock);
  } else {
    // No scenario — insert before end-of-lesson cluster
    const endTypes = new Set(['reflection', 'knowledge-check', 'key-takeaway']);
    let insertIdx = data.contentBlocks.length;
    for (let i = data.contentBlocks.length - 1; i >= 0; i--) {
      if (endTypes.has(data.contentBlocks[i].type)) insertIdx = i;
      else break;
    }
    data.contentBlocks.splice(insertIdx, 0, imgBlock);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  count++;
  console.log(`  ${lessonId}: added scenario image`);
}
console.log(`\nAdded scenario images to ${count} lesson files`);
