# Avatar Video Production Plan — UCF Business Course

## Overview

Generate talking-head avatar videos for all 26 lessons using a multi-shot segment approach with crossfade assembly. Each lesson produces a single MP4 (~3-5 min) at 1280x720.

**Pipeline:** Avatar Image → 5 Shot Variations → 18s Video Segments → Crossfade Assembly → Final MP4

**Hardware:** RTX 4090 24GB — one GPU job at a time, NEVER overlap.

---

## Pipeline Stages

### Stage A: Shot Image Generation (Qwen Image Edit)

**Workflow:** `workflows/comfyui/02_qwen_Image_edit_subgraphed.json`
**Model:** `qwen_image_edit_2509_fp8` + Lightning LoRA (4 steps, ~3-5s per image)
**Input:** Existing avatar image from `media/images/avatars/scenes/lesson-X-X-avatar.png`
**Output:** 5 shot variations per lesson in `media/images/avatars/shots/lesson-X-X/shot-{1-5}.png`

For each lesson, generate 5 camera angle variations of the existing avatar:

| Shot | Framing | Description |
|------|---------|-------------|
| 1 | Wide | Waist up, full environment visible, character centered |
| 2 | Medium | Chest up, background partially visible, hand gesture |
| 3 | Close-up | Face and shoulders fill frame, bokeh background |
| 4 | Three-quarter | Slight angle, hand gesture, environment partially visible |
| 5 | Medium-wide | Hips up, casual posture, more environment/sky visible |

**Time estimate:** ~30s per shot × 5 shots × 26 lessons = ~65 minutes

**Prompt template for Qwen Image Edit:**
```
Cinematic digital painting, [FRAMING DESCRIPTION], [CHARACTER DESCRIPTION],
wearing [OUTFIT FOR MODULE], [LANDSCAPE DESCRIPTION matching landscapeTheme],
warm golden hour lighting, painterly brushstroke texture, cinematic color grading.
NOT a photograph NOT photorealistic, digital painting with visible paint texture.
NO text NO letters NO words NO signs NO banners NO logos NO writing NO typography.
```

**Critical rules:**
- NEVER specify left/right positions — let the model decide composition
- Car/vehicle only appears in lesson-0-1 (highway theme)
- Each shot must maintain character consistency (same face, hair, outfit)
- Close-up (shot 3) must show ONLY face/shoulders with blurred background
- All shots must have the character facing the camera with clear eye contact

---

### Stage B: Video Segment Generation (LTX-2.3)

**Workflow:** `workflows/comfyui/video_ltx2_3_ia2v.json`
**Model:** LTX-2.3 22B fp8 + distilled LoRA + spatial upscaler
**Resolution:** 1280×720 @ 24fps
**Max segment:** 18 seconds (4090 24GB VRAM limit)

#### Settings (proven on seg-000 of lesson-0-1)
```
img_compression: 5        # Moderate image freedom
strength: 0.75            # Image-to-video fidelity
strength_model: 0.4       # Distilled LoRA strength
cfg: 1                    # No CFG (distilled model)
```

#### Segment Math
```
SEG_DURATION = 18 seconds
CROSSFADE = 1.5 seconds
EFFECTIVE_DUR = 16.5 seconds per segment

For a lesson with totalDuration T:
  numSegments = ceil(T / EFFECTIVE_DUR)
```

| Duration Range | Segments | GPU Time (~3 min/seg) |
|---------------|----------|----------------------|
| 197-210s | 12-13 | ~36-39 min |
| 240-260s | 15-16 | ~45-48 min |
| 270-290s | 17-18 | ~51-54 min |
| 300s+ | 19+ | ~57+ min |

**Total across 26 lessons: ~400 segments, ~20 GPU hours**

#### Shot Cycling

Segments cycle through shots to create natural "camera cut" feeling:
```
SHOT_CYCLE = [1, 2, 3, 4, 2, 5, 3, 4, 2, 1, 3, 2, 5, 4, 3, 2, 1, 5, 2, 3, 4, 2, 5, 3]
```

This ensures:
- No same-shot repeated back-to-back
- Close-ups (3) appear every 3-4 segments for intimacy
- Wide shots (1) bookend groups for scene re-establishment
- Medium (2) appears most frequently as the "default" angle

#### Action Variants (Scene Diversity)

With 5 shots cycling across 12-19 segments, the same shot image is reused multiple times. To prevent repetitive-looking video, each reuse of a shot gets a **different action variant** — a different body language, gesture, or energy description in the LTX prompt.

**How it works:**
1. A `shotUsage` counter tracks how many times each shot has been used so far
2. When building the LTX prompt, `variantIdx = shotUsage[shotNum]` is passed
3. The action description cycles through an array of variants: `actions[variantIdx % actions.length]`
4. The counter increments after each use

**Example for shot-1 (Wide) with 3 variants:**
- 1st use (seg 0): "steady composed posture with relaxed shoulders"
- 2nd use (seg 9): "slight forward lean as if sharing a confidence"
- 3rd use (seg 16): "relaxed upright posture with occasional gentle nod"
- 4th use: cycles back to variant 1

**Variant guidelines:**
- Each variant MUST keep the golden rule talking instruction identical
- Vary only: body language, posture, energy level, gesture type
- Keep changes subtle — the LTX model produces natural motion, not posed photography
- 2-4 variants per shot type is ideal (more causes diminishing returns)

---

### Stage C: Assembly (FFmpeg)

Crossfade dissolve between segments using ffmpeg xfade filter:
```
xfade=transition=fade:duration=1.5:offset=<calculated>
acrossfade=d=1.5:c1=tri:c2=tri
```

Fallback: simple concat with 0.75s trim from segment starts (if xfade filter fails on high segment counts).

Output: `media/video/avatars/lesson-X-X-avatar.mp4`

---

## LTX Prompt Writing Rules

### MANDATORY for every prompt

Every LTX prompt MUST contain ALL four sections and MUST include explicit talking instructions:

```
scene: [environment description matching the shot image]
character: [character description matching the shot image]
action: [MUST include talking/speaking instructions — see below]
camera: [framing description matching the shot type]
```

### The Golden Rule: ALWAYS instruct speaking

The `action:` section MUST include this phrase (or very close to it) in EVERY prompt:

> "She/He is actively speaking and talking to the camera with clear visible lip movements synchronized to her/his speech, her/his mouth opens and closes naturally forming words"

Failure to include this results in static faces or voice-over-only segments.

### Directional References: NEVER use left/right

NEVER write "to her left", "on his right", "car to the left side". The AI prompt enhancer sees the actual image and will determine positions. If your text contradicts the image, the model hallucinates.

Instead use: "beside her", "nearby", "behind him", "partially visible", "in the background"

### Scene Description: Match the framing

The scene description must match what's ACTUALLY VISIBLE in that specific shot framing:

| Shot | What the model sees | Describe as |
|------|-------------------|-------------|
| Wide (1) | Full environment, buildings, sky, ground | Full environment details |
| Medium (2) | Upper body + partial background | "background partially visible", "fading into background" |
| Close-up (3) | Face + blurred background | "soft blurred bokeh background", "out-of-focus warm tones" |
| Angle (4) | Similar to medium but offset | "environment visible nearby" |
| Med-wide (5) | Most of the body + environment | Full environment with emphasis on atmosphere |

**CRITICAL:** Do NOT describe a full highway scene in a close-up prompt. The model will try to generate the described scene and hallucinate.

### Negative Prompt (standard for all segments)

```
text, words, letters, subtitles, captions, watermark, logo, title card,
lower third, typography, writing, signage, banner, label, name tag, credit,
overlay graphics, HUD, UI elements, progress bar,
closed mouth, static face, frozen expression, mannequin, wax figure, puppet,
pc game, console game, video game, cartoon, childish, anime,
ugly, blurry, distorted face, deformed mouth, asymmetric eyes, uncanny valley,
extra fingers, mutated hands, poorly drawn face, mutation, deformed
```

---

## Per-Lesson Specifications

### Lesson Reference Table

| Lesson | Module | Presenter | Outfit | Landscape Theme | Duration | Segments |
|--------|--------|-----------|--------|-----------------|----------|----------|
| 0-1 | 0 | Female | Navy top, gold necklace | Highway / Dashboard Entry | 197.6s | 12 |
| 1-1 | 1 | Male | Charcoal blazer, white blouse | Downtown Orlando | 258.6s | 16 |
| 1-2 | 1 | Female | Charcoal blazer, white blouse | Downtown Orlando | 245.7s | 15 |
| 1-3 | 1 | Male | Charcoal blazer, white blouse | Downtown Orlando | 251.8s | 16 |
| 2-1 | 2 | Female | Dark green blazer, cream blouse | Financial District | 257.6s | 16 |
| 2-2 | 2 | Male | Dark green blazer, cream blouse | Financial District | 269.3s | 17 |
| 2-3 | 2 | Female | Dark green blazer, cream blouse | Financial District | 264.2s | 16 |
| 3-1 | 3 | Male | Gray cardigan, soft blue top | Rocket Base / Cape Canaveral | 276.1s | 17 |
| 3-2 | 3 | Female | Gray cardigan, soft blue top | Rocket Base / Cape Canaveral | 270.6s | 17 |
| 3-3 | 3 | Male | Gray cardigan, soft blue top | Rocket Base / Cape Canaveral | 239.9s | 15 |
| 4-1 | 4 | Female | Burgundy blazer, white top | Theme Park | 273.3s | 17 |
| 4-2 | 4 | Male | Burgundy blazer, white top | Theme Park | 261.1s | 16 |
| 4-3 | 4 | Female | Burgundy blazer, white top | Theme Park | 237.0s | 15 |
| 5-1 | 5 | Male | Camel jacket, dark top | Port / Shopping | 283.8s | 18 |
| 5-2 | 5 | Female | Camel jacket, dark top | Port / Shopping | 273.1s | 17 |
| 6-1 | 6 | Male | Black turtleneck, silver earrings | Beach | 278.4s | 17 |
| 6-2 | 6 | Female | Black turtleneck, silver earrings | Beach | 267.3s | 17 |
| 6-3 | 6 | Male | Black turtleneck, silver earrings | Beach | 223.3s | 14 |
| 7-1 | 7 | Female | Linen blazer, coral top | River Springs | 284.7s | 18 |
| 7-2 | 7 | Male | Linen blazer, coral top | River Springs | 289.9s | 18 |
| 7-3 | 7 | Female | Linen blazer, coral top | River Springs | 203.0s | 13 |
| 7-4 | 7 | Male | Linen blazer, coral top | River Springs | 198.6s | 12 |
| 7-5 | 7 | Male | Linen blazer, coral top | River Springs | 281.8s | 18 |
| 8-1 | 8 | Female | Navy blazer, white top, gold pin | UCF Headquarters | 303.9s | 19 |
| 8-2 | 8 | Male | Navy blazer, white top, gold pin | UCF Headquarters | 246.4s | 15 |
| 8-3 | 8 | Female | Navy blazer, white top, gold pin | UCF Headquarters | 283.3s | 18 |

**Totals:** 26 lessons, ~6,740s audio, ~408 video segments

### Character Descriptions

**Female presenter:**
> A confident Latina woman in her early 30s with dark shoulder-length wavy hair

**Male presenter:**
> A professional American man in his late 30s with short brown hair

### Landscape Theme → Scene Keywords

Use these scene keywords in LTX prompts to match what the avatar images show:

| Theme | Wide/Med-Wide Scene Keywords | Close-up Scene Keywords |
|-------|----------------------------|----------------------|
| Highway (0) | Florida highway at sunset, open road, warm amber sky | Warm golden hour lighting, soft sunset bokeh |
| Downtown Orlando (1) | Urban downtown street, modern glass buildings, warm golden light | Warm golden lighting, soft urban bokeh, amber tones |
| Financial District (2) | Corporate office park, glass facades, reflecting pools, manicured grounds | Warm professional lighting, soft architectural bokeh |
| Rocket Base (3) | Flat Florida marshland, launch towers on horizon, vast open sky | Warm lighting, soft sky bokeh, open atmosphere |
| Theme Park (4) | Colorful theme park boulevard, Ferris wheel, ride structures, festive | Warm festive lighting, soft colorful bokeh |
| Port / Shopping (5) | Commercial port area, shipping infrastructure, urban commercial | Warm commercial lighting, soft urban bokeh |
| Beach (6) | Coastal Florida, ocean, sandy dunes, sea oats, relaxed atmosphere | Warm coastal golden lighting, soft ocean bokeh |
| River Springs (7) | Natural Florida springs, cypress trees, green water, wildlife | Warm natural lighting, soft green forest bokeh |
| UCF Headquarters (8) | University campus, red brick, live oaks, academic architecture | Warm academic lighting, soft campus bokeh |

---

## Copyright Rules (enforce in every prompt)

1. No recognizable brand logos, mascots, or iconography
2. Theme parks: NO castles, NO Disney/Universal elements — Ferris wheels, coasters, generic rides only
3. No university logos or mascots (UCF campus scenes must be generic collegiate)
4. No NASA/SpaceX branding — generic launch facility only
5. No text rendered in images — enforced via negative prompt
6. No recognizable vehicles (generic sedan, no brand badges)

---

## Workflow Node Quick Reference

### Qwen Image Edit (shot generation)
| Node | Setting |
|------|---------|
| `78` (LoadImage) | Reference avatar image |
| `115:111` (TextEncodeQwenImageEditPlus) | Positive prompt + reference image |
| `115:110` (TextEncodeQwenImageEditPlus) | Negative prompt (empty) + reference image |
| `60` (SaveImage) | Output filename prefix |

### Qwen 2512 GGUF (landscape images)
| Node | Setting |
|------|---------|
| `91` (PrimitiveStringMultiline) | Prompt text |
| `60` (SaveImage) | Output filename prefix |
| `86:3` (KSampler) | seed, steps=35, cfg=4, euler, simple |
| `86:58` (EmptySD3LatentImage) | 1824×1024 |
| `86:66` (ModelSamplingAuraFlow) | shift=3.1 |

### LTX-2.3 Video (avatar segments)
| Node | Setting |
|------|---------|
| `269` (LoadImage) | Shot image filename |
| `276` (LoadAudio) | Audio segment filename |
| `340:319` (Prompt) | **Shot-specific prompt** |
| `340:314` (Negative) | Standard negative prompt |
| `340:330` / `340:324` | Width=1280, Height=720 |
| `340:331` | Duration in seconds |
| `340:334` | img_compression=5 |
| `340:325` | strength=0.75 |
| `340:293` | strength_model=0.4 |
| `340:286` | Random noise seed |
| `341` (SaveVideo) | Output filename prefix |

---

## Production Schedule

### Phase 1: Validate with lesson-0-1 (current)

1. ~~Generate 5 shot variations~~ DONE
2. Generate 12 video segments with per-shot prompts (~36 min GPU)
3. Assemble with crossfade
4. User reviews final video
5. Iterate if needed

### Phase 2: Shot generation for all 26 lessons (~65 min GPU)

For each lesson:
1. Load existing avatar image
2. Generate 5 shot variations via Qwen Image Edit
3. QA each shot for quality, consistency, text artifacts

### Phase 3: Video generation for all 26 lessons (~20 hours GPU)

Process in module order. Between each lesson:
- 30s GPU cooldown
- Verify all segments generated
- Assemble and verify output

**Recommended batching (can run overnight):**
- Night 1: Modules 0-3 (10 lessons, ~8 hours)
- Night 2: Modules 4-6 (7 lessons, ~6 hours)
- Night 3: Modules 7-8 (9 lessons, ~7 hours)

### Phase 4: Post-video

1. Run bullet timings for all 26 lessons
2. Regenerate HTML with avatar video references
3. SCORM export
4. Final QA

---

## Error Prevention Checklist

Before running ANY generation:

- [ ] Check for stale node processes: `tasklist | grep node` — kill any old pipeline scripts
- [ ] Check ComfyUI queue: `curl http://127.0.0.1:8188/queue` — should be empty
- [ ] Verify ComfyUI is running and responsive
- [ ] Verify all input files exist (shot images, audio files)
- [ ] Verify no other GPU process is running

Before running video generation for a lesson:

- [ ] All 5 shot images exist and are QA'd (no text artifacts, consistent character)
- [ ] Full concatenated audio exists in ComfyUI input directory
- [ ] Audio duration matches video-data.json totalDuration
- [ ] Each shot has its own LTX prompt (no generic prompts)
- [ ] Every prompt contains explicit talking/speaking instructions
- [ ] No left/right directional references in prompts
- [ ] Negative prompt includes anti-text AND anti-static-face terms

After video generation:

- [ ] All segments generated (no gaps)
- [ ] Spot-check 3-4 segments: character talking, no hallucinated scenes, no text artifacts
- [ ] Assembly produces correct total duration (within 2s of audio duration)
- [ ] Audio is clear throughout, no dropouts at crossfade points

---

## Lessons Learned (from 2026-03-24/25 session)

### What failed and why

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Coffee shop hallucination | Generic prompt contradicted close-up image | Per-shot prompts matching actual image content |
| Person not talking | Weak speaking instruction in prompt | Explicit "actively speaking, mouth opens and closes, lip movements synchronized" |
| Text artifacts ("BLAZEN RISHOLS") | LTX hallucinated lower-thirds | Comprehensive anti-text negative prompt |
| Visible segment cuts | Same image for all segments | 5 different camera angles, crossfade transitions |
| Left/right confusion | "Car to her left" contradicted image | Never use directional references, use "beside", "nearby" |
| OOM on full-length video | 217s at 1280x720 needs 39GB VRAM | 18s segments (fits in 24GB) |
| Stale ComfyUI queue | Old pipeline scripts running in background | Always kill stale node processes before starting |
| Palm tree overload in landscapes | "Palm trees lining both sides" in every prompt | Scene-specific vegetation matching actual Florida locations |
| Disney-like castle in theme park | Prompt said "fantasy castle with spires" | Copyright-safe: Ferris wheel, coasters, water slides only |

### CRITICAL: Prompt-Image Alignment

LTX-2.3 has a built-in **AI prompt enhancer** (node `340:342`) that **SEES the input image**. This means:

1. **The text prompt must DESCRIBE what's already in the image** — not an imagined scene
2. If the text contradicts the image, the model hallucinates (adds/removes objects, changes background)
3. You MUST visually inspect each shot image before writing its LTX prompt
4. Generic template prompts will NOT work — they cause artifacts and wrong scenarios

**Workflow for new lessons:**
1. Generate the 5 shot images (Stage A)
2. **Open each shot image and note exactly what's visible** (environment, character position, lighting, objects)
3. Write LTX prompts that match the actual image content
4. Add as `VERIFIED_SHOTS[lessonId]` entries in `generate-avatar-videos.mjs`
5. Include 2-4 action variants per shot for scene diversity

**Template fallback** exists for unverified lessons but will produce lower quality. Always verify shots before running video generation.

### What worked

- Wide shot (seg-000) with matching prompt: good talking, no artifacts
- 1280x720 at 18s segments: fits in 4090 24GB VRAM
- Crossfade transitions between different camera angles: natural film feel
- Qwen Image Edit for shot variations: fast (4 steps), maintains character consistency
- Qwen 2512 GGUF for landscapes: correct project style when using right workflow
- img_compression=5 + strength=0.75: good balance of motion and identity

---

## File Locations

```
media/images/avatars/scenes/          # 26 base avatar images (Stage 1 — COMPLETE)
media/images/avatars/shots/           # 5 shot variations per lesson (Stage A)
  lesson-0-1/shot-{1-5}.png          # Lesson 0-1 shots (DONE)
  lesson-1-1/shot-{1-5}.png          # etc.
media/images/road-scenes/             # 13 road trip landscape images (COMPLETE)
media/audio/scenes/lesson-X-X/        # Scene audio files (COMPLETE)
media/video/avatars/segments/         # Raw video segments per lesson
  lesson-X-X-multishot/seg-000.mp4
media/video/avatars/                  # Final assembled videos
  lesson-X-X-avatar.mp4
```

## Scripts

```
generate-avatar-videos.mjs            # Production pipeline — all 26 lessons, 3 stages
generate-multishot-test.mjs           # Lesson 0-1 test (reference only, superseded)
generate-road-scenes.mjs              # 13 road trip landscape images
generate-avatar-pipeline.mjs          # Original single-image pipeline (legacy, superseded)
redo-avatars.mjs                      # Image redo script
```

**Usage:**
```bash
node generate-avatar-videos.mjs                        # All lessons, lesson-0-1 first
node generate-avatar-videos.mjs --lesson lesson-0-1    # Single lesson
node generate-avatar-videos.mjs --skip-shots           # Skip Stage A (shots exist)
node generate-avatar-videos.mjs --start lesson-3-1     # Start from a specific lesson
```
