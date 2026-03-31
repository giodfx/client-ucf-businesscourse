# UCF BIP — Instructional Design Improvement Plan
## Comprehensive Content Audit & Enhancement Roadmap

**Created:** 2026-03-31
**Status:** PENDING IMPLEMENTATION
**Audit scope:** All 26 lessons across 9 modules (~23,650 words)

---

## Table of Contents

1. [Critical Issues (Pre-Launch Blockers)](#1-critical-issues-pre-launch-blockers)
2. [Knowledge Check → Scenario Reflection Redesign](#2-knowledge-check--scenario-reflection-redesign)
3. [Exercise + Reflection Consolidation](#3-exercise--reflection-consolidation)
4. [Text + Interactive Redundancy Removal](#4-text--interactive-redundancy-removal)
5. [Content Density — Splitting & Restructuring](#5-content-density--splitting--restructuring)
6. [Misplaced Content — Relocations](#6-misplaced-content--relocations)
7. [Image Strategy — Per-Lesson Visual Plan](#7-image-strategy--per-lesson-visual-plan)
8. [New Interactives & Scenarios](#8-new-interactives--scenarios)
9. [Implementation Order](#9-implementation-order)

---

## 1. Critical Issues (Pre-Launch Blockers)

These MUST be resolved before the course goes live. Not content-design issues — these are missing/placeholder content.

### CRIT-1: Lesson 7-5 — Success Stories Are Placeholders
- **What:** Three complete success story block quotes contain `[PENDING: Brian to provide company details]`
- **Who owns it:** Brian
- **Action:** Brian provides 3 real UCF BIP company success stories with: company name, country of origin, what they did, outcome, quote
- **Fallback:** If Brian can't provide by launch, replace with a single paragraph acknowledging alumni success and linking to UCF BIP website

### CRIT-2: Lesson 8-3 — Meeting Booking Link Is Placeholder
- **What:** `[BOOK YOUR 1:1 MEETING | Calendly link placeholder]` in the opening section
- **Who owns it:** Brian / UCF BIP team
- **Action:** Replace with actual Calendly or booking URL
- **Fallback:** Replace with generic "Contact your UCF BIP advisor to schedule your 1:1 meeting" + email address

### CRIT-3: Lesson 8-2 — Download Resources Have No Delivery Mechanism
- **What:** Four resources are described (U.S. Market Entry Checklist, Florida Setup Roadmap, Central Florida Resource Guide, Expansion Decision Worksheet) but there are no download URLs, attachment points, or links
- **Who owns it:** Course development team
- **Action options:**
  - (a) Create the 4 resources as PDFs → host on R2 → link in lesson
  - (b) Create them as in-course interactive checklists (preferred — keeps learner in the course)
  - (c) Remove the resource descriptions and replace with a single "Resources will be provided during your Phase 2 onboarding" note
- **Recommendation:** Option (b) — convert each into an interactive checklist the learner can work through

### CRIT-4: Lesson 7-5 — Track Name Inconsistency
- **What:** Checklist references "Traction, Growth, or Soft Landing" tracks, but the rest of the course only mentions "phases 2 and 3" of the program
- **Action:** Align terminology — either use track names consistently (if that's the real program structure) or replace with "phases 2 and 3" to match the rest of the course

---

## 2. Knowledge Check → Scenario Reflection Redesign

### Current State
- Called "Quick Check: What Would You Do?" in Module 0-1, "Check Your Understanding" or "Knowledge Check" elsewhere
- Split into 2-3 separate blocks per lesson in Modules 2-8 (fragmented UX)
- 3 scenario-based MC questions per lesson (most are well-designed)

### Target State
- **Rename to:** "What Would You Do?" (consistent across all 26 lessons)
- **Subtitle:** "Three quick scenarios — pick the best approach"
- **Consolidate:** All 3 questions into a single block per lesson
- **UX behavior:**
  - Present one question at a time (card-style)
  - User selects answer → immediate feedback (correct/incorrect + explanation)
  - Clear progress indicator: "1 of 3" / "2 of 3" / "3 of 3"
  - After question 3, brief completion message, then auto-advance or "Continue" button
  - NOT graded, NOT punitive — this is reflective practice, not assessment
- **Tone:** Encouraging. Wrong answers get "Here's another way to think about it..." not "Incorrect."

### Lessons Requiring KC Consolidation

| Lesson | Current Blocks | Action |
|--------|---------------|--------|
| lesson-0-1 | 1 block (3 questions) | Rename only |
| lesson-1-1 | 1 block (3 questions) | Rename only |
| lesson-1-2 | 1 block (3 questions) | Rename only |
| lesson-1-3 | 1 block (3 questions) | Rename only |
| lesson-2-1 | 2 blocks (2+1) | Merge into 1 block (3 questions) |
| lesson-2-2 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-2-3 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-3-1 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-3-2 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) + move Q1 (NDA) to 3-3 |
| lesson-3-3 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) + receive Q from 3-2 |
| lesson-4-1 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-4-2 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-4-3 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-5-1 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-5-2 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-6-1 | 2 blocks (2+1) | Merge into 1 block (3 questions) |
| lesson-6-2 | 2 blocks (2+1) | Merge into 1 block (3 questions) |
| lesson-6-3 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-7-1 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-7-2 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-7-3 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-7-4 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-7-5 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-8-1 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-8-2 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |
| lesson-8-3 | 3 blocks (1+1+1) | Merge into 1 block (3 questions) |

**Total: 22 lessons need KC consolidation, 4 are already correct.**

---

## 3. Exercise + Reflection Consolidation

### Principle
Each lesson gets ONE closing activity — either an exercise (if there's something actionable to do) or a reflection (if it's more introspective). Never both covering the same scope.

### Consolidation Plan

| Lesson | Current | Keep | Remove | Rationale |
|--------|---------|------|--------|-----------|
| 3-2 | Exercise: "Your Risk Assessment" + Reflection: "Your Risk Protection Plan" | Keep exercise (actionable) | Remove reflection | Both ask learner to identify risk areas |
| 4-1 | Exercise: "Calculate Your True Hiring Cost" + Reflection: "Think About Your First Hire" | Keep exercise (has calculations) | Remove reflection | Exercise is concrete, reflection is vague |
| 4-3 | Exercise: "Calculate Your First Employee's True Cost" + Reflection: "Your First U.S. Hire — The Real Number" | Keep exercise | Remove reflection | Nearly identical scope — both about cost |
| 5-1 | Exercise: "Your U.S. Market Adaptation Checklist" + Reflection: "Your Product Adaptation Plan" | Keep exercise (checklist) | Remove reflection | Exercise is structured, reflection duplicates it |
| 5-2 | Exercise: "Build Your U.S. Sales Readiness Kit" + Reflection: "Your First 3 U.S. Customers" | Keep both — different scope | — | Exercise = materials prep, Reflection = targeting. Rename reflection to "Reflection: Identify Your First 3 U.S. Customers" |
| 6-1 | Exercise: "Your Communication Style Audit" + Reflection: "Your Communication Style Audit" | Keep exercise | Remove reflection | Literally the same title |
| 6-2 | Exercise: "Your U.S. Elevator Pitch" + Reflection: "Your Next U.S. Meeting Game Plan" | Keep both — different scope | — | Exercise = pitch writing, Reflection = meeting planning |
| 7-1 | Reflection: "Your Resource Action Plan" + Exercise: "Your Support Network Map" | Merge into one exercise | Remove reflection | Both ask "which organizations will you use?" |
| 7-4 | Exercise: "Your Location Decision Framework" + Reflection: "Your Central Florida Runway Calculation" | Keep exercise | Remove reflection | Exercise subsumes the reflection |
| 7-5 | Reflection: "Your Readiness and Next Step" + Exercise: "Your UCF BIP Roadmap" | Keep exercise | Remove reflection | Exercise is structured, reflection is open-ended on same topic |
| 8-1 | Exercise: "Readiness Scoring Exercise" + Reflection: "Honest Reflection: What Surprised You Most?" | Keep both — different scope | — | Exercise = scoring, Reflection = meta-cognitive. Different enough. |
| 8-3 | Exercise: "Write Down Your Top 3 Actions" + Reflection: "Value Reflection" + Reflection: "Program Improvement Feedback" | Keep exercise + last reflection | Remove "Value Reflection" | Exercise = action planning, "Program Improvement" = course feedback (different purpose). "Value Reflection" duplicates exercise. |

**Summary: Remove 9 blocks, keep 2 pairs that have genuinely different scope.**

---

## 4. Text + Interactive Redundancy Removal

### Principle
When a text section and an interactive component cover the same content, keep the interactive and convert the text into a brief 1-2 sentence intro that sets up the interactive. Do NOT delete meaning — compress and redirect.

### Changes

#### Lesson 0-1: Four Themes Triple Redundancy
- **Current:** Text "Four Themes You Will See" → Tabs "Course Themes — Your Four Guideposts" → Table "Core Themes & Common Pitfalls"
- **Action:** Keep tabs (richest format). Remove the text block (themes are covered in tabs). Keep table but ONLY if it adds the pitfalls column (which tabs don't have). If tabs already include pitfalls, remove table too.
- **New flow:** 1-2 sentence intro → Tabs (themes with pitfalls integrated into each tab)

#### Lesson 1-1: Entity Types Text → Comparison Card
- **Current:** 3 separate text blocks (LLC, C-Corp, S-Corp) → Comparison card "LLC vs. C-Corp vs. S-Corp"
- **Action:** Compress 3 text blocks into one 2-3 sentence intro paragraph that frames the decision ("The entity you choose affects your taxes, banking, and fundraising options. Here are the three structures used by international founders.") → Comparison card carries all detail
- **Preserve:** The storefront/tower analogy from the LLC/C-Corp text — weave into intro or into comparison card descriptions

#### Lesson 3-1: IP Types Text → Comparison Card
- **Current:** Opening text covers copyright, trademark, patent in paragraphs → Comparison card covers same three
- **Action:** Opening text becomes 2 sentences about IP territoriality (the key concept) → Comparison card carries all three IP type details
- **Preserve:** Chile founder story (stays in intro), territoriality concept (stays in intro)

#### Lesson 5-1: Five Adaptation Areas Text → Tabs
- **Current:** Text "Five Areas Where Adaptation Is Usually Needed" (with H4 sub-headers) → Tabs "Market Adaptation — Key Areas to Localize"
- **Action:** Replace text with 2-sentence intro ("Entering the U.S. market usually requires changes in five key areas. Here's what to expect.") → Tabs carry all detail
- **Preserve:** UAE property management pricing story ($15 vs $35) — move into relevant tab

#### Lesson 7-1: Organizations Text → Accordion
- **Current:** Text "The Key Organizations — What Each One Does" → Accordion "Resource Directory"
- **Action:** Replace text with 2-sentence intro ("Central Florida has several free or low-cost organizations specifically designed to help international founders. Here are the five you should know.") → Accordion carries all detail
- **Preserve:** Colombia founder story ($4,500 consultant vs. free SBDC) — keep in intro paragraph as motivating hook

#### Lesson 7-3: Industry Clusters Text → Table
- **Current:** Text "Industry Cluster Data" → Table "Central Florida Industry Clusters"
- **Action:** Replace text with 1-sentence intro → Table carries all data
- **Preserve:** Any narrative context not captured in table columns

#### Lesson 7-4: City Comparison Text → Tabs
- **Current:** Text "City-by-City Comparison" → Tabs "Central Florida vs. Other U.S. Entry Points"
- **Action:** Replace text with 1-sentence intro → Tabs carry all comparison detail

#### Lesson 4-2: Visa Text → Accordion
- **Current:** Text "Four Backstage Passes, Four Different Doors" → Accordion "Visa Pathways — Detailed Breakdown"
- **Action:** Replace text with 2-sentence intro using the backstage pass metaphor → Accordion carries all visa details
- **Preserve:** Backstage pass metaphor framing

---

## 5. Content Density — Splitting & Restructuring

### Principle
Dense content should NOT be deleted — it should be restructured. Options: break into sub-sections with images between them, add a scenario/interactive to break the wall, or in extreme cases split the lesson section into two parts.

### Text Wall Remediation

| Lesson | Section | Problem | Solution |
|--------|---------|---------|----------|
| **0-1** | "Time Commitment & Program Introduction" | 7 consecutive paragraphs | Split after para 3 with a hero image (highway/welcome theme). First half = "welcome, what this is." Second half = "how long it takes, what to expect." |
| **2-1** | Opening section | 6 paragraphs covering Brazil story + tax overview | Insert image after Brazil founder story (financial district illustration). Break remaining text with H4 sub-headers. |
| **2-3** | Opening section | 6 paragraphs, multiple sub-topics — WORST TEXT WALL in course | Split into two distinct sections: (1) "Why Banks Say No" (rejection reasons + Kenya founder story), (2) "What You Can Do About It" (5-step action list). Insert scenario interactive between them: "A bank just rejected your application. What's your next move?" |
| **3-1** | Opening section | 6 paragraphs covering IP territoriality + 3 types | Handled by redundancy removal above (text becomes 2-sentence intro → comparison card). Problem solved. |
| **6-1** | Opening section | 5 paragraphs + phrase list before any visual break | Insert image after the direct-vs-indirect communication explanation (beach meeting illustration). Move phrase bullet list into the flashcards interactive (consolidate). |
| **7-2** | "Your Networking Map" | 334 words of dense text | Convert into accordion interactive: "Where to Show Up" with 3 sections (Events & Conferences / Coworking & Incubators / People & Online Communities) |

---

## 6. Misplaced Content — Relocations

| What | From | To | Rationale |
|------|------|-----|-----------|
| KC question about NDA/contracts | lesson-3-2 (Insurance) KC block 1 | lesson-3-3 (Contracts) | Question is about contracts, not insurance |
| Callout: "Culture Shift — The Handshake Deal Is Dead" | lesson-3-2 (Insurance) | lesson-6-2 (Meetings & Trust) | Culture insight belongs in culture module |
| Common mistake: "Working without visa authorization" | lesson-4-1 (Hiring) | lesson-4-2 (Visa Pathways) | Visa content belongs in visa lesson |
| Flashcard phrase overlap: "Let's circle back" | lesson-6-3 | Remove from 6-3 (keep in 6-1) | Duplicate across two lessons |
| "Why Florida" promotional section | lesson-1-2 opening | Consider moving to lesson-0-1 or removing | Not aligned with lesson 1-2 objectives (registration process) |

---

## 7. Image Strategy — Per-Lesson Visual Plan

### Image Types

| Type | Generation Method | Style |
|------|-------------------|-------|
| **Module Hero Banner** | AI-generated (Gemini or ComfyUI) | Road trip landscape matching module theme, professional-modern style, 16:9 |
| **Process Diagram / Infographic** | AI-generated via Gemini (complex) or HTML/CSS (simple) | Clean, branded, step-by-step flow |
| **Comparison Visual** | HTML/CSS interactive or AI infographic | Side-by-side cards, consistent color coding |
| **Data Visualization** | HTML/CSS (charts, graphs) | Branded bar/pie charts matching course palette |
| **Scenario Illustration** | AI-generated (Gemini) | Founder in business situation, illustrated style matching avatars |
| **Founder Story Illustration** | AI-generated (Gemini) | Narrative scene, warm and professional |
| **Geographic/Resource Map** | AI-generated infographic (Gemini) | Central Florida map with labeled locations |

### Per-Lesson Image Plan

| Lesson | Image 1 | Image 2 | Image 3 |
|--------|---------|---------|---------|
| **0-1** | Module 0 hero: Highway overlook, sunset, palm trees | — | — |
| **1-1** | Module 1 hero: Orlando city skyline, rooftop terrace | Process diagram: Entity decision flowchart (LLC→C-Corp→S-Corp) | — |
| **1-2** | Infographic: SunBiz 8-step registration process | — | — |
| **1-3** | Scenario illustration: Founder at bank meeting | — | — |
| **2-1** | Module 2 hero: Financial district, classical facades | Data viz: Federal vs State vs Local tax breakdown (HTML/CSS chart) | — |
| **2-2** | Infographic: VAT vs U.S. Sales Tax comparison | — | — |
| **2-3** | Scenario illustration: Founder facing bank rejection | — | — |
| **3-1** | Module 3 hero: Florida marshland, launch towers | Infographic: Trademark registration timeline | — |
| **3-2** | Infographic: Insurance types overview | — | — |
| **3-3** | — (short lesson, timeline interactive is sufficient) | — | — |
| **4-1** | Module 4 hero: Theme park architecture, string lights | Scenario illustration: IRS classification decision | — |
| **4-2** | Infographic: Visa pathway comparison chart | — | — |
| **4-3** | Data viz: True employer cost breakdown (HTML/CSS stacked bar chart) | — | — |
| **5-1** | Module 5 hero: Port/shopping district, container yard | — | — |
| **5-2** | Scenario illustration: Founder at U.S. trade show | — | — |
| **6-1** | Module 6 hero: Beach, sandy dunes, ocean sunset | Scenario illustration: Two founders in meeting (direct vs indirect communication) | — |
| **6-2** | Scenario illustration: Networking event / elevator pitch | — | — |
| **6-3** | Infographic: Cultural missteps with dollar costs | — | — |
| **7-1** | Module 7 hero: Cypress trees, Spanish moss, springs | Resource map: Central Florida organizations geographic directory | — |
| **7-2** | Geographic map: Central Florida networking locations | — | — |
| **7-3** | Data viz: Cost comparison chart (HTML/CSS bar chart) | Data viz: Industry clusters chart (HTML/CSS) | — |
| **7-4** | Data viz: City-by-city comparison chart (HTML/CSS radar or bar) | — | — |
| **7-5** | — (pending success story content from Brian) | — | — |
| **8-1** | Module 8 hero: UCF campus, red brick, live oaks | — | — |
| **8-2** | — (resource lesson, minimal imagery needed) | — | — |
| **8-3** | Scenario illustration: Founder at UCF 1:1 meeting | — | — |

**Totals:**
- Module hero banners: 9 (one per module)
- Process diagrams / infographics: 7
- Data visualizations (HTML/CSS): 5
- Scenario/founder illustrations: 7
- Geographic/resource maps: 2
- **Grand total: ~30 images**

### Generation Approach
- **HTML/CSS data visualizations** (5): Build in-course using branded styles. No image generation needed.
- **Infographics** (7): Generate via Gemini (too complex for local models, requires clean text rendering)
- **Module hero banners** (9): Generate via ComfyUI or Gemini, matching module landscape themes from blueprint
- **Scenario illustrations** (7): Generate via Gemini, illustrated professional style matching avatar aesthetic
- **Geographic maps** (2): Generate via Gemini with Central Florida base map

---

## 8. New Interactives & Scenarios

### Principle
Add scenarios wherever learners can practice decision-making. Prefer branching scenarios (pick path → see consequence) over passive content. Also add interactives to replace dense text sections.

### New Interactives to Add

| Lesson | Type | Title | Description |
|--------|------|-------|-------------|
| **2-3** | **Scenario (branching)** | "The Bank Said No — What Now?" | Bank rejects application. 3 paths: try another bank / ask why / use payment processor. Each path shows realistic outcome. Insert between "Why Banks Say No" and credit-building sections. |
| **3-3** | **Comparison card** | "DIY vs. Hire a Lawyer" | Two-column: "Handle yourself" items (LLC filing, EIN, annual report) vs. "Get a lawyer" items (contracts, IP disputes, visa-related employment). Replaces back-to-back bullet lists. |
| **5-2** | **Checklist** | "Vendor Readiness Checklist" | Interactive checklist: W-9 filed, COI obtained, vendor registration complete, bank account active, sample invoice ready, payment terms documented. Replaces text-only description. |
| **6-1** | **Drag-and-drop matching** | "Decode American Business Phrases" | Match 6 phrases ("Let's circle back", "We should do lunch", etc.) to real meanings. Replaces or supplements existing flashcards for more active engagement. |
| **6-2** | **Fill-in-blank template** | "Your 30-Second Elevator Pitch" | Template: "[Company] helps [target customer] in the U.S. market solve [problem] by [solution]. We're based in [location] and [credibility statement]." Interactive fill-in with example. |
| **7-2** | **Accordion** | "Your Networking Map — Where to Show Up" | 3 sections: Events & Conferences / Coworking & Incubators / People & Online Communities. Replaces 334-word text wall. |
| **8-1** | **Scored rubric** | "Your Market Readiness Score" | Replace BOTH the 10-item binary checklist AND 7-dimension scoring exercise with one unified scored rubric. 7 dimensions, 1-5 scale, instant score + interpretation. |

### Additional Scenario Opportunities (Stretch)

These aren't required but would significantly increase engagement if time allows:

| Lesson | Scenario Concept |
|--------|-----------------|
| **1-1** | "You're launching a tech startup with a co-founder. You want investors eventually. Which entity?" → Interactive decision with branching consequences |
| **2-1** | "It's April 15. You haven't filed quarterly taxes. What happens?" → Timeline showing penalties accumulating |
| **4-1** | "Your first contractor just asked for health insurance. The IRS is watching. What do you do?" → Misclassification scenario |
| **5-1** | "Your product pricing in LATAM is $15/month. A U.S. competitor charges $45. How do you position?" → Pricing strategy exercise |
| **6-3** | "Your U.S. prospect said 'This looks interesting, let me think about it.' What does that really mean?" → Cultural decoder scenario |

---

## 9. Implementation Order

### Phase A: Structural Fixes (no content generation needed)
1. **KC Consolidation** — Merge fragmented knowledge-check blocks into single 3-question blocks. Rename all to "What Would You Do?" (22 lessons)
2. **Exercise/Reflection Consolidation** — Remove 9 duplicate blocks per Section 3 plan
3. **Misplaced Content Relocation** — Move 5 items per Section 6 plan
4. **Text/Interactive Redundancy** — Compress text intros, let interactives carry detail (8 lessons)

### Phase B: Content Enhancement (requires content writing)
5. **Text Wall Remediation** — Split/restructure 6 worst text walls per Section 5 plan
6. **New Interactives** — Build 7 new interactive components per Section 8 plan
7. **Additional Scenarios** — Add 5 stretch scenarios if time allows

### Phase C: Visual Enhancement (requires image generation)
8. **HTML/CSS Data Visualizations** — Build 5 in-course charts/graphs
9. **Module Hero Banners** — Generate 9 module hero images
10. **Infographics** — Generate 7 process diagrams via Gemini
11. **Scenario Illustrations** — Generate 7 founder/situation illustrations via Gemini
12. **Geographic Maps** — Generate 2 Central Florida maps via Gemini

### Phase D: Quality Assurance
13. **Full content re-audit** — Run comprehensive review against this plan to catch misses
14. **Resolve CRIT-1 through CRIT-4** — Fill all placeholder content
15. **Cross-lesson consistency check** — Verify no duplicate phrases, consistent terminology, transition sentences present

---

## Appendix: Lesson-by-Lesson Change Summary

Quick reference — every change touching each lesson.

| Lesson | KC Merge | Remove Ex/Ref | Text→Interactive | Text Wall Fix | Add Image | Add Interactive | Relocate Content |
|--------|----------|---------------|------------------|---------------|-----------|-----------------|-----------------|
| 0-1 | Rename only | — | Remove text+table, keep tabs | Split intro with hero image | Hero banner | — | — |
| 1-1 | Rename only | — | Compress 3 entity texts → intro + comparison card | — | Hero banner + entity flowchart | — | — |
| 1-2 | Rename only | — | — | — | SunBiz infographic | — | Consider moving "Why Florida" |
| 1-3 | Rename only | — | — | — | Bank meeting illustration | — | — |
| 2-1 | Merge 2→1 | — | — | Insert image after founder story | Hero banner + tax chart | — | — |
| 2-2 | Merge 3→1 | — | — | — | VAT comparison infographic | — | — |
| 2-3 | Merge 3→1 | — | — | Split opening into 2 sections | Bank rejection illustration | **Branching scenario** | — |
| 3-1 | Merge 3→1 | — | Compress IP text → intro + comparison card | (Solved by redundancy fix) | Hero banner + TM infographic | — | — |
| 3-2 | Merge 3→1 | Remove reflection | — | — | Insurance infographic | — | Move callout→6-2, KC Q1→3-3 |
| 3-3 | Merge 3→1 | — | — | — | — | **Comparison card** (DIY vs lawyer) | Receive KC Q from 3-2 |
| 4-1 | Merge 3→1 | Remove reflection | — | — | Hero banner + IRS illustration | — | Move visa mistake→4-2 |
| 4-2 | Merge 3→1 | — | Compress visa text → intro + accordion | — | Visa infographic | — | Receive mistake from 4-1 |
| 4-3 | Merge 3→1 | Remove reflection | — | — | Employer cost chart | — | — |
| 5-1 | Merge 3→1 | Remove reflection | Compress 5-areas text → intro + tabs | — | Hero banner | — | — |
| 5-2 | Merge 3→1 | — | — | — | Trade show illustration | **Vendor readiness checklist** | — |
| 6-1 | Merge 2→1 | Remove reflection | — | Insert image, move phrase list into flashcards | Hero banner + meeting illustration | **Drag-and-drop matching** | — |
| 6-2 | Merge 2→1 | — | — | — | Networking illustration | **Fill-in-blank pitch template** | Receive "Handshake" callout from 3-2 |
| 6-3 | Merge 3→1 | — | — | — | Cultural missteps infographic | — | Remove duplicate "circle back" flashcard |
| 7-1 | Merge 3→1 | Remove reflection | Compress org text → intro + accordion | — | Hero banner + resource map | — | — |
| 7-2 | Merge 3→1 | — | — | — | Networking map | **Accordion** (networking map) | — |
| 7-3 | Merge 3→1 | — | Compress cluster text → intro + table | — | 2 data viz charts | — | — |
| 7-4 | Merge 3→1 | Remove reflection | Compress city text → intro + tabs | — | City comparison chart | — | — |
| 7-5 | Merge 3→1 | Remove reflection | — | — | — (pending Brian) | — | Fix track name inconsistency |
| 8-1 | Merge 3→1 | — | — | — | Hero banner | **Scored rubric** (replace checklist+scoring) | — |
| 8-2 | Merge 3→1 | — | — | — | — | — | — |
| 8-3 | Merge 3→1 | Remove "Value Reflection" | — | — | UCF meeting illustration | — | Fix Calendly placeholder |

---

## Notes

- **Content meaning must be preserved.** When compressing text blocks, the information moves INTO the interactive — it is not deleted. If a founder story or key insight exists in a text block being compressed, it either stays as part of the intro or moves into the interactive component.
- **Image style must match course aesthetic.** All generated images follow the professional-modern template + road trip metaphor. No stock photo look — consistent illustrated/painted style matching the avatar aesthetic.
- **Post-implementation audit required.** After all changes are applied, run a fresh audit to catch anything missed and verify no content was accidentally lost.
