import fs from 'fs';

// Map of link text → URL, extracted from committed HTML
const linkMap = [
  // Common across multiple lessons
  ['Hispanic Chamber of Commerce of Metro Orlando', 'https://hispanicchamber.com/'],
  ['Prospera', 'https://prosperausa.org/'],
  ['UCF BIP network', 'https://incubator.ucf.edu/'],
  ['UCF BIP', 'https://incubator.ucf.edu'],
  ['SBDC at UCF', 'https://sbdcorlando.com/'],
  ['Hispanic Bar Association of Central Florida', 'https://hbacf.com/'],
  ['Florida SBDC at UCF', 'https://floridasbdc.org'],
  ['Florida SBDC', 'https://floridasbdc.org'],
  ['SCORE Orlando', 'https://orlando.score.org'],
  ['Orlando Economic Partnership', 'https://orlando.org'],
  // lesson-8-1 specific
  ['SunBiz', 'https://sunbiz.org'],
  ['USPTO', 'https://www.uspto.gov'],
  ['IRS EIN', 'https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers'],
  // lesson-8-2 specific
  ['LegalZoom', 'https://www.legalzoom.com'],
  ['Incfile', 'https://www.incfile.com'],
  ['Florida Bar Lawyer Referral', 'https://www.floridabar.org/public/lrs/'],
  ['Mercury', 'https://mercury.com'],
  ['Relay', 'https://relayfi.com'],
  ['Stripe Atlas', 'https://stripe.com/atlas'],
  ['QuickBooks Online', 'https://quickbooks.intuit.com'],
  ['USCIS', 'https://www.uscis.gov'],
  ['Boundless', 'https://www.boundless.com'],
  ['AILA Lawyer Search', 'https://www.ailalawyer.com'],
  ['Fragomen', 'https://www.fragomen.com'],
];

const lessonsToFix = ['lesson-1-1', 'lesson-2-3', 'lesson-3-3', 'lesson-4-3', 'lesson-8-1', 'lesson-8-2'];

for (const lid of lessonsToFix) {
  const path = `phase1-lessons/${lid}.json`;
  let json = fs.readFileSync(path, 'utf-8');
  let changed = false;

  for (const [text, url] of linkMap) {
    const mdLink = `[${text}](${url})`;
    // Only replace if the plain text exists but not already as a markdown link
    if (json.includes(text) && !json.includes(mdLink)) {
      // Escape for regex — match the text that's NOT already inside []()
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match the text NOT preceded by [ and NOT followed by ]
      const re = new RegExp(`(?<!\\[)${escaped}(?!\\]\\()`, 'g');
      const before = json;
      json = json.replace(re, mdLink);
      if (json !== before) {
        changed = true;
        console.log(`  ${lid}: linked "${text}"`);
      }
    }
  }

  if (changed) {
    fs.writeFileSync(path, json, 'utf-8');
  }
}
console.log('Done adding links to JSON');
