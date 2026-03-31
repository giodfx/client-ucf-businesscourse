#!/usr/bin/env python3
"""
Apply Instructional Design Improvements — Phase A
All structural fixes across 26 lessons:
  A1: KC consolidation (merge + rename)
  A2: Exercise/Reflection consolidation (remove duplicates)
  A3: Misplaced content relocation
  A4: Text/Interactive redundancy removal

Usage:
  python apply-id-improvements.py          # Dry run (show changes, don't write)
  python apply-id-improvements.py --apply  # Apply changes to files
"""

import json
import os
import sys
import copy
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

COURSE_DIR = Path(__file__).resolve().parent
LESSONS_DIR = COURSE_DIR / 'phase1-lessons'
DRY_RUN = '--apply' not in sys.argv

if DRY_RUN:
    print("=== DRY RUN === (use --apply to write changes)\n")

# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_lesson(lesson_id):
    p = LESSONS_DIR / f'{lesson_id}.json'
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save_lesson(lesson_id, data):
    if DRY_RUN:
        return
    p = LESSONS_DIR / f'{lesson_id}.json'
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def find_blocks(blocks, type_, id_prefix=None, title_contains=None):
    """Find blocks matching criteria."""
    results = []
    for i, b in enumerate(blocks):
        if b.get('type') != type_:
            continue
        if id_prefix and not b.get('id', '').startswith(id_prefix):
            continue
        if title_contains and title_contains not in b.get('title', ''):
            continue
        results.append((i, b))
    return results

def remove_block_by_index(blocks, idx):
    """Remove block at index, return the removed block."""
    return blocks.pop(idx)

changes_log = []

def log_change(lesson_id, category, description):
    changes_log.append((lesson_id, category, description))
    print(f"  [{lesson_id}] {category}: {description}")


# ═══════════════════════════════════════════════════════════════════════════════
# A1: KNOWLEDGE CHECK CONSOLIDATION
# ═══════════════════════════════════════════════════════════════════════════════

def consolidate_kc(lesson_id, data):
    """Merge all KC blocks into one, rename to 'What Would You Do?'"""
    blocks = data['contentBlocks']
    kc_blocks = [(i, b) for i, b in enumerate(blocks) if b.get('type') == 'knowledge-check']

    if len(kc_blocks) == 0:
        return False

    # Collect all questions from all KC blocks
    all_questions = []
    for _, b in kc_blocks:
        all_questions.extend(b.get('questions', []))

    # If already 1 block with correct title, just rename
    if len(kc_blocks) == 1 and len(all_questions) == len(kc_blocks[0][1].get('questions', [])):
        old_title = kc_blocks[0][1].get('title', '')
        if old_title == 'What Would You Do?':
            return False  # Already done
        kc_blocks[0][1]['title'] = 'What Would You Do?'
        kc_blocks[0][1]['id'] = f'kc-{lesson_id.replace("lesson-", "")}'
        log_change(lesson_id, 'A1-KC', f'Renamed KC: "{old_title}" → "What Would You Do?"')
        return True

    # Multiple blocks — merge
    # Find insertion point (where first KC block was)
    first_idx = kc_blocks[0][0]

    # Remove all KC blocks (reverse order to preserve indices)
    removed_titles = []
    for idx, b in reversed(kc_blocks):
        removed_titles.append(b.get('title', ''))
        blocks.pop(idx)

    # Create merged block
    merged = {
        "type": "knowledge-check",
        "id": f"kc-{lesson_id.replace('lesson-', '')}",
        "title": "What Would You Do?",
        "placement": "end-of-lesson",
        "questions": all_questions[:3]  # Cap at 3
    }

    # Insert at first KC position (adjusted for removals before it)
    # Since we removed in reverse, first_idx is still valid if no KC was before it
    # Actually we need to recalculate — count how many we removed before first_idx
    insert_at = first_idx
    for idx, _ in kc_blocks:
        if idx < first_idx:
            insert_at -= 1
    # But first_idx IS the first one, so nothing was removed before it
    insert_at = first_idx
    blocks.insert(insert_at, merged)

    log_change(lesson_id, 'A1-KC', f'Merged {len(kc_blocks)} KC blocks ({len(all_questions)}q) into 1 block (3q). Removed: {removed_titles}')
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# A2: EXERCISE/REFLECTION CONSOLIDATION
# ═══════════════════════════════════════════════════════════════════════════════

# Map of lesson → what to remove
REMOVE_BLOCKS = {
    'lesson-3-2': [('reflection', 'Your Risk Protection Plan')],
    'lesson-4-1': [('reflection', 'Think About Your First Hire')],
    'lesson-4-3': [('reflection', 'Your First U.S. Hire')],  # partial match
    'lesson-5-1': [('reflection', 'Your Product Adaptation Plan')],
    'lesson-6-1': [('reflection', 'Your Communication Style Audit')],
    'lesson-7-1': [('reflection', 'Your Resource Action Plan')],
    'lesson-7-4': [('reflection', 'Your Central Florida Runway Calculation')],
    'lesson-7-5': [('reflection', 'Your Readiness and Next Step')],
    'lesson-8-3': [('reflection', 'Value Reflection')],
}

def consolidate_exercise_reflection(lesson_id, data):
    """Remove duplicate exercise/reflection blocks per the plan."""
    if lesson_id not in REMOVE_BLOCKS:
        return False

    blocks = data['contentBlocks']
    removals = REMOVE_BLOCKS[lesson_id]
    changed = False

    for block_type, title_match in removals:
        for i in range(len(blocks) - 1, -1, -1):
            b = blocks[i]
            if b.get('type') == block_type and title_match in b.get('title', ''):
                removed = blocks.pop(i)
                log_change(lesson_id, 'A2-EX/REF', f'Removed {block_type}: "{removed.get("title", "")}"')
                changed = True
                break

    return changed


# ═══════════════════════════════════════════════════════════════════════════════
# A3: MISPLACED CONTENT RELOCATION
# ═══════════════════════════════════════════════════════════════════════════════

# We need to handle these carefully — load source AND target lessons

def relocate_content(all_lessons):
    """Move misplaced content between lessons."""
    changed_lessons = set()

    # ── 3-2 → 6-2: Move "Handshake Deal Is Dead" callout ──
    src = all_lessons['lesson-3-2']
    dst = all_lessons['lesson-6-2']
    src_blocks = src['contentBlocks']
    dst_blocks = dst['contentBlocks']

    for i, b in enumerate(src_blocks):
        if b.get('type') == 'callout' and 'Handshake' in b.get('title', ''):
            callout = src_blocks.pop(i)
            # Insert after the first callout in 6-2 (after "The Recap Email")
            insert_idx = None
            for j, db in enumerate(dst_blocks):
                if db.get('type') == 'callout' and 'Recap' in db.get('title', ''):
                    insert_idx = j + 1
                    break
            if insert_idx is None:
                insert_idx = 2  # fallback: after first text block
            callout['id'] = 'callout-6-2-culture'
            dst_blocks.insert(insert_idx, callout)
            log_change('lesson-3-2 → lesson-6-2', 'A3-MOVE', f'Moved callout: "Culture Shift — The Handshake Deal Is Dead"')
            changed_lessons.update(['lesson-3-2', 'lesson-6-2'])
            break

    # ── 3-2 KC Q1 → 3-3: Move NDA/contracts question ──
    # The KC Q1 in 3-2 is about insurance (vendor onboarding insurance) — actually re-reading it,
    # it IS about insurance. Let me check the actual question content.
    # From our earlier inspection: "proof of insurance during vendor onboarding" — this IS insurance.
    # The TITLE says "Contracts and Insurance" but the question is about insurance.
    # Let's check if there's actually an NDA question...
    # Actually from the audit: "A contracts/NDA question is embedded in an insurance lesson"
    # Let me check all 3 questions in 3-2
    src = all_lessons['lesson-3-2']
    src_blocks = src['contentBlocks']
    kc_blocks_32 = [(i, b) for i, b in enumerate(src_blocks) if b.get('type') == 'knowledge-check']
    # The title "Contracts and Insurance" suggests the first KC references contracts
    # But the actual Q is about insurance types — so the TITLE is misleading, not the question
    # The audit flagged the title. Let's just fix the title during KC consolidation.
    # No question needs to move — the title was the issue.

    # ── 4-1 → 4-2: Move visa authorization mistake ──
    src = all_lessons['lesson-4-1']
    dst = all_lessons['lesson-4-2']
    src_blocks = src['contentBlocks']
    dst_blocks = dst['contentBlocks']

    for i, b in enumerate(src_blocks):
        if b.get('type') == 'callout' and 'Common Mistakes' in b.get('title', '') and 'Hiring' in b.get('title', ''):
            content = b.get('content', '')
            # Check if it contains visa authorization text
            if 'visa' in content.lower() or 'authorization' in content.lower():
                # Extract the visa bullet from the HTML content and move it
                # Rather than parsing HTML, we'll note this for manual review
                # since it's a bullet within a larger callout, not a standalone block
                log_change('lesson-4-1', 'A3-NOTE', 'Visa authorization bullet in Common Mistakes callout — flagged for manual content edit (bullet within callout, not a standalone block)')
                break

    # ── 6-3: Remove duplicate "Let's circle back" from flashcards ──
    lesson_63 = all_lessons['lesson-6-3']
    blocks_63 = lesson_63['contentBlocks']
    for i, b in enumerate(blocks_63):
        if b.get('type') == 'flashcards':
            cards = b.get('cards', [])
            original_count = len(cards)
            cards_filtered = [c for c in cards if "circle back" not in c.get('front', '').lower()]
            if len(cards_filtered) < original_count:
                b['cards'] = cards_filtered
                log_change('lesson-6-3', 'A3-DEDUP', f'Removed duplicate "Let\'s circle back" flashcard (was in both 6-1 and 6-3)')
                changed_lessons.add('lesson-6-3')
            break

    # ── 1-2: Flag "Why Florida" for review (not moving automatically) ──
    log_change('lesson-1-2', 'A3-NOTE', '"Why Florida" section flagged for possible relocation to Module 0 — keeping in place pending review')

    return changed_lessons


# ═══════════════════════════════════════════════════════════════════════════════
# A4: TEXT/INTERACTIVE REDUNDANCY REMOVAL
# ═══════════════════════════════════════════════════════════════════════════════

def compress_text_redundancy(lesson_id, data):
    """Replace verbose text blocks with brief intros where interactives carry the detail."""
    blocks = data['contentBlocks']
    changed = False

    if lesson_id == 'lesson-0-1':
        # Remove text "Four Themes You Will See" + table "Core Themes & Common Pitfalls"
        # Keep tabs "Course Themes — Your Four Guideposts"
        # Add brief intro before tabs
        removed_titles = []
        for i in range(len(blocks) - 1, -1, -1):
            b = blocks[i]
            if b.get('type') == 'text' and 'Four Themes' in b.get('title', ''):
                removed_titles.append(blocks.pop(i).get('title', ''))
            elif b.get('type') == 'table' and 'Core Themes' in b.get('title', ''):
                removed_titles.append(blocks.pop(i).get('title', ''))

        if removed_titles:
            # Find tabs block and add intro text before it
            for i, b in enumerate(blocks):
                if b.get('type') == 'tabs' and 'Course Themes' in b.get('title', ''):
                    intro = {
                        "type": "text",
                        "id": "text-0-1-themes-intro",
                        "title": "Four Themes That Will Guide You",
                        "content": "<p>Throughout this program, every lesson connects back to four practical themes. These are not abstract ideas — they are the patterns that separate founders who succeed in the U.S. from those who lose time and money learning the hard way. Explore each theme below.</p>"
                    }
                    blocks.insert(i, intro)
                    break
            log_change(lesson_id, 'A4-REDUNDANCY', f'Removed redundant blocks: {removed_titles}. Added brief intro before tabs.')
            changed = True

    elif lesson_id == 'lesson-1-1':
        # Compress 3 entity text blocks (LLC, C-Corp, S-Corp) into one brief intro
        # Keep comparison card
        entity_indices = []
        entity_stories = []
        for i, b in enumerate(blocks):
            title = b.get('title', '')
            if b.get('type') == 'text' and any(x in title for x in ['LLC', 'C-Corp', 'S-Corp']):
                entity_indices.append(i)
                # Extract key narrative content (founder stories, analogies)
                content = b.get('content', '')
                if 'storefront' in content.lower() or 'tower' in content.lower():
                    entity_stories.append(content)

        if len(entity_indices) >= 3:
            # Remove in reverse order
            for i in sorted(entity_indices, reverse=True):
                blocks.pop(i)

            # Find comparison card and add intro before it
            for i, b in enumerate(blocks):
                if b.get('type') == 'comparison-card':
                    intro = {
                        "type": "text",
                        "id": "text-1-1-entity-intro",
                        "title": "Three Structures, Three Different Paths",
                        "content": "<p>Think of it this way: an LLC is like opening a flexible storefront — easy to set up, simple to run, and it keeps your personal assets separate from the business. A C-Corp is more like building a glass tower — more paperwork and formality, but it is the structure investors expect if you plan to raise venture capital. An S-Corp exists too, but it requires all shareholders to be U.S. citizens or residents, which rules out most international founders.</p>\n\n<p>The comparison below breaks down the key differences to help you decide which structure fits your situation.</p>"
                    }
                    blocks.insert(i, intro)
                    break
            log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed 3 entity text blocks into 1 intro paragraph. Comparison card carries detail.')
            changed = True

    elif lesson_id == 'lesson-3-1':
        # Compress opening IP text → brief intro, keep comparison card
        for i, b in enumerate(blocks):
            if b.get('type') == 'text' and 'Protecting What You Have Built' in b.get('title', ''):
                old_content = b.get('content', '')
                # Keep the Chile founder story and territoriality concept, cut the IP type descriptions
                new_content = (
                    "<p>A founder from Chile built a successful delivery app across South America. When she expanded to Florida, she discovered that her Chilean trademark registration meant nothing in the United States. Intellectual property rights are territorial — protection in one country does not automatically extend to another. If you plan to operate in the U.S., you need U.S. protection.</p>\n\n"
                    "<p>There are three main types of IP protection, each covering different aspects of your business. The comparison below explains what each one protects, what it costs, and when you need it.</p>"
                )
                b['content'] = new_content
                log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed opening text: kept Chile story + territoriality, removed IP type paragraphs (covered by comparison card)')
                changed = True
                break

    elif lesson_id == 'lesson-5-1':
        # Compress "Five Areas" text → brief intro, keep tabs
        for i, b in enumerate(blocks):
            if b.get('type') == 'text' and 'Five Areas' in b.get('title', ''):
                new_content = (
                    "<p>Walk through any outlet shopping center in Central Florida and you will notice something: even discount retailers price strategically, not cheaply. A UAE-based property management company dominant at $15/unit/month in Dubai had to reprice to $35/unit/month for U.S. managers who assumed anything under $30 was missing compliance features.</p>\n\n"
                    "<p>Pricing is just one of five areas where international products typically need adaptation for U.S. customers. Explore each area below to understand what changes and why.</p>"
                )
                b['content'] = new_content
                b['title'] = "Adaptation Starts Before You Sell"
                log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed 5-area text to 2-para intro with UAE story. Tabs carry detail.')
                changed = True
                break

    elif lesson_id == 'lesson-7-1':
        # Compress organizations text → brief intro, keep accordion
        for i, b in enumerate(blocks):
            if b.get('type') == 'text' and 'Key Organizations' in b.get('title', ''):
                new_content = (
                    "<p>A founder from Colombia spent $4,500 on a private consultant to help navigate U.S. business setup — then discovered that the Small Business Development Center at UCF offers the same guidance for free. Central Florida has several organizations specifically designed to help international founders, and most of them cost nothing.</p>\n\n"
                    "<p>Here are the five you should know. Each one serves a different purpose — explore the directory below to find the right fit for where you are right now.</p>"
                )
                b['content'] = new_content
                b['title'] = "Free Help Is Closer Than You Think"
                log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed organizations text to 2-para intro with Colombia story. Accordion carries detail.')
                changed = True
                break

    elif lesson_id == 'lesson-7-3':
        # Compress industry cluster text → brief intro, keep table
        for i, b in enumerate(blocks):
            if b.get('type') == 'text' and 'Industry Cluster Data' in b.get('title', ''):
                new_content = (
                    "<p>Central Florida's economy is not just theme parks and tourism. The region has grown distinct industry clusters, each with real revenue, job creation, and growth trajectories that matter for your market entry decision. The data below shows where the opportunities are concentrated.</p>"
                )
                b['content'] = new_content
                b['title'] = "Where the Jobs and Revenue Are"
                log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed cluster text to 1-para intro. Table carries data.')
                changed = True
                break

    elif lesson_id == 'lesson-7-4':
        # Compress city comparison text → brief intro, keep tabs
        for i, b in enumerate(blocks):
            if b.get('type') == 'text' and 'City-by-City' in b.get('title', ''):
                new_content = (
                    "<p>International founders typically consider four U.S. entry points: Central Florida, Miami, New York City, and Austin or Silicon Valley. Each has real trade-offs in cost, access, culture, and infrastructure. The comparison below breaks down what each market actually offers — and where Central Florida has an edge.</p>"
                )
                b['content'] = new_content
                b['title'] = "How Central Florida Compares"
                log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed city comparison text to 1-para intro. Tabs carry detail.')
                changed = True
                break

    elif lesson_id == 'lesson-4-2':
        # Compress visa text → brief intro, keep accordion
        for i, b in enumerate(blocks):
            if b.get('type') == 'text' and 'Four Backstage Passes' in b.get('title', ''):
                new_content = (
                    "<p>Think of each visa as a different backstage pass to the U.S. market. Each one opens different doors, costs different amounts, and takes different timelines to obtain. The four pathways below are the ones most commonly used by international founders — explore each one to understand the requirements, costs, and realistic timelines.</p>"
                )
                b['content'] = new_content
                b['title'] = "Four Pathways Into the U.S. Market"
                log_change(lesson_id, 'A4-REDUNDANCY', f'Compressed visa text to 1-para intro with backstage metaphor. Accordion carries detail.')
                changed = True
                break

    return changed


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    all_lesson_ids = sorted([
        p.stem for p in LESSONS_DIR.glob('lesson-*.json')
    ])

    print(f"Processing {len(all_lesson_ids)} lessons...\n")

    # Load all lessons
    all_lessons = {}
    for lid in all_lesson_ids:
        all_lessons[lid] = load_lesson(lid)

    # ── A3: Relocations (must happen before KC consolidation) ──
    print("═══ A3: CONTENT RELOCATION ═══")
    relocated = relocate_content(all_lessons)

    # ── A1: KC Consolidation ──
    print("\n═══ A1: KC CONSOLIDATION ═══")
    for lid in all_lesson_ids:
        consolidate_kc(lid, all_lessons[lid])

    # ── A2: Exercise/Reflection Consolidation ──
    print("\n═══ A2: EXERCISE/REFLECTION CONSOLIDATION ═══")
    for lid in all_lesson_ids:
        consolidate_exercise_reflection(lid, all_lessons[lid])

    # ── A4: Text/Interactive Redundancy ──
    print("\n═══ A4: TEXT/INTERACTIVE REDUNDANCY ═══")
    for lid in all_lesson_ids:
        compress_text_redundancy(lid, all_lessons[lid])

    # ── Save all ──
    print(f"\n{'='*60}")
    print(f"Total changes: {len(changes_log)}")

    if DRY_RUN:
        print("\n=== DRY RUN COMPLETE === Run with --apply to write changes.")
    else:
        print("\nSaving all lessons...")
        for lid in all_lesson_ids:
            save_lesson(lid, all_lessons[lid])
        print(f"Saved {len(all_lesson_ids)} lesson files.")

    # Summary
    print(f"\n{'='*60}")
    print("CHANGE SUMMARY:")
    categories = {}
    for lid, cat, desc in changes_log:
        categories.setdefault(cat, []).append((lid, desc))
    for cat in sorted(categories.keys()):
        items = categories[cat]
        print(f"\n  {cat} ({len(items)} changes):")
        for lid, desc in items:
            print(f"    {lid}: {desc}")


if __name__ == '__main__':
    main()
