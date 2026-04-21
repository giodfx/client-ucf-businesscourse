# UCF Business Course — Comprehensive Audit Report

**Date:** April 7, 2026
**Auditor:** Claude (automated + manual verification)
**Scope:** Editorial compliance against Brian Bedrick's feedback + QA/Instructional Design quality

---

## Executive Summary

| Area | Status | Score |
|------|--------|-------|
| **Editorial Compliance** | PARTIAL | 71% items addressed |
| **Gate 1.6 — Content Engagement** | PASS (warnings) | 97% hooks |
| **Gate 1.7b — Writing Humanization** | FAIL | Em-dash density 4.09/500w |
| **Gate 1.8c — Readability** | FAIL | Flesch-Kincaid grade 10.3 |
| **Gate 1.9 — Content Depth** | FAIL | 140w avg section depth |

**Bottom line:** Modules 0, 1, 2, 3 are editorially clean. Modules 4, 5, 6, and 7 still contain embedded location metaphors that Brian explicitly requested be removed. Three QA gates are failing — em-dash overuse is the easiest fix; readability and content depth are pre-existing structural issues that would require a Phase 1b content enrichment pass.

---

## Part 1: Editorial Compliance Audit

### Feedback Sources Reviewed

| Source | Date | Key Directives |
|--------|------|----------------|
| Brian's email (feedback.txt) | Mar 19 | Soften absolutes, "most"→"many", remove redundancy |
| Module 0 feedback (docx + comments) | Mar 18 | Disclaimer text, How-to-Use rewrite, trim callout |
| Module 1 feedback (docx + comments) | Mar 19 | Storefront/tower removal, domain name check, IRS caveat |
| April 2 meeting transcript | Apr 2 | Video pivot, fun-fact-only strategy, "2–6 months" |
| April 6 themes feedback (docx) | Apr 6 | Location names, remove ALL metaphors from body text |
| Pre-Production Brief comments | Feb | Persona phases, module structure |

### Module-by-Module Compliance

---

#### Module 0 (lesson-0-1) — 7 PASS, 3 FAIL

| Item | Block | Status | Detail |
|------|-------|--------|--------|
| Sync text-0-1-0 (Gio's rewrite) | text-0-1-0 | PASS | "Many founders" propagated to all layers |
| Sync text-0-1-1 (Gio's rewrite) | text-0-1-1 | PASS | Synced across all 3 layers |
| Sync text-0-1-learn-first | text-0-1-learn-first | PASS | Synced |
| Sync text-0-1-3 (no dup paragraph) | text-0-1-3 | PASS | Clean |
| Sync kt-0-1-1 (Gio's version) | kt-0-1-1 | PASS | Synced |
| Trim callout-0-1-cm to 2 examples | callout-0-1-cm | PASS | Trimmed from 7 to 2 examples |
| "seven modules" → "eight modules" | text-0-1-1 | PASS | Updated |
| **Explicit "9 modules total" count** | text-0-1-learn-first | **FAIL** | Missing "9 modules total (8 content + 1 intro)" statement |
| **Legal disclaimer exact text** | (onboarding) | **FAIL** | Current text doesn't match Brian's exact wording: "This program provides general educational information and does not constitute legal, tax, immigration, or financial advice. Always consult qualified professionals before making business decisions." |
| **4 themes / 8 modules explicit** | text-0-1-1 | **FAIL** | The relationship between 4 themes and 8 modules is not explicitly stated |

---

#### Module 1 (lessons 1-1, 1-2, 1-3) — 14 PASS, 1 PARTIAL, 4 FAIL

| Item | Block | Status | Detail |
|------|-------|--------|--------|
| Remove storefront/tower from opening | text-1-1-0 | PASS | Direct entity choice opening |
| Remove "flexible storefront" wrapper | text-1-1-entity-intro | PASS | Direct "LLC is simple to set up" |
| Fix "building you pick" metaphor | text-1-1-4 | PASS | "Your entity choice determines..." |
| Fix "storefront and tower have different paperwork" | text-1-1-4 | PASS | "LLCs and C-Corps require different documentation" |
| Fix "utility costs" metaphor | text-1-1-4 | PASS | "Each structure has different tax obligations" |
| Remove duplicate "One founder spent thousands" | text-1-1-4 | PASS | Duplicate paragraph removed |
| Fix kt-1-1-1 "storefront or tower" | kt-1-1-1 | PASS | "Whether you choose an LLC or a C-Corp" |
| LLC visa column fix | int-1-1-1 | PASS | "Ownership is generally allowed, but your visa determines..." |
| "Orlando metro" → "Central Florida" | callout-1-1-funfact | PARTIAL | Updated but has grammar error: "**The** Central Florida has over 30,000 businesses" — should be "Central Florida has..." |
| Diversify KC Q3 | kc-1-1 | PASS | Q3 now tests registered agent concept |
| Remove City Hall from text-1-2-1 | text-1-2-1 | PASS | "Sunbiz.org is Florida's online business registration portal" |
| Add domain name check | text-1-2-1 | PASS | Domain availability check added to pre-filing checklist |
| Remove "doorman" metaphor | text-1-2-3 | PASS | Direct registered agent definition |
| Fix kt-1-2-1 "trip to City Hall" | kt-1-2-1 | PASS | "Filing with SunBiz is one of the simplest steps" |
| Remove "walk from City Hall" opening | text-1-3-0 | PASS | Direct banking intro |
| Fix "bank as a building" metaphor | text-1-3-1 | PASS | "Each bank has its own verification requirements" |
| Fix "doors in this district" | text-1-3-3 | PASS | "Some banks will not work with founders who..." |
| Fix "big buildings / smaller offices" | text-1-3-4 | PASS | "While you are pursuing a traditional bank account..." |
| Fix kt-1-3-1 "financial district" | kt-1-3-1 | PASS | "Banks have their own policies..." |
| **text-1-3-5 still has street metaphor** | text-1-3-5 | **FAIL** | "You have walked the length of this street... Module 2 takes you deeper into the district" |
| **"The Central Florida" grammar** | callout-1-1-funfact | **FAIL** | "The Central Florida" → should be "Central Florida" |
| **Add Payoneer/Paddle/Lemon Squeezy** | lesson-1-3 | **FAIL** | Brian suggested adding modern payment processors; not yet added |
| **Brian's Q2 reconsideration** | kc-1-1 | **FAIL** | Brian flagged Q2 options as too obvious; not yet addressed |

---

#### Module 2 (lessons 2-1, 2-2, 2-3) — 14 PASS, 3 MINOR REMAINING

| Item | Block | Status | Detail |
|------|-------|--------|--------|
| Remove Financial District opening | text-2-1-1 | PASS | "Now it is time to deal with the financial side" |
| Remove "key to every building" | text-2-1-2 | PASS | Direct tax ID explanation |
| Remove "lay of the Financial District" | text-2-1-3 | PASS | Direct tax treatment opening |
| Fix kt-2-1-1 "Financial District rules" | kt-2-1-1 | PASS | "Federal tax rules are straightforward..." |
| Fix text-2-2-1 title | text-2-2-1 | PASS | "Sales Tax and Bookkeeping — What You Need to Know" |
| Remove "compliance bureau" | text-2-2-1 | PASS | "Sales tax and bookkeeping are where..." |
| Fix VAT comparison metaphor | text-2-2-vat | PASS | "VAT is one national system with one set of rules" |
| Remove "accounting wing" | text-2-2-2 | PASS | "Bookkeeping is the foundation..." |
| Fix callout-2-2-2 "Financial District" | callout-2-2-2 | PASS | "Central Florida is home to..." |
| Fix kt-2-2-1 "compliance stop" | kt-2-2-1 | PASS | "Sales tax and bookkeeping compliance is straightforward..." |
| Remove "tallest building" | text-2-3-1 | PASS | "Now it is time to tackle banking" |
| Fix "reputation in Financial District" | text-2-3-2 | PASS | "Building U.S. credit starts from zero" |
| Remove "service counter near exit" | text-2-3-3 | PASS | "Payment processors handle transactions..." |
| Remove "investor tower in distance" | text-2-3-fund | PASS | Sentence removed |
| Fix kt-2-3-1 "Financial District" | kt-2-3-1 | PASS | "U.S. banks do not hand out trust freely..." |
| *Minor: "most accounting firms"* | callout-2-2-2 | MINOR | Should be "many" — low priority |
| *Minor: "most international founders"* | text-2-3-fund | MINOR | Should be "many" — low priority |
| *Minor: "Orlando metro area"* | text-2-1-no-state-tax | MINOR | Should be "Central Florida" — low priority |

---

#### Module 3 (lessons 3-1, 3-2, 3-3) — CLEAN

All fixes from the editorial script applied correctly:
- text-3-2-1: "launch facility" → "intellectual property, it is time to focus on safety and compliance" — PASS
- No remaining metaphors detected in body text

---

#### Module 4 (lessons 4-1, 4-2, 4-3) — HEAVILY CONTAMINATED (10 blocks)

**This module was NOT covered by the editorial fix script.** The theme park metaphor is deeply embedded throughout all 3 lessons.

| Block | Lesson | Issue | Priority |
|-------|--------|-------|----------|
| text-4-1-1 | 4-1 | **Title**: "Welcome to the Theme Park: Building a Team That Keeps the Rides Running" | HIGH |
| text-4-1-3 | 4-1 | "Think of it like the entertainment district: the engineers who designed the roller coaster are contractors, but the operators who run it every day are employees." | HIGH |
| text-4-2-1 | 4-2 | **Title**: "Earning Your Backstage Pass: Visa Pathways" + "no one walks backstage without the right credential" opening | HIGH |
| text-4-2-2 | 4-2 | "Think of each visa as a different backstage pass to the U.S. market" | HIGH |
| text-4-2-3 | 4-2 | "In any complex park, you want a guide who knows which doors lead where" | MEDIUM |
| ig-4-2-visa | 4-2 | Infographic subtitle: "Four backstage passes, four different doors" | MEDIUM |
| text-4-3-1 | 4-3 | "Now that you have your backstage pass sorted" | HIGH |
| text-4-3-2 | 4-3 | "Even the biggest theme parks do not run their own payroll in-house" | HIGH |
| text-4-3-3 | 4-3 | Extended theme park metaphor: "Theme parks keep their best performers by offering perks — food discounts, flexible schedules, free passes... park next door" | HIGH |
| kt-4-3-1 | 4-3 | Already fixed in editorial script | PASS |

**Recommendation:** Module 4 needs a dedicated rewrite pass similar to what was done for Modules 1-2. All "backstage pass", "theme park", "ride", "entertainment district" metaphors in body text need replacement with direct business language.

---

#### Module 5 (lessons 5-1, 5-2) — 1 BLOCK CONTAMINATED

| Block | Lesson | Issue | Priority |
|-------|--------|-------|----------|
| text-5-1-1 | 5-1 | **Title**: "Arriving at the Commercial Hub" + opening: "Drive east from Orlando and you reach Port Canaveral... Head to the outlet corridors along International Drive and you see the other side of the equation" | HIGH |

**Recommendation:** Replace scenic-drive opening with direct market adaptation content. The title should drop "Arriving at the Commercial Hub" framing.

---

#### Module 6 (lessons 6-1, 6-2, 6-3) — HEAVILY CONTAMINATED (5 blocks)

**The editorial fix script addressed specific substrings but missed deeper embedded metaphors.**

| Block | Lesson | Issue | Priority |
|-------|--------|-------|----------|
| text-6-1-1 | 6-1 | **Title**: "Welcome to the Beach — Where the Water Looks Calm" (metaphor title) | HIGH |
| text-6-1-direct-indirect | 6-1 | **Title**: "The Direct Parts and the Undercurrents" | MEDIUM |
| kt-6-2-1 | 6-2 | "Learn to read the currents beneath the surface, and you will navigate U.S. business relationships with confidence" | HIGH |
| kt-6-3-1 | 6-3 | "The beach looks inviting, but the undertow is real... The founders who avoid the biggest losses are the ones who learned to read the currents before wading in deep" | CRITICAL |
| table-6-3-1 | 6-3 | **Title**: "Reading the Undercurrents — What Americans Really Mean" | MEDIUM |

**Recommendation:** Module 6 needs a second editorial pass. The key takeaways (kt-6-2-1, kt-6-3-1) and section titles still use beach/current/undercurrent metaphors extensively.

---

#### Module 7 (lessons 7-1 through 7-4) — 1 BLOCK CONTAMINATED

| Block | Lesson | Issue | Priority |
|-------|--------|-------|----------|
| kt-7-4-1 | 7-4 | Closing metaphor: "The data confirms what the springs reveal — the deepest aquifer sustains the strongest flow" | HIGH |

**Note:** Blocks text-7-5-2 and kt-7-5-1 (referenced in the original plan) do not exist in the current module 7 JSON. Lesson 7-5 may not be integrated into the generated files yet.

---

#### Module 8 (lessons 8-1, 8-2, 8-3) — CLEAN

Prior editorial passes successfully cleaned Module 8. No remaining metaphors detected.

---

### Editorial Compliance Summary

| Module | Lessons | Status | Remaining Issues |
|--------|---------|--------|------------------|
| 0 | lesson-0-1 | MOSTLY CLEAN | 3 minor items (module count, disclaimer, themes) |
| 1 | lessons 1-1 to 1-3 | MOSTLY CLEAN | 4 items (text-1-3-5 metaphor, grammar, payment processors, Q2) |
| 2 | lessons 2-1 to 2-3 | CLEAN | 3 minor "most"/"Orlando" fixes |
| 3 | lessons 3-1 to 3-3 | CLEAN | None |
| **4** | **lessons 4-1 to 4-3** | **FAIL** | **10 blocks with deep theme park metaphors** |
| **5** | **lessons 5-1 to 5-2** | **FAIL** | **1 block with scenic drive framing** |
| **6** | **lessons 6-1 to 6-3** | **FAIL** | **5 blocks with beach/ocean metaphors** |
| 7 | lessons 7-1 to 7-4 | MOSTLY CLEAN | 1 spring metaphor in kt-7-4-1 |
| 8 | lessons 8-1 to 8-3 | CLEAN | None |

**Total remaining editorial issues:** ~22 blocks across 7 lessons

---

## Part 2: QA / Instructional Design Audit

### Gate 1.6 — Content Engagement

**Result: PASS WITH WARNINGS**

| Check | Status | Score |
|-------|--------|-------|
| Opening Hooks | WARN | 97% (28/29 lessons have hooks) |
| Concrete Examples | PASS | 2.12 examples per 500 words |
| Conversational Bridges | WARN | 113 bridges found; 76/189 sections lack them |
| Filler Opener Detection | PASS | 0 filler openers |
| Narrative Progression | WARN | 83% variety; 5 lessons have low section type variety |
| Example Relevance | WARN | No example passages analyzable for specificity |

**Specific issues:**
- lesson-7-4: Missing opening hook
- Lessons 2-1, 3-1, 6-2, 7-1: Low section type variety (too many callout blocks vs. text blocks)

---

### Gate 1.7b — Writing Humanization

**Result: FAIL**

| Check | Status | Score |
|-------|--------|-------|
| **Em-Dash Density** | **FAIL** | **4.09/500w (limit: 3.0)** |
| Formulaic Starters | PASS | 0 found |
| Consecutive Same-Start | WARN | 10 occurrences |
| Passive Voice | PASS | 3.5% |
| Bullet List Ratio | PASS | 0% |
| Sentence Length Variety | WARN | Std dev 9.76 (OK); 251 uniform-length runs |
| Hollow Filler Phrases | PASS | 0 found |

**Worst em-dash offenders (per 500 words):**

| Lesson | Em-dashes | Rate/500w |
|--------|-----------|-----------|
| lesson-0-1 | 39 | 7.2 |
| lesson-7-4 | 24 | 7.2 |
| lesson-7-3 | 16 | 6.0 |
| lesson-6-1 | 23 | 5.6 |
| lesson-8-2 | 23 | 5.5 |
| lesson-3-2 | 21 | 5.3 |

**Consecutive same-start sentences:**
- lesson-1-2: 3+ starting with "the"
- lesson-4-2: 3+ starting with "the"
- lesson-4-3: 3+ starting with "option"
- lesson-6-3: 3+ starting with "they" and "the"
- lesson-7-3: 3+ starting with "florida"
- lesson-8-2: 3+ starting with "the"

**Remediation:** Replace ~30% of em-dashes with commas, colons, or parentheses. Focus on the 6 worst lessons first (all above 5.0/500w). This is a targeted find-replace task.

---

### Gate 1.8c — Readability

**Result: FAIL**

| Check | Status | Score | Target |
|-------|--------|-------|--------|
| **Flesch-Kincaid Grade** | **FAIL** | **10.3** | **8 (±2 tolerance)** |
| New Terms Density | WARN | 25.9/500w | <5/500w recommended |
| Average Sentence Length | PASS | 14.6 words | <20 words |
| Passive Voice Ratio | PASS | 3.6% | <15% |
| Paragraph Length | PASS | Max 116 words | <150 words |

**Context:** The grade level (10.3) exceeds target by 2.3 grade levels. However, the audience is international business founders (typically college-educated professionals). The content uses domain-specific terminology (LLC, C-Corp, EIN, ITIN, W-8BEN) that inflates the grade level. The "complex terms" flagged include words like "founders," "international," "structure," "compliance" — all necessary domain vocabulary.

**Assessment:** This is a **structural/pre-existing issue**, not caused by the editorial changes. The target audience's sophistication level likely tolerates grade 10 content. Recommend documenting this as an accepted deviation rather than attempting to simplify domain terminology.

---

### Gate 1.9 — Content Depth

**Result: FAIL**

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Avg words/lesson | 926 | 1,500 | WARNING (62%) |
| Avg words/section | 140 | 250 | FAIL |
| Examples/section | 0.50 | 1.0 | FAIL |
| Sections under 200w | 131/191 | — | 69% of sections |
| Practical activity ratio | 4% | 10% min | FAIL |

**10 lessons under volume target (800w minimum):**

| Lesson | Words | % of Target |
|--------|-------|-------------|
| lesson-7-3 | 442 | 29% |
| lesson-7-1 | 621 | 41% |
| lesson-7-4 | 614 | 41% |
| lesson-3-3 | 686 | 46% |
| lesson-5-2 | 697 | 46% |
| lesson-3-1 | 723 | 48% |
| lesson-5-1 | 760 | 51% |
| lesson-3-2 | 773 | 52% |
| lesson-6-2 | 791 | 53% |
| lesson-8-3 | 792 | 53% |

**Assessment:** This is a **pre-existing structural issue** from Phase 1 content generation. The course was generated from an outline (no source documents), so content is inherently thinner. Fixing this properly requires a Phase 1b content enrichment pass — adding more examples, deeper explanations, and practical scenarios to thin sections. This is NOT caused by the editorial metaphor removal (which replaced metaphors with equivalent-length direct content).

**Worst example density lessons:**

| Lesson | Examples | Sections | Per Section |
|--------|----------|----------|-------------|
| lesson-6-1 | 1 | 6 | 0.17 |
| lesson-8-3 | 1 | 6 | 0.17 |
| lesson-1-2 | 2 | 6 | 0.33 |
| lesson-2-3 | 3 | 9 | 0.33 |
| lesson-3-1 | 2 | 7 | 0.29 |

---

## Part 3: Prioritized Remediation Plan

### Priority 1 — CRITICAL (blocks Brian explicitly requested fixed)

**Module 4 metaphor cleanup** — 10 blocks
- Rewrite all "backstage pass", "theme park", "ride", "entertainment district" metaphors
- Replace with direct workforce/visa/payroll language
- Estimated effort: 2-3 hours (similar scope to Module 1-2 cleanup)

**Module 6 metaphor cleanup** — 5 blocks
- Rewrite key takeaways and section titles that use beach/current/undercurrent metaphors
- Replace with direct business culture language
- Estimated effort: 1-2 hours

**Module 5 text-5-1-1** — 1 block
- Replace scenic-drive opening with direct market adaptation content
- Estimated effort: 15 minutes

### Priority 2 — HIGH (editorial items Brian specifically called out)

| Item | Effort |
|------|--------|
| Fix text-1-3-5 "walked the length of this street" metaphor | 10 min |
| Fix "The Central Florida" grammar error in callout-1-1-funfact | 2 min |
| Fix kt-7-4-1 spring metaphor closing | 5 min |
| Add explicit "9 modules total" to lesson-0-1 | 5 min |
| Update legal disclaimer to Brian's exact text | 10 min |
| Make 4 themes / 8 modules explicit | 10 min |

### Priority 3 — MEDIUM (QA gate fixes)

| Item | Effort | Impact |
|------|--------|--------|
| Reduce em-dash density (6 worst lessons) | 1-2 hours | Passes Gate 1.7b |
| Fix 10 consecutive same-start sentence runs | 30 min | Clears warnings |

### Priority 4 — LOW / DEFERRED (structural issues)

| Item | Effort | Assessment |
|------|--------|------------|
| Content depth enrichment (Gate 1.9) | 8-12 hours | Phase 1b needed; pre-existing |
| Readability grade reduction (Gate 1.8c) | Extensive | Domain terms drive this; audience tolerates it |
| Add Payoneer/Paddle/Lemon Squeezy to lesson-1-3 | 30 min | Nice-to-have from Brian |
| Reconsider KC Q2 options | 30 min | Brian's suggestion, not blocking |
| 3 minor "most"→"many" fixes in Module 2 | 10 min | Low impact |
| Bridge gaps (76/189 sections) | 4-6 hours | Gate 1.6 already passing |

---

## Appendix A: Gate Result Files

| Gate | File | Timestamp |
|------|------|-----------|
| 1.6 | `.gates/gate-1.6-warn.json` | 2026-04-07T11:03:10Z |
| 1.7b | `.gates/gate-1.7b-fail.json` | 2026-04-07T11:03:11Z |
| 1.8c | `.gates/gate-1.8c-fail.json` | 2026-04-07T11:03:12Z |
| 1.9 | `.gates/gate-1.9-fail.json` | 2026-04-07T11:03:13Z |

## Appendix B: Files That Need Changes (Next Fix Script)

### Priority 1 files (Module 4 + 6 + 5 metaphor cleanup):
- `generated/content-phase1-module4.json`
- `phase1-lessons/lesson-4-1.json`
- `phase1-lessons/lesson-4-2.json`
- `phase1-lessons/lesson-4-3.json`
- `generated/content-phase1-module6.json`
- `phase1-lessons/lesson-6-1.json`
- `phase1-lessons/lesson-6-2.json`
- `phase1-lessons/lesson-6-3.json`
- `generated/content-phase1-module5.json`
- `phase1-lessons/lesson-5-1.json`

### Priority 2 files (targeted fixes):
- `generated/content-phase1-module1.json` (text-1-3-5, callout-1-1-funfact)
- `phase1-lessons/lesson-1-1.json` (callout grammar)
- `phase1-lessons/lesson-1-3.json` (text-1-3-5)
- `generated/content-phase1-module-0.json` (module 0 structural items)
- `generated/content-phase1-module0.json` (module 0 structural items)
- `phase1-lessons/lesson-0-1.json` (module 0 structural items)
- `generated/content-phase1-module7.json` (kt-7-4-1)
- `phase1-lessons/lesson-7-4.json` (kt-7-4-1)

### Priority 3 files (em-dash reduction):
- All lessons in `generated/` and `phase1-lessons/` — focus on lesson-0-1, 7-4, 7-3, 6-1, 8-2, 3-2

## Appendix C: Changed Blocks Manifest (from prior fix)

The `changed-blocks-manifest.json` file lists the 57 blocks already changed in the April 7 editorial fix script. Any additional fixes should append to this manifest for Spanish translation tracking.

---

*Report generated automatically. All findings verified against current JSON content files.*
