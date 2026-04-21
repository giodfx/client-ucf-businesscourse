import { readFileSync, writeFileSync } from 'fs';

const planPath = 'image-generation-plan.json';
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const s3 = plan.section3_qwen2512Scenarios;

const PREFIX = s3.stylePrefix;
const SUFFIX = s3.styleSuffix;

const newPrompts = [
  {
    id: 'scenario-0-1',
    lessonId: 'lesson-0-1',
    title: 'Founder Planning U.S. Expansion Strategy',
    outputFilename: 'lesson-0-1-expansion-strategy.png',
    diversityIndex: 0,
    insertAfter: 'U.S. Expansion Is a Strategy, Not a Checklist',
    qwenPrompt: PREFIX + ' a confident Hispanic Latina woman in her early 30s seated at an outdoor terrace table overlooking a panoramic Florida landscape at golden hour. She has a laptop open and reviews documents with a focused expression. Palm trees frame the scene. A roadmap document and coffee cup sit on the table. The terrace has a modern railing with a view of a distant city skyline and highways stretching across the horizon. ' + SUFFIX
  },
  {
    id: 'scenario-1-1',
    lessonId: 'lesson-1-1',
    title: 'Founder Comparing Business Entity Types',
    outputFilename: 'lesson-1-1-entity-comparison.png',
    diversityIndex: 1,
    insertAfter: 'How Your Entity Type Connects to Everything Else',
    qwenPrompt: PREFIX + ' a South Asian man in his 40s in professional attire seated across from a female business advisor at a glass conference table in a modern high-rise office. Through floor-to-ceiling windows behind them, an Orlando city skyline with glass towers and palm trees is visible. The advisor gestures toward comparison documents on the table. Warm afternoon light streams through the windows. Professional, collaborative atmosphere. ' + SUFFIX
  },
  {
    id: 'scenario-1-2',
    lessonId: 'lesson-1-2',
    title: 'Founder at Registered Agent Office',
    outputFilename: 'lesson-1-2-registered-agent.png',
    diversityIndex: 2,
    insertAfter: 'Registered Agent and Address',
    qwenPrompt: PREFIX + ' an African American man in his 30s in smart business casual attire walking confidently into a modern professional office building in Central Florida. He carries a leather portfolio. The building entrance has glass doors with a tasteful lobby visible inside. Palm trees and a blue sky frame the entrance. He is arriving at a registered agent office to establish business presence. Golden hour side lighting, modern architectural details visible. ' + SUFFIX
  },
  {
    id: 'scenario-2-1',
    lessonId: 'lesson-2-1',
    title: 'Founder Meeting Tax Advisor',
    outputFilename: 'lesson-2-1-tax-advisor-meeting.png',
    diversityIndex: 3,
    insertAfter: 'How Entity Type Affects Your Tax Treatment',
    qwenPrompt: PREFIX + ' a young Asian American woman in her late 20s in professional attire meeting with a male CPA in a well-appointed financial district office. Classical architecture with columns and reflecting pools visible through the window. The CPA points to tax comparison documents on a mahogany desk. A laptop shows financial charts. Warm interior lighting contrasts with blue-toned exterior. Professional, reassuring atmosphere. ' + SUFFIX
  },
  {
    id: 'scenario-2-2',
    lessonId: 'lesson-2-2',
    title: 'Founder Researching Multi-State Sales Tax',
    outputFilename: 'lesson-2-2-sales-tax-research.png',
    diversityIndex: 4,
    insertAfter: 'How U.S. Sales Tax Compares to VAT',
    qwenPrompt: PREFIX + ' a Caucasian woman in her 40s with auburn hair at a modern desk in a home office, reviewing documents and a laptop showing sales tax information. She looks focused, with various papers representing different state requirements spread on the desk. Through the window behind her, a classical financial district building with columns is visible. A cup of tea and reading glasses sit on the desk. Soft afternoon light fills the room. ' + SUFFIX
  },
  {
    id: 'scenario-3-1',
    lessonId: 'lesson-3-1',
    title: 'Founder with Trademark Attorney',
    outputFilename: 'lesson-3-1-trademark-attorney.png',
    diversityIndex: 5,
    insertAfter: 'Trademark Registration',
    qwenPrompt: PREFIX + ' a Hispanic Latino man in his 50s in business attire meeting with a female IP attorney in a modern law office. They review trademark registration documents together at a desk. The attorney points to a form while the founder takes notes. Through the office window, Florida marshland with tall grass and distant static launch towers are visible against a blue sky. Warm golden lighting from a desk lamp. Professional, collaborative mood. ' + SUFFIX
  },
  {
    id: 'scenario-3-2',
    lessonId: 'lesson-3-2',
    title: 'Founder with Insurance Broker',
    outputFilename: 'lesson-3-2-insurance-broker.png',
    diversityIndex: 6,
    insertAfter: 'Business Insurance',
    qwenPrompt: PREFIX + ' a multiracial woman in her 30s in business casual attire meeting with a male insurance broker in a bright modern office. The broker presents policy options on a tablet while the founder listens attentively. A glass-walled conference room with contemporary furniture. Through the windows, Florida marshland with tall grass and a clear sky is visible. Professional and trusting atmosphere. Soft natural light, warm earth tones. ' + SUFFIX
  },
  {
    id: 'scenario-3-3',
    lessonId: 'lesson-3-3',
    title: 'Founder Consulting Business Attorney',
    outputFilename: 'lesson-3-3-attorney-consultation.png',
    diversityIndex: 0,
    insertAfter: 'Finding the Right Attorney',
    qwenPrompt: PREFIX + ' a confident Hispanic Latina woman founder in her 30s sitting across from a seasoned male attorney in a law office with bookshelves filled with legal volumes. They are in deep discussion, the attorney leaning forward helpfully. Legal documents and a contract spread on the desk between them. Through a side window, Florida marshland stretches to the horizon under golden hour light. Warm interior wood tones. ' + SUFFIX
  },
  {
    id: 'scenario-4-2',
    lessonId: 'lesson-4-2',
    title: 'Founder in Immigration Consultation',
    outputFilename: 'lesson-4-2-immigration-consultation.png',
    diversityIndex: 1,
    insertAfter: 'Choosing Your Guide',
    qwenPrompt: PREFIX + ' a South Asian man in his 40s in a consultation with a female immigration attorney in her professional office. He has his passport, visa documents, and business plan organized on the desk. The attorney reviews the documents while explaining options with a reassuring expression. Through the window, festive architecture facades with string lights and palm trees are visible in warm afternoon sun. Professional, hopeful mood. ' + SUFFIX
  },
  {
    id: 'scenario-4-3',
    lessonId: 'lesson-4-3',
    title: 'Founder Reviewing Payroll System',
    outputFilename: 'lesson-4-3-payroll-planning.png',
    diversityIndex: 2,
    insertAfter: 'Use a Payroll Service',
    qwenPrompt: PREFIX + ' an African American man in his 30s at a clean modern desk confidently using a laptop showing payroll software. A quarterly calendar with marked deadlines is pinned to the wall beside him. He looks organized and relieved, with a subtle smile. His office is bright with natural light. Through the window, festive architecture facades with colorful string lights and palm trees create an optimistic Florida backdrop. Coffee cup and organized folders on the desk. ' + SUFFIX
  },
  {
    id: 'scenario-5-1',
    lessonId: 'lesson-5-1',
    title: 'Entrepreneurs Reviewing Market Adaptation',
    outputFilename: 'lesson-5-1-market-adaptation.png',
    diversityIndex: 3,
    insertAfter: 'Adaptation Starts Before You Sell',
    qwenPrompt: PREFIX + ' a young Asian American woman and an African American man, both in business casual attire, standing at a large table in a commercial workspace reviewing product samples and market research documents. The woman holds a tablet showing competitor pricing data. Through industrial windows behind them, a Florida harbor with container yards, dock pilings, and bollards is visible under a clear blue sky. Collaborative strategic atmosphere. Natural harbor light fills the space. ' + SUFFIX
  },
  {
    id: 'scenario-6-3',
    lessonId: 'lesson-6-3',
    title: 'Cultural Misalignment in Business Meeting',
    outputFilename: 'lesson-6-3-cultural-misalignment.png',
    diversityIndex: 4,
    insertAfter: 'More Missteps That Drain Your Budget',
    qwenPrompt: PREFIX + ' two professionals sitting across a glass conference table in a modern beachside office. A Caucasian woman in her 40s smiles warmly and takes notes with enthusiasm. Across from her, a middle-aged American businessman is polite but his expression is neutral and noncommittal. Subtle cultural tension in body language. Through floor-to-ceiling windows behind them, sandy dunes with sea oats and ocean waves are visible under late afternoon sky. Warm ambient light. ' + SUFFIX
  },
  {
    id: 'scenario-7-1',
    lessonId: 'lesson-7-1',
    title: 'Founder with SBDC Business Advisor',
    outputFilename: 'lesson-7-1-advisory-consultation.png',
    diversityIndex: 5,
    insertAfter: 'Free Help Is Closer Than You Think',
    qwenPrompt: PREFIX + ' a Hispanic Latino man in his 50s, an entrepreneur, having a one-on-one consultation with a friendly female SBDC business advisor in a modern office. The advisor shows him a resource guide on her tablet. Both appear engaged and collaborative. Behind them through a large window, a Florida spring landscape is visible with cypress trees draped in Spanish moss, lush green ferns, and dappled sunlight filtering through the canopy. Warm, supportive atmosphere. ' + SUFFIX
  },
  {
    id: 'scenario-7-2',
    lessonId: 'lesson-7-2',
    title: 'Ecosystem Networking Event',
    outputFilename: 'lesson-7-2-ecosystem-networking.png',
    diversityIndex: 6,
    insertAfter: 'The Living Ecosystem',
    qwenPrompt: PREFIX + ' a networking event in a modern atrium space in Central Florida. A diverse group of six professionals including a Latina woman, a Black man, an Asian woman, a white man, a Middle Eastern woman, and a Brazilian man, stand in small conversation clusters holding drinks. The space has modern industrial-chic decor with exposed brick and warm pendant lighting. Through large windows, cypress trees with Spanish moss and a peaceful river are visible. Energetic but professional atmosphere. ' + SUFFIX
  },
  {
    id: 'scenario-7-3',
    lessonId: 'lesson-7-3',
    title: 'Central Florida Economic Sectors',
    outputFilename: 'lesson-7-3-economic-sectors.png',
    diversityIndex: 0,
    insertAfter: 'Where the Jobs and Revenue Are',
    qwenPrompt: PREFIX + ' a panoramic view of Central Florida showing the diverse economic ecosystem. In the foreground, a modern tech office with glass walls where professionals work at computers. In the middle ground, a medical research facility with a campus. In the background, tourism and hospitality buildings with palm trees line the horizon. Cypress trees and Spanish moss frame the sides. Golden hour lighting bathes the entire scene. Three economic sectors coexisting in one landscape. ' + SUFFIX
  },
  {
    id: 'scenario-7-4',
    lessonId: 'lesson-7-4',
    title: 'LATAM Trade Corridor Gateway',
    outputFilename: 'lesson-7-4-latam-gateway.png',
    diversityIndex: 1,
    insertAfter: 'LATAM Trade Corridor',
    qwenPrompt: PREFIX + ' a South Asian man in his 40s in business attire standing in a modern airport terminal with large windows. He holds a boarding pass and his phone, looking out at aircraft on the tarmac with anticipation. The terminal has contemporary architecture with high ceilings and natural light flooding in. Other diverse business travelers move through the terminal in the background. Through the windows, a Florida landscape with cypress trees is visible beyond the airport. Mood of anticipation and opportunity. ' + SUFFIX
  },
  {
    id: 'scenario-8-1',
    lessonId: 'lesson-8-1',
    title: 'Founders with Business Mentor at UCF',
    outputFilename: 'lesson-8-1-mentor-consultation.png',
    diversityIndex: 2,
    insertAfter: 'Where Do You Need More Help',
    qwenPrompt: PREFIX + ' two international founders, an African American man in his 30s and a Latina woman, meeting with a senior female business mentor in a cozy campus office. The mentor reviews a readiness assessment worksheet with them. Books and framed certificates line the walls. Through the window, the UCF campus is visible with distinctive red brick buildings, live oak trees with spreading canopies, and a stone fountain in a courtyard. Warm late afternoon light, supportive encouraging atmosphere. ' + SUFFIX
  },
  {
    id: 'scenario-8-2',
    lessonId: 'lesson-8-2',
    title: 'Founder Preparing Resources for Launch',
    outputFilename: 'lesson-8-2-resources-preparation.png',
    diversityIndex: 3,
    insertAfter: 'Resource 4: Expansion Decision Worksheet',
    qwenPrompt: PREFIX + ' a young Asian American woman founder in her late 20s sitting at a desk in a bright campus coworking space, organizing printed checklists and digital resources on her laptop. Resource guides and worksheets are neatly arranged on the desk. She has a confident, accomplished expression, preparing to launch her business. Through a nearby window, a UCF campus with red brick buildings, live oaks, and students walking on pathways is visible. Warm natural light fills the space. ' + SUFFIX
  }
];

const existingIds = new Set(s3.prompts.map(p => p.id));
let added = 0;
for (const np of newPrompts) {
  if (existingIds.has(np.id)) {
    console.log('  SKIP ' + np.id + ' (already in plan)');
  } else {
    s3.prompts.push(np);
    added++;
    console.log('  ADD  ' + np.id + ': ' + np.title);
  }
}

s3.prompts.sort((a, b) => {
  const [am, al] = a.lessonId.replace('lesson-', '').split('-').map(Number);
  const [bm, bl] = b.lessonId.replace('lesson-', '').split('-').map(Number);
  return am !== bm ? am - bm : al - bl;
});

plan.summary.qwen2512Scenarios = s3.prompts.length;
plan.summary.total = (plan.summary.htmlCssDataViz || 0) + (plan.summary.geminiInfographics || 0) + (plan.summary.convertedToInteractive || 0) + (plan.summary.geminiMaps || 0) + s3.prompts.length;

writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log('\nDone: added ' + added + ' prompts. Total now: ' + s3.prompts.length);
