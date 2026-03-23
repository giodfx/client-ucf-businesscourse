# UCF BIP — U.S. Market Readiness Program
## Implementation Plan

**Project:** U.S. Market Readiness Program for International Founders
**Client:** Brian Bedrick, UCF Business Incubation Program
**Platform:** Design X Factor Learning Platform (didactax.designxfactor.com)
**Content Engine:** CourseFuture (Course Factory pipeline)
**Price Point:** $99 per learner
**Target Launch:** End of April 2026

---

## 1. Project Overview

A self-paced online program that prepares international entrepreneurs to launch and operate a business in the United States, with a focus on the Central Florida ecosystem. Delivered on our custom learning platform with rich analytics — not through a traditional LMS.

**What this is:** Phase 1 of a 3-phase pathway (Education → Ecosystem Introduction → Full Incubator Membership).

**Key constraints:**
- $99 product — don't over-engineer
- 2-3 hours total learner time
- Brian wants to be hands-on during pilot (direct contact with every participant)
- 10-20 learners in first cohort
- UCF handles payment externally — we handle enrollment via access codes
- No learner-facing registration or intake — Brian enters all data

---

## 2. Confirmed Scope Decisions (March 5 Meeting)

These decisions are locked and drive all implementation work.

### Content Decisions
| Decision | Confirmed |
|----------|-----------|
| 7 modules + Welcome section + Wrap-up | Yes |
| Module order: Legal → Money → Risk → People → Sales → Culture → Network | Yes |
| Module 1 focused on SunBiz registration; banking details in Module 2 | Yes |
| "What It Actually Takes" welcome/overview section | Yes |
| "Is the U.S. Right for You?" wrap-up self-assessment | Yes |
| Four core themes woven throughout: Reduce Risk, Watch Your Money, Avoid Common Mistakes, Understand the Culture | Yes |
| Practical tone — checklists, "Common Mistake" boxes, cost ranges, timelines | Yes |
| No traditional quizzes — self-check checklists and reflection prompts | Yes |
| All learners get same path — no routing logic | Yes |
| Latin America / Spanish supplements visible to all (not conditional) | Yes |
| Funding/investors topic sprinkled across Money + Culture + Ecosystem modules | Yes |
| "Why Central Florida?" section in Module 7 | Yes |

### Platform Decisions
| Decision | Confirmed |
|----------|-----------|
| Custom platform (not Canvas/SCORM LMS) | Yes |
| UCF handles payment — we use access codes / admin enrollment | Yes |
| No learner-facing intake questionnaire | Yes |
| Brian enters learner data via CSV bulk enrollment | Yes |
| Per-module feedback: thumbs up/down + optional text | Yes |
| No forum/async Q&A — use external tool (Discord/email) | Yes |
| 1:1 booking link (Calendly) at end of course only | Yes |
| English/Spanish language toggle | Yes |
| End-of-course survey for value perception | Yes |
| One admin dashboard for Brian to see everything | Yes |

### Out of Scope (Phase 1)
- AI chatbot / scenario engine
- Dynamic / adaptive content by learner profile
- Multiple exit pathways / branching
- In-course community or forum
- Payment processing (UCF handles externally)
- Ongoing content updates post-launch

---

## 3. Platform Architecture

### How It Works

```
CourseFuture Pipeline          Learning Platform
─────────────────────         ──────────────────
strategy.json
  ↓
Phase 0-1: Content Gen
  ↓
Phase 2: Media Planning
  ↓
Phase 3: Media Production
  ↓
Phase 4: Assembly
  ↓
DLCS Export (.dlcs.zip)  ───→  Upload to R2
                               ↓
                              DLCS Player renders content
                              SCORM tracking (CMI data)
                              CFF features (feedback, booking, localization)
                              Admin dashboard
```

**Content format:** DLCS package (includes SCORM fallback for portability to Canvas/Moodle if needed later).

**Two packages:** English and Spanish — uploaded to separate R2 prefixes. Language toggle switches which package is loaded.

---

## 4. Learning Platform — What Exists vs. What Needs to Be Built

### Already Working (No Changes Needed)

| Capability | Status |
|------------|--------|
| DLCS course delivery (R2 hosting, learner state, engagement events) | Production |
| SCORM tracking (CMI data, progress, scores) | Production |
| User management (create, edit, roles) | Production |
| CSV user import (name, email, password, role) | Production |
| Admin analytics (overview, trends, per-course) | Production |
| Gradebook (quiz scores, video progress, interactive engagement) | Production |
| Course resources (downloadable files) | Production |
| Certificates (POK.tech blockchain) | Production |
| Payments (Stripe/PayPal) | Production (not needed — UCF handles externally) |
| CFF engine (feature registry, hooks, slots, data store, API routes) | Production |
| Auth system (credentials, JWT, 3 roles) | Production |

### Must Build — Priority 1 (Launch Blockers)

#### 4.1 CSV Bulk Enrollment with Extended Profile

**Current state:** CSV import creates user accounts only (name, email, password, role). Does not enroll in a course. No extended profile fields.

**What to build:**
- New `POST /api/courses/[courseId]/enroll-bulk` endpoint
- Accepts CSV with columns: name, email, country, company, industry, language_preference, [custom fields Brian defines]
- Auto-creates user account if not exists (generates random password or sends invite)
- Enrolls user in specified course with `enrollmentSource = "admin"`
- Stores extended profile fields (new `learnerProfiles` table or extend `users`)
- Returns count of enrolled, skipped (already enrolled), errors

**Schema change:** Add `learnerProfiles` table:
```
learnerProfiles:
  id, userId, courseId, country, company, industry,
  languagePreference, customFields (JSON), createdAt, updatedAt
```

**Estimated effort:** 8-12 hours

#### 4.2 Per-Module Feedback System

**Current state:** Nothing exists. No table, no API, no UI.

**What to build:**

Database:
```
contentFeedback:
  id, userId, courseId, moduleId, rating (thumbs_up/thumbs_down),
  comment (optional text), createdAt
```

API:
- `POST /api/feedback/[courseId]` — submit feedback (userId, moduleId, rating, comment)
- `GET /api/feedback/[courseId]` — admin view: all feedback for course (filterable by module)
- `GET /api/feedback/[courseId]/summary` — aggregated: per-module thumbs breakdown + comment list

Learner UI (in DLCS player):
- After each module completion: slide-up panel with thumbs up/down + text field
- Static reassurance message after submit ("Thank you — your feedback helps us improve this program")
- Stored locally so it doesn't re-prompt on revisit

Admin UI:
- Feedback tab in course analytics page
- Per-module bar chart (thumbs up vs. down)
- Scrollable comment list with learner name, module, date
- Filter by module

**Estimated effort:** 12-16 hours

#### 4.3 Language Toggle (EN/ES)

**Current state:** `localization` CFF feature is registered with full config schema but handler is a no-op stub. No UI components.

**What to build:**

CFF handler implementation:
- On `on_enroll` hook: check learner's `languagePreference` from profile, set as default
- On `before_content_load` hook: resolve correct R2 prefix based on selected language
- Config: `{ defaultLanguage: "en", availableLanguages: [{ code: "en", label: "English", manifestPrefix: "en/" }, { code: "es", label: "Español", manifestPrefix: "es/" }] }`

Player UI:
- Language picker in course header (flag + label)
- Persists selection to `featureData` (key: `selectedLanguage`)
- Reloads content from appropriate R2 prefix when switched
- Does NOT translate platform chrome (admin UI stays English)

CourseFuture:
- Generate two DLCS packages (EN and ES)
- Upload each to a different R2 prefix under the same course

**Estimated effort:** 8-12 hours (handler + UI + player integration)

#### 4.4 Consultation Booking CTA

**Current state:** `consultation_booking` CFF feature is registered but handler is a no-op stub.

**What to build:**

CFF handler implementation:
- Renders Calendly embed in `after_completion` slot
- Config: `{ provider: "calendly", bookingUrl: "https://calendly.com/brian-bedrick/...", displayMode: "embed", heading: "Schedule a 1-on-1 with Brian" }`

Player UI:
- `BookingCTA` component renders in wrap-up module and on course completion screen
- Calendly inline embed (not popup — mobile-friendly)
- Tracks click as engagement event

**Estimated effort:** 4-6 hours

#### 4.5 Admin Enrollment Route

**Current state:** `enrollmentSource = "admin"` exists as valid enum value but no route uses it.

**What to build:**
- `POST /api/courses/[courseId]/enroll-admin` — admin enrolls an existing user
- Accepts: `{ userId, profileFields? }`
- Creates enrollment with `enrollmentSource = "admin"`
- Fires `on_enroll` CFF hook
- Sends welcome email with course link

**Note:** This is separate from bulk CSV — it's for one-off enrollments from the admin panel.

**Estimated effort:** 2-4 hours

#### 4.6 Enhanced Analytics CSV Export

**Current state:** `GET /api/users/export` exports user list only. No course-scoped data export.

**What to build:**
- `GET /api/analytics/courses/[courseId]/export?format=csv`
- Combines per-learner: name, email, country, company, industry, language, enrollment date, completion status, time spent, module progress (per-module completion + time), feedback (per-module thumbs + comments), device type, last accessed
- Regional breakdown columns (country grouping)

**Estimated effort:** 6-8 hours

#### 4.7 Device Tracking

**Current state:** No device data collected.

**What to build:**
- Parse `User-Agent` header on DLCS state save and engagement event APIs
- Store parsed `deviceType` (mobile/tablet/desktop) and `browser` in engagement events
- Add to analytics dashboard: device breakdown pie chart
- Add to CSV export

**Estimated effort:** 2-4 hours

#### 4.8 Feedback Dashboard (Admin)

**Current state:** Analytics pages exist but no feedback visualization.

**What to build:**
- New tab in course analytics: "Learner Feedback"
- Per-module thumbs breakdown (bar chart)
- Open-text comment feed (sortable by date, filterable by module)
- Overall satisfaction score (% thumbs up)
- "What's missing" tag cloud or keyword summary
- Regional breakdown of feedback (by country from learner profile)

**Estimated effort:** 8-12 hours (integrated into existing analytics pages)

### Must Build — Priority 2 (Post-Launch Enhancements)

| Feature | Description | Effort |
|---------|-------------|--------|
| Impact Dashboard | High-level view for Brian's stakeholders/funders: enrollment trends, completion rates, regional diversity, feedback sentiment, referral tracking | 12-16 hrs |
| Lead Export | Webhook/CSV export of learner profiles + engagement data for UCF reporting | 4-6 hrs |
| End-of-Course Survey | Custom survey form (not embedded Google Form) with analytics | 8-12 hrs |
| Self-Report Referral Tracking | "Did you contact any of these organizations?" checklist in wrap-up | 4-6 hrs |

### Not Building (Confirmed Out of Scope)

| Feature | Reason |
|---------|--------|
| Learner intake questionnaire | Brian enters all data — no learner-facing intake |
| In-course forum / Q&A | External tool (Discord/email) for 10-20 users |
| AI chatbot / scenario engine | Phase 2 opportunity |
| Adaptive content paths | Phase 2 opportunity |
| Payment processing | UCF handles externally |
| Program matcher (Traction/Growth/Soft Landing routing) | Removed — all learners get same path |

---

## 5. Platform Build Summary

### Total Estimated Effort

| Category | Items | Hours |
|----------|-------|-------|
| CSV Bulk Enrollment + Profiles | 4.1 + 4.5 | 10-16 |
| Per-Module Feedback (API + UI + Admin) | 4.2 + 4.8 | 20-28 |
| Language Toggle | 4.3 | 8-12 |
| Booking CTA | 4.4 | 4-6 |
| Analytics Export + Device Tracking | 4.6 + 4.7 | 8-12 |
| **Total Priority 1** | | **50-74 hours** |

### Implementation Order

1. **Database schema changes** — `learnerProfiles` + `contentFeedback` tables, device field on engagement events
2. **CSV Bulk Enrollment** — highest priority for Brian to start enrolling pilot cohort
3. **Per-Module Feedback** — core value prop for Brian's stakeholder reporting
4. **Language Toggle** — required for Spanish-speaking founders
5. **Admin Feedback Dashboard** — Brian needs to see feedback data
6. **Analytics Export** — CSV download for Brian's reporting
7. **Booking CTA** — Calendly embed in wrap-up
8. **Device Tracking** — nice analytics data, low effort

---

## 6. Content Pipeline (CourseFuture)

See **COURSE-DEVELOPMENT-PLAN.md** for the full content development plan.

**Summary:** CourseFuture generates the course content through its standard pipeline (Phase 0-5), exports as DLCS packages (EN + ES), and uploads to R2 for the learning platform to serve.

---

## 7. Timeline

| Phase | Dates | What Happens |
|-------|-------|-------------|
| **Founder Validation** | Mar 5 – Mar 14 | Preview tool deployed, Brian distributes to founders, feedback collected |
| **Content Lock** | Mar 15 | Module scope finalized based on founder feedback |
| **Experience Design** | Mar 15 – Mar 21 | Visual identity, tone, callout system, UX patterns |
| **Content Production** | Mar 17 – Apr 4 | CourseFuture Phase 0-1: strategy → blueprint → content generation (EN + ES) |
| **Media Production** | Apr 1 – Apr 11 | CourseFuture Phase 2-3: images, video, podcast, interactives |
| **Platform Build** | Mar 17 – Apr 11 | LearningPlatform: CSV enrollment, feedback, language toggle, dashboard, booking |
| **Assembly & QA** | Apr 14 – Apr 21 | CourseFuture Phase 4-5: DLCS export → upload to platform → QA gates |
| **Client Review** | Apr 21 – Apr 25 | Brian reviews course on platform, 1-2 revision rounds |
| **Launch** | End of April | Course live, first cohort enrolled |

**Parallel workstreams:** Content production and platform build happen simultaneously (Mar 17 – Apr 11).

---

## 8. Deployment & Infrastructure

| Component | Where | Notes |
|-----------|-------|-------|
| Learning Platform | `didactax.designxfactor.com` (Cloudflare Workers) | Existing deployment |
| Course Content | Cloudflare R2 (DLCS packages) | EN prefix + ES prefix |
| Platform Database | Cloudflare D1 | Existing — add new tables |
| Founder Preview | `ucf-bip-preview.pages.dev` | Already deployed |
| Feedback Dashboard | `ucf-bip-preview.pages.dev/dashboard.html` | Already deployed |
| SOW | `sign.designxfactor.com/?d=ucf-bip-market-readiness` | Already deployed |

---

## 9. Data & Analytics

### What Brian Sees in His Dashboard

| Data Point | Source | Available |
|------------|--------|-----------|
| Total enrolled / completed / in-progress | Enrollment table | Already working |
| Time spent per module per learner | SCORM CMI `session_time` | Already working |
| Module completion status per learner | SCORM CMI + DLCS learner state | Already working |
| Video plays and watch time | `suspend_data.vp` → gradebook | Already working |
| Interactive engagement (clicks, completions) | `suspend_data.ix` → gradebook | Already working |
| Per-module feedback (thumbs + comments) | `contentFeedback` table | **To build** |
| Learner country, company, industry | `learnerProfiles` table | **To build** |
| Regional breakdowns | Join profiles → analytics | **To build** |
| Device type breakdown | Engagement events | **To build** |
| Modality usage (text/video/podcast) | DLCS engagement events | Already working |
| CSV export of all data | Export endpoint | **To build** |

### SCORM Portability

The DLCS package includes an embedded SCORM 2004 fallback. If UCF ever wants to move the course to Canvas or another LMS, they export the SCORM package and it works. No vendor lock-in.

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Founder feedback changes module scope significantly | Medium | High | Content lock date (Mar 15) limits scope creep. CourseFuture can regenerate content quickly. |
| Spanish translation quality insufficient | Low | Medium | Generate Spanish content through CourseFuture's pipeline (not machine translation). Run through Spanish QA gates. |
| Brian needs features not in scope | High | Medium | SOW clearly defines must-haves. Phase 2 opportunities documented. |
| Platform build takes longer than estimated | Medium | Medium | Priority 1 items are launch blockers; Priority 2 can ship post-launch. |
| Low founder response to preview | Medium | Low | Brian distributes directly. Backup: proceed with existing outline validation. |

---

## 11. Acceptance Criteria

The project is complete when:

1. All 7 modules + Welcome + Wrap-up are live on the platform in English and Spanish
2. Brian can bulk-enroll learners via CSV with profile fields
3. Learners see per-module feedback prompts (thumbs + text) and data flows to admin
4. Language toggle switches between EN and ES content
5. Booking CTA appears in wrap-up section linking to Brian's Calendly
6. Brian can view learner progress, feedback, and engagement in the admin dashboard
7. Brian can export all data as CSV
8. SCORM fallback package exports and loads in Canvas (verified)
9. Content passes CourseFuture QA gates (accessibility, content quality, media quality)
