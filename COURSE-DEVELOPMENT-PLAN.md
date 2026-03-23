# UCF BIP — Course Development Plan
## U.S. Market Readiness Program — Content Production Guide

**Purpose:** Step-by-step guide for building the course content using CourseFuture's pipeline.
**Content Strategy:** `generate-from-scratch` (curated from public sources + Brian's expertise)
**Language:** English (primary) + Spanish (full translation)
**Template:** `professional-modern`
**Export Format:** DLCS package (with SCORM 2004 fallback)

---

## 1. Course Structure

### Overview

```
Welcome Section          "What It Actually Takes"
  ├── Program overview, disclaimers, how-it-works
  ├── 4 core themes introduction
  └── Set expectations (timeline, cost ranges, what this covers vs. doesn't)

Module 1                 "Getting Your Foot in the Door"  (Legal Setup)
  ├── Lesson 1-1: Choosing your entity (LLC, C-Corp, S-Corp)
  ├── Lesson 1-2: Registering with SunBiz + EIN + registered address
  └── Lesson 1-3: Opening a U.S. bank account (brief intro, details in M2)

Module 2                 "Watch Your Money"  (Taxes & Financial)
  ├── Lesson 2-1: Federal vs. state taxes
  ├── Lesson 2-2: Sales tax, accounting expectations, U.S. bookkeeping
  └── Lesson 2-3: Banking deep dive — physical presence, docs, rejections, credit history

Module 3                 "Protecting What You're Building"  (Risk & IP)
  ├── Lesson 3-1: U.S. intellectual property (copyright, trademark, patent)
  ├── Lesson 3-2: Contracts, insurance, regulatory exposure
  └── Lesson 3-3: When to bring in a lawyer — and what it costs

Module 4                 "Building Your Team"  (Hiring & Immigration)
  ├── Lesson 4-1: First U.S. hire — contractor vs. employee
  ├── Lesson 4-2: Visa pathways (O-1, E-2, L-1) and what's realistic
  └── Lesson 4-3: Payroll, employer obligations, compliance

Module 5                 "Reaching U.S. Customers"  (Go to Market)
  ├── Lesson 5-1: Why products rarely transfer directly
  ├── Lesson 5-2: U.S. customer acquisition, pricing, sales cycles
  └── Lesson 5-3: Central Florida market strategy, industry clusters

Module 6                 "How Business Actually Works Here"  (Culture)
  ├── Lesson 6-1: Speed, directness, trust signals
  ├── Lesson 6-2: Meeting etiquette, negotiation, follow-through
  └── Lesson 6-3: Common cultural missteps — real founder stories

Module 7                 "You're Not Alone"  (Central Florida Ecosystem)
  ├── Lesson 7-1: Key organizations (SBDC, SBA, chambers, OEP)
  ├── Lesson 7-2: Why Central Florida — clusters, LATAM trade, cost
  └── Lesson 7-3: UCF BIP programs + community resources (Hispanic Chamber, Prospera, CFITO)

Wrap-Up                  "Is the U.S. Right for You?"
  ├── Self-assessment reflection
  ├── Value perception feedback
  └── 3 exit options: resources download, Phase 2 info, 1:1 booking
```

**Total:** 9 sections (Welcome + 7 modules + Wrap-up), ~23 lessons
**Estimated learner time:** 2-3 hours

---

## 2. Core Themes — Callout System

Four themes are introduced in the Welcome section and reinforced throughout every module via visual callouts. When any content maps to a theme, it gets a tagged callout block.

| Theme | Callout Variant | Icon Concept | Color |
|-------|----------------|--------------|-------|
| Reduce Risk | `theme-reduce-risk` | Shield | Blue |
| Watch Your Money | `theme-watch-money` | Dollar/eye | Green |
| Avoid Common Mistakes | `theme-avoid-mistakes` | Warning triangle | Amber |
| Understand the Culture | `theme-understand-culture` | Globe/handshake | Purple |

**In `experience-design.json`**, these are defined as custom callout types. In Phase 1 content JSON, they appear as:

```json
{
  "type": "callout",
  "variant": "theme-reduce-risk",
  "label": "Reduce Risk",
  "content": "Registering as an LLC protects your personal assets from business liabilities..."
}
```

**Usage targets:** Each module should have 2-4 theme callouts, distributed across all four themes. Not every theme appears in every module — only where genuinely relevant.

---

## 3. Content Patterns — What Goes in Every Module

Each module follows a consistent content pattern:

### Standard Module Structure

```
Module Intro
  → Brief overview (what you'll learn, why it matters)
  → Theme callout preview (which themes this module connects to)

Lessons (2-3 per module)
  → Each lesson contains:
    • Core content (text with headers, lists, examples)
    • "Common Mistake" callout boxes (what founders get wrong)
    • "Reality Check" callout boxes (expectations vs. reality)
    • "Before You Spend Money" checklists (practical action items)
    • "Typical Timeline" charts (how long things actually take)
    • "Estimated Cost Range" tables (realistic numbers)
    • Theme callouts (when content maps to a core theme)
    • Interactive element (comparison card, timeline, accordion, or checklist)
    • Real-world example or founder story

Module Self-Check
  → Checklist: "Before moving on, can you answer these?"
  → Not graded — honor system
  → Framed as "readiness check" not "quiz"

Module Feedback
  → Thumbs up/down: "Was this module helpful?"
  → Optional text: "Was there anything you expected that wasn't covered?"
  → Static response: "Thank you — your feedback helps us improve this program"
```

### Content Tone Guidelines

| Do | Don't |
|----|-------|
| "Here's what it actually takes" | "In this module you will learn about..." |
| "Most founders don't realize..." | "It is important to understand that..." |
| Specific cost ranges and timelines | Vague generalities |
| "Before you spend money on this, check..." | "You should consider consulting a professional" |
| Real mistakes international founders have made | Hypothetical scenarios |
| Direct, practical, actionable | Academic, theoretical, textbook |

**Voice:** Knowledgeable friend who's been through this — not a professor. Think "I wish someone had told me this" framing throughout.

---

## 4. Content Sources

Brian provided these as primary references. All are public sources — no proprietary content to ingest.

| Source | Content Area |
|--------|-------------|
| SBA (sba.gov) | Business entity types, registration, federal requirements |
| Sunbiz (sunbiz.org) | Florida business registration, entity search |
| SelectFlorida | Why Florida, industry clusters, economic data |
| SBDC Orlando | Small business resources, counseling, training |
| CFITO (Central Florida International Trade Office) | LATAM trade connections, international business resources |
| Orange County FL economic development | Local ecosystem, incentives |
| IRS (irs.gov) | EIN, federal tax obligations, foreign-owned entities |
| Florida Department of Revenue | State tax, sales tax |
| USCIS (uscis.gov) | Visa pathways (O-1, E-2, L-1) |
| Hispanic Chamber, Prospera | Community resources for Latin American founders |
| UCF BIP (ucfbip.org) | Program details (Traction, Growth, Soft Landing) |

**Content strategy:** Curate, organize, and frame existing public information through the lens of an international founder entering the U.S. market. Add practical guidance, real-world context, cost ranges, and mistake avoidance that isn't available in the raw sources.

---

## 5. Regional Supplements — Latin America / Spanish

**Scope for pilot:** Latin America / Spanish-speaking founders only.

**How it works:**
- Supplementary content sections appear throughout the course (not just in Module 7)
- Visible to ALL learners regardless of language selection
- Contains links and resources specifically relevant to Latin American founders:
  - Hispanic Chamber of Commerce (Central Florida)
  - Prospera (Hispanic entrepreneur support)
  - CFITO trade delegations and programs
  - Spanish-language business resources in Central Florida
  - LATAM-specific tax treaty information
  - Cultural bridge content (Latin American → U.S. business norms)

**In content JSON:** These appear as `supplementary` content blocks with a `region: "latam"` tag. The platform renders them with a distinct visual treatment (e.g., a sidebar or highlighted section).

---

## 6. Interactive Elements

### Per Module

Each module should include at least 2 interactive elements. No module should use the same interactive type twice in a row.

| Interactive Type | Best Used For | Example |
|-----------------|---------------|---------|
| Comparison Card | Side-by-side options | LLC vs. C-Corp vs. S-Corp |
| Timeline | Sequential processes | Steps to register with SunBiz |
| Accordion | Expandable detail sections | Visa type details (O-1, E-2, L-1) |
| Checklist | Action items / self-assessment | "Before You Open a Bank Account" |
| Tabs | Category-based content | Federal vs. State vs. Local taxes |
| Flashcards | Key terms / concepts | U.S. business terminology |
| Scenario | Real-world decision points | "A client asks for net-30 terms — what do you do?" |

### Self-Check Checklists (Per Module)

These replace traditional quizzes. Each module ends with a self-check:

```
Before moving on, can you:
☐ Name the 3 main entity types and explain which fits your business
☐ Describe the SunBiz registration process
☐ List the documents needed to open a U.S. bank account
☐ Explain why you need a registered agent
```

These are tracked as interactive completions (checkbox state saved to SCORM suspend_data) but are NOT graded or gated. Learners can proceed regardless.

---

## 7. Media Plan

### Video (Scene-Based HTML Player)

Each module gets one "Key Takeaways" video (~2-3 minutes) summarizing the module's most important points.

| Spec | Value |
|------|-------|
| Format | Scene-based HTML player (images + audio + animated text) |
| Scenes per video | 4-6 |
| Audio | Qwen3-TTS narration (professional American English voice) |
| Images | AI-generated professional scenes (Gemini Flash or ComfyUI Z-Image) |
| Templates | intro, split-left, split-right, stats, final |
| Bullet timing | Synced to narration via `calc-bullet-timings.ts` |

**Spanish videos:** Same scene structure, Spanish narration via Qwen3-TTS with Spanish voice profile.

### Avatar Video (Welcome Section Only)

One avatar video for the Welcome section — a "host" welcoming learners.

| Spec | Value |
|------|-------|
| Technology | InfinityTalk (ComfyUI + Wan 2.1) |
| Avatar | AI-generated professional portrait (business attire, diverse) |
| Duration | 60-90 seconds |
| Content | Welcome message, program overview, what to expect |

### Podcast / Audio (Per Module)

Each module gets an audio alternative — same core content as text, delivered as a listenable narration.

| Spec | Value |
|------|-------|
| Format | Module narration (single voice, not dialogue podcast) |
| TTS | Qwen3-TTS with consistent voice across all modules |
| Duration | 8-12 minutes per module |
| Player | Embedded audio player in module header |

**Note:** Brian mentioned wanting "podcast style" but for a $99 product with 7 modules, single-voice narration is more practical than multi-character dialogue. Multi-character podcasts can be a Phase 2 enhancement.

### Images

| Spec | Value |
|------|-------|
| Per module | 3-5 AI-generated images |
| Total | ~30-40 images |
| Provider | Gemini Flash (fast, good quality) or ComfyUI Z-Image |
| Style | Professional, modern, diverse — business settings, office environments, Central Florida imagery |
| Diversity | Enforce demographic rotation (Latin American, Asian, European, American founders represented) |
| Rule | NO text in generated images — all text rendered via HTML |

---

## 8. CourseFuture Pipeline — Step by Step

### Pre-Pipeline Setup

```bash
# Working directory
cd clients/UCF/BusinessCourse

# Create required folder structure
mkdir -p phase1-lessons media/images/scenes media/audio/scenes video-scripts
mkdir -p podcast-scripts output/lessons export validation-reports .gates
```

### Phase 0: Strategy & Blueprint

**Step 1:** Create `strategy.json`

```json
{
  "client": "UCF",
  "course": "BusinessCourse",
  "title": "U.S. Market Readiness Program",
  "subtitle": "International Founder Pathway — Phase 1",
  "description": "A self-paced program preparing international entrepreneurs to launch and operate a business in the United States, with a focus on the Central Florida ecosystem.",
  "language": "en",
  "sourceType": "text-documents",
  "contentStrategy": "generate-from-scratch",
  "targetAudience": "International founders and CEOs expanding to the U.S. market, primarily from Latin America, Europe, and Asia. Vetted by UCF BIP.",
  "estimatedDuration": "2-3 hours",
  "pricePoint": "$99",
  "assessmentType": "self-check-checklists",
  "template": "professional-modern",
  "imageGenerationProvider": "gemini-flash",
  "exportFormat": "dlcs",
  "modules": 7,
  "lessonsPerModule": 3,
  "includeWelcome": true,
  "includeWrapUp": true,
  "videoType": "scene-based",
  "avatarVideo": "welcome-only",
  "podcastType": "single-voice-narration",
  "ttsProvider": "qwen3",
  "themes": [
    { "id": "reduce-risk", "label": "Reduce Risk", "color": "#2563eb" },
    { "id": "watch-money", "label": "Watch Your Money", "color": "#16a34a" },
    { "id": "avoid-mistakes", "label": "Avoid Common Mistakes", "color": "#d97706" },
    { "id": "understand-culture", "label": "Understand the Culture", "color": "#7c3aed" }
  ]
}
```

**Step 2:** Create `personas.json` (from pre-production-brief-brian.md — 3 personas already defined)

**Step 3:** Run Phase 0
```bash
npm run cf:phase0 clients/UCF/BusinessCourse
```

This generates:
- `blueprint-v1-content-pure.json` — content structure based on Course-Outline-v1.md
- Will need manual review to ensure module breakdown matches Section 1 of this plan

### Phase 0.5: Experience Design

**Step 4:** Create `experience-design.json`

Key design decisions:
- **Visual identity:** Professional, modern, trustworthy. UCF navy + gold accent. Clean white backgrounds.
- **Tone:** Knowledgeable friend, not professor. Direct, practical, actionable.
- **Callout system:** 4 theme callouts (defined in Section 2 above) + "Common Mistake" + "Reality Check" + "Before You Spend Money"
- **Interactive patterns:** Comparison cards, timelines, checklists, accordions, tabs
- **Assessment approach:** Self-check checklists (ungraded)
- **Typography:** Clean sans-serif, high readability, adequate spacing
- **Color palette:** Navy (#1e3a5f) primary, gold (#f5a623) accent, white background, gray text

**Step 5:** Generate `blueprint-v2-design-infused.json`
```bash
# Phase 0.5 generates the design-infused blueprint
npm run cf:phase0 clients/UCF/BusinessCourse  # (continued)
```

**Step 6:** Run gates
```bash
npm run cf:gate:0.5b clients/UCF/BusinessCourse  # Experience design
npm run cf:gate:0.5c clients/UCF/BusinessCourse  # Blueprint fidelity
```

### Phase 1: Content Generation (English)

**Step 7:** Generate content
```bash
npm run cf:phase1 clients/UCF/BusinessCourse
```

This generates `phase1-lessons/*.json` files — one per lesson, containing structured `contentBlocks[]` with all text content, callouts, examples, checklists, and interactive placeholders.

**Step 8:** Run Phase 1 gates (all must pass before Phase 2)
```bash
npm run cf:gate:1 clients/UCF/BusinessCourse      # Content fidelity
npm run cf:gate:1.6 clients/UCF/BusinessCourse     # Content engagement (hooks, examples, bridges)
npm run cf:gate:1.7 clients/UCF/BusinessCourse     # Content quality + tone consistency
npm run cf:gate:1.7b clients/UCF/BusinessCourse    # Writing humanization (AI pattern detection)
npm run cf:gate:1.7c clients/UCF/BusinessCourse    # Content structure (type-aware engagement)
npm run cf:gate:1.8 clients/UCF/BusinessCourse     # Image prompt validation (Phase 3 prereq)
npm run cf:gate:1.8c clients/UCF/BusinessCourse    # Readability (Flesch-Kincaid, cognitive load)
npm run cf:gate:1.9 clients/UCF/BusinessCourse     # Content depth (Bloom's verb progression)
npm run cf:gate:1.10 clients/UCF/BusinessCourse    # Learning outcome alignment
npm run cf:gate:1.11 clients/UCF/BusinessCourse    # Pedagogical sequencing
npm run cf:gate:1.12 clients/UCF/BusinessCourse    # Cognitive load
```

**Step 9:** Content review — verify:
- Each module has 2-3 lessons
- Theme callouts are present and relevant (2-4 per module)
- "Common Mistake" and "Reality Check" callouts throughout
- Checklists and cost ranges included
- Self-check questions at end of each module
- Practical tone (not academic)
- Real-world examples and founder stories

### Phase 1: Content Generation (Spanish)

**Step 10:** Create Spanish strategy variant
- Copy `strategy.json` to `strategy-es.json`
- Set `"language": "es"` (or `"es-419"` for Latin American Spanish)
- Run Phase 1 with Spanish strategy targeting a separate output directory

**Alternative approach:** Generate English first, then use CourseFuture's translation pipeline to produce Spanish content from the validated English content. This ensures consistency.

```bash
# Run Spanish content generation (approach TBD based on pipeline capabilities)
# May need a custom translation phase or parallel Phase 1 run
```

**Step 11:** Run Spanish QA gates (uses Spanish-aware validators from UNAC Diplomado work)

### Phase 2: Enhancement Planning

**Step 12:** Generate media plan
```bash
npm run cf:phase2 clients/UCF/BusinessCourse
```

This generates:
- `phase2-media-plan.json` — image prompts, video scripts, interactive specs
- Image prompts for each lesson (3-5 per module)
- Video scripts for "Key Takeaways" videos (one per module)
- Interactive component specifications

**Step 13:** Run Phase 2 gates
```bash
npm run cf:gate:2 clients/UCF/BusinessCourse       # Prompts validated
npm run cf:gate:2.1 clients/UCF/BusinessCourse     # Interactive specs validated
npm run cf:gate:2.3 clients/UCF/BusinessCourse     # Video content quality
npm run cf:gate:2.6 clients/UCF/BusinessCourse     # Assessment quality
```

### Phase 3: Media Production

**Step 14:** Generate images
```bash
npx tsx scripts/course-factory/generate-media.ts UCF BusinessCourse
```

**Step 15:** Generate video narration audio
```bash
# English narration for scene-based videos
npx tsx scripts/course-factory/generate-media.ts UCF BusinessCourse --audio

# Calculate bullet timings from actual audio
npx tsx scripts/calc-bullet-timings.ts UCF BusinessCourse lesson-1-1 --apply
# (repeat for each lesson with video)
```

**Step 16:** Generate module narration audio (podcast/audio alternative)
```bash
# Per-module narration for audio modality
npx tsx scripts/course-factory/generate-podcast-audio.ts <narration-script.json>
```

**Step 17:** Generate Welcome avatar video
```bash
# InfinityTalk: portrait image + welcome narration → talking head MP4
# Uses ComfyUI workflow: infinityTalk - Single -Wan 2.1.json
```

**Step 18:** Run Phase 3 gates
```bash
npm run cf:gate:3 clients/UCF/BusinessCourse       # Media quality
```

### Phase 4: Course Assembly

**Step 19:** Generate HTML and assemble
```bash
npm run cf:phase4 clients/UCF/BusinessCourse
```

**Step 20:** Run Phase 4 gates
```bash
npm run cf:gate:4.1 clients/UCF/BusinessCourse     # HTML accessibility (WCAG 2.1 AA)
npm run cf:gate:4.5 clients/UCF/BusinessCourse     # Assembly validation
npm run cf:gate:4.7 clients/UCF/BusinessCourse     # Interaction + video tracking
```

### Phase 5: QA & Export

**Step 21:** Final QA
```bash
npm run cf:gate:5 clients/UCF/BusinessCourse       # Final QA (staleness, lesson count)
```

**Step 22:** Export DLCS package (English)
```bash
npm run cf:export:scorm-v2 clients/UCF/BusinessCourse  # SCORM fallback
# DLCS export is generated as part of Phase 5
```

**Step 23:** Repeat Steps 19-22 for Spanish content

**Step 24:** Upload to platform
```bash
# Upload English DLCS to R2 (en/ prefix)
npm run cf:r2:upload BusinessCourse-en

# Upload Spanish DLCS to R2 (es/ prefix)
npm run cf:r2:upload BusinessCourse-es
```

---

## 9. Content Development Checklist

Use this checklist to track progress through each module:

### Per Module Checklist

- [ ] Core content written (2-3 lessons)
- [ ] Theme callouts tagged (2-4 per module, at least 2 different themes)
- [ ] "Common Mistake" callouts (at least 1 per lesson)
- [ ] "Reality Check" callouts (at least 1 per module)
- [ ] "Before You Spend Money" checklist (at least 1 per module)
- [ ] Cost range table or timeline chart (at least 1 per module)
- [ ] Interactive element (at least 2 per module, varied types)
- [ ] Self-check checklist at end of module (4-6 items)
- [ ] Real-world example or founder story (at least 1 per module)
- [ ] Regional supplement callout where relevant (Latin America resources)
- [ ] Image prompts defined (3-5 per module)
- [ ] Video script for "Key Takeaways" (4-6 scenes)
- [ ] Audio narration script for module
- [ ] Spanish translation complete
- [ ] QA gates passing

### Global Checklist

- [ ] Welcome section complete (overview, 4 themes, disclaimers, how-it-works)
- [ ] Wrap-up complete (self-assessment, value feedback, 3 exit pathways)
- [ ] Avatar video for Welcome section generated
- [ ] All 4 themes represented across the full course (not concentrated in one module)
- [ ] Diversity rotation enforced across all images
- [ ] Bullet timings calculated from actual audio
- [ ] English DLCS package exported and verified
- [ ] Spanish DLCS package exported and verified
- [ ] SCORM fallback tested in Canvas
- [ ] All Phase 5 QA gates passing

---

## 10. Module-by-Module Content Notes

### Welcome — "What It Actually Takes"
- **Purpose:** Ease learners in, set expectations, introduce 4 themes
- **Key content:** Timeline overview (3-6 months to be operational), cost ranges ($2K-$10K initial setup), what this program covers vs. doesn't
- **Disclaimers:** General guidance, not legal/tax/immigration advice. Consult professionals.
- **Avatar video:** Professional host welcomes learner, explains how the program works
- **Tone:** Warm, encouraging, honest about challenges ahead

### Module 1 — "Getting Your Foot in the Door"
- **Focus:** SunBiz registration only. Keep it narrow.
- **Highlight:** UCF flexible office space as registered address option
- **Banking:** Brief mention only ("we'll cover banking in depth in Module 2")
- **Key interactive:** Timeline — steps to register with SunBiz
- **Theme callouts:** Reduce Risk (entity choice), Avoid Mistakes (common registration errors)

### Module 2 — "Watch Your Money"
- **Focus:** Taxes + banking deep dive
- **Banking details:** Physical presence requirements, required documents, why accounts get rejected, payment processors (Stripe/Square) + foreign founder limitations, U.S. credit history, realistic timelines
- **Key interactive:** Comparison tabs — Federal vs. State vs. Sales tax
- **Funding mention:** "Getting money is not easy" — tease Phase 2 investor readiness
- **Theme callouts:** Watch Money (throughout), Avoid Mistakes (tax surprises)

### Module 3 — "Protecting What You're Building"
- **Focus:** IP + contracts + insurance + liability
- **Key interactive:** Comparison card — Copyright vs. Trademark vs. Patent
- **Cost ranges:** Attorney consultation ($200-$500/hr), trademark filing ($250-$350), patent ($5K-$15K+)
- **Theme callouts:** Reduce Risk (IP protection), Avoid Mistakes (NDA gaps, verbal agreements)

### Module 4 — "Building Your Team"
- **Focus:** Hiring + immigration (visa pathways)
- **Critical distinction:** Contractor vs. employee (the #1 mistake)
- **Key interactive:** Accordion — Visa type details (O-1, E-2, L-1, H-1B)
- **Honest framing:** What's realistic vs. what immigration lawyers will tell you
- **Theme callouts:** Reduce Risk (misclassification penalties), Understand Culture (employer expectations)

### Module 5 — "Reaching U.S. Customers"
- **Focus:** Market entry strategy, product adaptation
- **Central Florida angle:** Industry clusters, LATAM trade connectivity, cost-of-living comparison
- **Key interactive:** Scenario — "Your product was successful in [home country]. Here's why it needs to change for U.S. buyers."
- **Theme callouts:** Avoid Mistakes (direct market transfer), Understand Culture (U.S. buyer expectations)

### Module 6 — "How Business Actually Works Here"
- **Focus:** Cultural norms, communication, trust signals
- **Founder stories:** Real examples of cultural missteps and what they learned
- **Key interactive:** Flashcards — U.S. business terminology and what they really mean
- **Funding mention #2:** Investment culture, fundraising expectations, relationship vs. transaction
- **Theme callouts:** Understand Culture (throughout), Avoid Mistakes (cultural missteps)

### Module 7 — "You're Not Alone"
- **Focus:** Central Florida ecosystem, resources, UCF BIP
- **"Why Central Florida" section:** Industry clusters, talent pipeline, LATAM trade, cost comparison vs. Miami/NYC/CA
- **Latin America supplement:** Hispanic Chamber, Prospera, CFITO — prominent placement
- **Key interactive:** Resource directory (accordion with org details, links, what they offer)
- **UCF BIP:** Traction, Growth, Soft Landing — what each is, who it's for
- **Theme callouts:** Reduce Risk (use available resources), Watch Money (free resources you're missing)

### Wrap-Up — "Is the U.S. Right for You?"
- **Self-assessment:** Reflection prompts, not scored quiz
- **Value perception:** "Was this program worth your time?" (feeds into admin dashboard)
- **Exit pathways:**
  1. Download checklists and reference guides (all modules)
  2. Learn more about UCF BIP Phase 2
  3. Schedule 1:1 with Brian (Calendly embed)
- **Phase 2 tease:** Brief preview of ecosystem introduction program
- **End-of-course survey:** Value perception + improvement feedback

---

## 11. Quality Standards

### Content Quality
- Flesch-Kincaid grade level: 8-10 (accessible to non-native English speakers)
- No AI-sounding language (detect and remove via Gate 1.7b)
- Every claim backed by source reference (SBA, IRS, etc.)
- Cost ranges must be current (2025-2026 data)
- All legal/tax information must include "consult a professional" disclaimer

### Accessibility (WCAG 2.1 AA)
- All images have descriptive alt text
- Color contrast ratio ≥ 4.5:1 for text
- Keyboard navigable throughout
- Screen reader compatible
- No information conveyed by color alone

### Diversity
- Image diversity rotation enforced
- Founder stories represent multiple regions (Latin America, Europe, Asia)
- Examples use diverse business types and industries
- No cultural stereotypes

### Spanish Translation
- Latin American Spanish (not Castilian)
- Professional translation quality (not machine translation)
- Run through CourseFuture Spanish QA gates (built for UNAC Diplomado)
- Legal/financial terminology verified for accuracy
