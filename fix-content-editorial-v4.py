#!/usr/bin/env python3
"""
Editorial fix script V4 for UCF Business Course.
Comprehensive fixes from full QA/editorial/instructional-design audit.

Phases:
  A: Critical fixes (typos, duplicate content, wrong URLs)
  B: Metaphor/analogy cleanup (campus, launchpad, mapped, get there)
  C: Redundancy fixes (duplicate sentences, repeated stories)
  D: Grammar and sentence structure fixes
  E: Instructional design fixes (wrong lesson content, key takeaway focus)
  F: Timeline/data consistency fixes
  G: Filler phrase cleanup

Updates ALL THREE file layers:
  1. phase1-lessons/{lessonId}.json
  2. generated/content-phase1-module{N}.json  (no hyphen - HTML generator)
  3. generated/content-phase1-module-{N}.json (hyphen - Visualizer, modules 0 & 2)

Usage:
  python fix-content-editorial-v4.py              # apply all phases
  python fix-content-editorial-v4.py --dry-run    # preview changes only
  python fix-content-editorial-v4.py --phase A    # run single phase
"""
import json, sys, io, os, argparse, re, copy

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

# ── FILE LAYER MAP ─────────────────────────────────────────────────────────
LESSON_FILES = {
    'lesson-0-1': [
        'phase1-lessons/lesson-0-1.json',
        'generated/content-phase1-module0.json',
        'generated/content-phase1-module-0.json',
    ],
    'lesson-1-1': ['phase1-lessons/lesson-1-1.json', 'generated/content-phase1-module1.json'],
    'lesson-1-2': ['phase1-lessons/lesson-1-2.json', 'generated/content-phase1-module1.json'],
    'lesson-1-3': ['phase1-lessons/lesson-1-3.json', 'generated/content-phase1-module1.json'],
    'lesson-2-1': [
        'phase1-lessons/lesson-2-1.json',
        'generated/content-phase1-module2.json',
        'generated/content-phase1-module-2.json',
    ],
    'lesson-2-2': [
        'phase1-lessons/lesson-2-2.json',
        'generated/content-phase1-module2.json',
        'generated/content-phase1-module-2.json',
    ],
    'lesson-2-3': [
        'phase1-lessons/lesson-2-3.json',
        'generated/content-phase1-module2.json',
        'generated/content-phase1-module-2.json',
    ],
    'lesson-3-1': ['phase1-lessons/lesson-3-1.json', 'generated/content-phase1-module3.json'],
    'lesson-3-2': ['phase1-lessons/lesson-3-2.json', 'generated/content-phase1-module3.json'],
    'lesson-3-3': ['phase1-lessons/lesson-3-3.json', 'generated/content-phase1-module3.json'],
    'lesson-4-1': ['phase1-lessons/lesson-4-1.json', 'generated/content-phase1-module4.json'],
    'lesson-4-2': ['phase1-lessons/lesson-4-2.json', 'generated/content-phase1-module4.json'],
    'lesson-4-3': ['phase1-lessons/lesson-4-3.json', 'generated/content-phase1-module4.json'],
    'lesson-5-1': ['phase1-lessons/lesson-5-1.json', 'generated/content-phase1-module5.json'],
    'lesson-5-2': ['phase1-lessons/lesson-5-2.json', 'generated/content-phase1-module5.json'],
    'lesson-6-1': ['phase1-lessons/lesson-6-1.json', 'generated/content-phase1-module6.json'],
    'lesson-6-2': ['phase1-lessons/lesson-6-2.json', 'generated/content-phase1-module6.json'],
    'lesson-6-3': ['phase1-lessons/lesson-6-3.json', 'generated/content-phase1-module6.json'],
    'lesson-7-1': ['phase1-lessons/lesson-7-1.json', 'generated/content-phase1-module7.json'],
    'lesson-7-2': ['phase1-lessons/lesson-7-2.json', 'generated/content-phase1-module7.json'],
    'lesson-7-3': ['phase1-lessons/lesson-7-3.json', 'generated/content-phase1-module7.json'],
    'lesson-7-4': ['phase1-lessons/lesson-7-4.json', 'generated/content-phase1-module7.json'],
    'lesson-7-5': ['phase1-lessons/lesson-7-5.json'],
    'lesson-8-1': ['phase1-lessons/lesson-8-1.json', 'generated/content-phase1-module8.json'],
    'lesson-8-2': ['phase1-lessons/lesson-8-2.json', 'generated/content-phase1-module8.json'],
    'lesson-8-3': ['phase1-lessons/lesson-8-3.json', 'generated/content-phase1-module8.json'],
}

# ── UTILITIES ──────────────────────────────────────────────────────────────

_file_cache = {}
_dirty_files = set()
changed_blocks = {}
fix_count = 0


def load_file(rel_path):
    full = os.path.join(BASE, rel_path)
    if rel_path not in _file_cache:
        if not os.path.exists(full):
            return None
        _file_cache[rel_path] = json.load(open(full, encoding='utf-8'))
    return _file_cache[rel_path]


def mark_dirty(rel_path):
    _dirty_files.add(rel_path.replace('\\', '/'))


def save_all(dry_run=False):
    count = 0
    for rel_path in sorted(_dirty_files):
        full = os.path.join(BASE, rel_path)
        if dry_run:
            print(f'  [DRY-RUN] Would save: {rel_path}')
        else:
            with open(full, 'w', encoding='utf-8') as f:
                json.dump(_file_cache[rel_path], f, ensure_ascii=False, indent=2)
            print(f'  SAVED: {rel_path}')
        count += 1
    return count


def find_lesson(data, lesson_id):
    lessons = data.get('lessons', [data])
    for lesson in lessons:
        if lesson.get('lessonId') == lesson_id:
            return lesson
    return None


def find_block(lesson, block_id):
    for b in lesson.get('contentBlocks', []):
        if b.get('id') == block_id:
            return b
    return None


def record_change(lesson_id, block_id):
    changed_blocks.setdefault(lesson_id, set()).add(block_id)


def apply_to_all_files(lesson_id, block_id, apply_fn, dry_run=False):
    global fix_count
    files = LESSON_FILES.get(lesson_id, [])
    applied = False
    for fpath in files:
        data = load_file(fpath)
        if data is None:
            continue
        lesson = find_lesson(data, lesson_id)
        if lesson is None:
            continue
        block = find_block(lesson, block_id)
        if block is None:
            continue
        if apply_fn(block, fpath):
            mark_dirty(fpath)
            record_change(lesson_id, block_id)
            applied = True
    if applied:
        fix_count += 1
    return applied


def sub_fix(block, old, new, field='content'):
    val = block.get(field, '')
    if old in val:
        block[field] = val.replace(old, new)
        return True
    return False


def title_fix(block, old, new):
    return sub_fix(block, old, new, field='title')


def apply_to_lesson_objectives(lesson_id, old_text, new_text, dry_run=False):
    global fix_count
    files = LESSON_FILES.get(lesson_id, [])
    applied = False
    for fpath in files:
        data = load_file(fpath)
        if data is None:
            continue
        lesson = find_lesson(data, lesson_id)
        if lesson is None:
            continue
        objs = lesson.get('objectives', [])
        for i, obj in enumerate(objs):
            if old_text in obj:
                objs[i] = obj.replace(old_text, new_text)
                mark_dirty(fpath)
                applied = True
    if applied:
        fix_count += 1
        print(f'  FIX objective in {lesson_id}: "{old_text[:60]}..."')
    return applied


def apply_to_accordion_section(lesson_id, block_id, section_heading, old_text, new_text, dry_run=False):
    """Fix content inside a specific accordion section."""
    global fix_count
    files = LESSON_FILES.get(lesson_id, [])
    applied = False
    for fpath in files:
        data = load_file(fpath)
        if data is None:
            continue
        lesson = find_lesson(data, lesson_id)
        if lesson is None:
            continue
        block = find_block(lesson, block_id)
        if block is None:
            continue
        sections = block.get('sections', [])
        for sec in sections:
            if sec.get('heading') == section_heading:
                content = sec.get('content', '')
                if old_text in content:
                    sec['content'] = content.replace(old_text, new_text)
                    mark_dirty(fpath)
                    record_change(lesson_id, block_id)
                    applied = True
    if applied:
        fix_count += 1
        print(f'  FIX accordion {block_id}/{section_heading}: "{old_text[:50]}..."')
    return applied


def apply_to_infographic_step(lesson_id, block_id, step_idx, field, old_text, new_text, dry_run=False):
    """Fix a field in a specific infographic step."""
    global fix_count
    files = LESSON_FILES.get(lesson_id, [])
    applied = False
    for fpath in files:
        data = load_file(fpath)
        if data is None:
            continue
        lesson = find_lesson(data, lesson_id)
        if lesson is None:
            continue
        block = find_block(lesson, block_id)
        if block is None:
            continue
        steps = block.get('steps', [])
        if step_idx < len(steps):
            val = steps[step_idx].get(field, '')
            if old_text in val:
                steps[step_idx][field] = val.replace(old_text, new_text)
                mark_dirty(fpath)
                record_change(lesson_id, block_id)
                applied = True
    if applied:
        fix_count += 1
        print(f'  FIX infographic {block_id} step[{step_idx}].{field}: "{old_text[:50]}..."')
    return applied


def apply_kc_question_replacement(lesson_id, block_id, q_index, new_question, dry_run=False):
    """Replace an entire knowledge-check question by index."""
    global fix_count
    files = LESSON_FILES.get(lesson_id, [])
    applied = False
    for fpath in files:
        data = load_file(fpath)
        if data is None:
            continue
        lesson = find_lesson(data, lesson_id)
        if lesson is None:
            continue
        block = find_block(lesson, block_id)
        if block is None:
            continue
        questions = block.get('questions', [])
        if q_index < len(questions):
            questions[q_index] = new_question
            mark_dirty(fpath)
            record_change(lesson_id, block_id)
            applied = True
    if applied:
        fix_count += 1
        print(f'  FIX kc question {block_id} Q{q_index+1}')
    return applied


# ═══════════════════════════════════════════════════════════════════════════
# PHASE A: CRITICAL FIXES (typos, wrong URLs, duplicate content)
# ═══════════════════════════════════════════════════════════════════════════

def phase_A(dry_run=False):
    print('\n=== PHASE A: Critical Fixes ===')

    # A1: lesson-8-3 objectives "what what" typo
    print('  A1: Fix "what what" typo in lesson-8-3 objectives')
    apply_to_lesson_objectives('lesson-8-3',
        'Understand what what UCF BIP offers',
        'Understand what UCF BIP offers',
        dry_run)

    # A2: int-7-1-1 wrong SBDC URL (floridaSBDC.org → sbdcorlando.com)
    print('  A2: Fix SBDC URL in int-7-1-1')
    apply_to_accordion_section('lesson-7-1', 'int-7-1-1',
        'Florida SBDC at UCF',
        'floridaSBDC.org',
        'sbdcorlando.com',
        dry_run)

    # A3: Duplicate Colombian founder story — remove from text-7-1-1, keep in text-7-1-2
    # text-7-1-1 has the story as paragraph 2. Remove it and merge context.
    print('  A3: Remove duplicate Colombian founder story from text-7-1-1')
    apply_to_all_files('lesson-7-1', 'text-7-1-1', lambda b, f: sub_fix(b,
        '<p>A Colombian founder spent $4,500 on a business consultant to put together a market entry plan for Central Florida. Three months later, she discovered the SBDC at UCF offers the same service, for free. She had been spending money on private help without realizing the whole support network was already there.</p>',
        '<p>Many international founders spend thousands on private consultants for services that are available for free through these organizations. The resources exist specifically for founders like you.</p>'
    ), dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE B: METAPHOR/ANALOGY CLEANUP
# ═══════════════════════════════════════════════════════════════════════════

def phase_B(dry_run=False):
    print('\n=== PHASE B: Metaphor/Analogy Cleanup ===')

    # B1: kt-0-1-1 "you've mapped it" map metaphor
    print('  B1: Fix "mapped it" in kt-0-1-1')
    apply_to_all_files('lesson-0-1', 'kt-0-1-1', lambda b, f: sub_fix(b,
        "Think of this as your starting point. You haven\u2019t entered the U.S. market yet\u2014you\u2019ve mapped it.",
        "This is your starting point. You have not entered the U.S. market yet, but you now understand what is ahead."
    ), dry_run)
    # Also try straight quotes/hyphens variant
    apply_to_all_files('lesson-0-1', 'kt-0-1-1', lambda b, f: sub_fix(b,
        "Think of this as your starting point. You haven't entered the U.S. market yet—you've mapped it.",
        "This is your starting point. You have not entered the U.S. market yet, but you now understand what is ahead."
    ), dry_run)

    # B2: text-8-1-1 title "Arriving at UCF Headquarters"
    print('  B2: Fix title "Arriving at UCF Headquarters" in text-8-1-1')
    apply_to_all_files('lesson-8-1', 'text-8-1-1', lambda b, f: title_fix(b,
        'Arriving at UCF Headquarters: What You Now Know',
        'Self-Assessment: What You Now Know'
    ), dry_run)

    # B3: text-8-2-1 title "Campus HQ"
    print('  B3: Fix title "Campus HQ" in text-8-2-1')
    apply_to_all_files('lesson-8-2', 'text-8-2-1', lambda b, f: title_fix(b,
        'Your Takeaway Resources from Campus HQ',
        'Your Takeaway Resources'
    ), dry_run)

    # B4: text-8-2-1 "walking through" metaphor
    print('  B4: Fix "walking through" in text-8-2-1')
    apply_to_all_files('lesson-8-2', 'text-8-2-1', lambda b, f: sub_fix(b,
        'think of this as walking through the',
        'think of this as reviewing the'
    ), dry_run)

    # B5: callout-8-1-1 "this campus" metaphor
    print('  B5: Fix "this campus" in callout-8-1-1')
    apply_to_all_files('lesson-8-1', 'callout-8-1-1', lambda b, f: sub_fix(b,
        'Central Florida, and this campus in particular, has built an ecosystem',
        'Central Florida has built an ecosystem'
    ), dry_run)

    # B6: text-8-2-4 "campus directory" metaphor
    print('  B6: Fix "campus directory" in text-8-2-4')
    apply_to_all_files('lesson-8-2', 'text-8-2-4', lambda b, f: sub_fix(b,
        'This is your campus directory, every support organization, one call away.',
        'This guide puts every support organization one call away.'
    ), dry_run)

    # B7: kt-8-3-1 "get there" journey metaphor
    print('  B7: Fix "get there" in kt-8-3-1')
    apply_to_all_files('lesson-8-3', 'kt-8-3-1', lambda b, f: sub_fix(b,
        'the UCF BIP team is ready to help you get there.',
        'the UCF BIP team is ready to help you succeed.'
    ), dry_run)

    # B8: kt-7-2-1 "launchpad" metaphor
    print('  B8: Fix "launchpad" in kt-7-2-1')
    apply_to_all_files('lesson-7-2', 'kt-7-2-1', lambda b, f: sub_fix(b,
        'use the community as your launchpad.',
        'use the community as your support system.'
    ), dry_run)

    # B9: kt-8-3-1 "finish line" + "starting point" journey language
    print('  B9: Fix "finish line/starting point" in kt-8-3-1')
    apply_to_all_files('lesson-8-3', 'kt-8-3-1', lambda b, f: sub_fix(b,
        'You completed this program not as a finish line, but as a starting point.',
        'Completing this program is the beginning, not the end.'
    ), dry_run)

    # B10: text-8-2-1 "heading out" journey language
    print('  B10: Fix "heading out" in text-8-2-1')
    apply_to_all_files('lesson-8-2', 'text-8-2-1', lambda b, f: sub_fix(b,
        'resource center before heading out.',
        'resource center before you finish.'
    ), dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE C: REDUNDANCY FIXES
# ═══════════════════════════════════════════════════════════════════════════

def phase_C(dry_run=False):
    print('\n=== PHASE C: Redundancy Fixes ===')

    # C1: text-1-2-1 SunBiz defined twice back-to-back
    print('  C1: Fix SunBiz double definition in text-1-2-1')
    apply_to_all_files('lesson-1-2', 'text-1-2-1', lambda b, f: sub_fix(b,
        "SunBiz (sunbiz.org) is Florida\u2019s official portal for registering business entities, filing annual reports, and updating records. Sunbiz.org is Florida\u2019s online business registration portal. File your information and your business is officially on record.",
        "SunBiz (sunbiz.org) is Florida\u2019s official portal for registering business entities, filing annual reports, and updating records. File your information and your business is officially on record."
    ), dry_run)
    # Straight quote variant
    apply_to_all_files('lesson-1-2', 'text-1-2-1', lambda b, f: sub_fix(b,
        "SunBiz (sunbiz.org) is Florida's official portal for registering business entities, filing annual reports, and updating records. Sunbiz.org is Florida's online business registration portal. File your information and your business is officially on record.",
        "SunBiz (sunbiz.org) is Florida's official portal for registering business entities, filing annual reports, and updating records. File your information and your business is officially on record."
    ), dry_run)

    # C2: kt-1-2-1 "simplest" + "straightforward" redundancy
    print('  C2: Fix simplest/straightforward redundancy in kt-1-2-1')
    apply_to_all_files('lesson-1-2', 'kt-1-2-1', lambda b, f: sub_fix(b,
        'The takeaway is this: filing with SunBiz is one of the simplest steps in the process. Florida registration through SunBiz is one of the most straightforward steps in your U.S. setup process.',
        'Filing with SunBiz is one of the simplest steps in your U.S. setup process.'
    ), dry_run)

    # C3: text-1-3-0 same setup stated twice
    print('  C3: Fix double setup statement in text-1-3-0')
    apply_to_all_files('lesson-1-3', 'text-1-3-0', lambda b, f: sub_fix(b,
        'Your entity is registered and your EIN is on the way. Now you need a U.S. bank account, and for international founders, this is one of the most frustrating steps in the process.</p>\n\n<p>You filed your LLC, you have your EIN, and now a bank is asking for papers you have never heard of, or telling you they cannot work with foreign-owned entities.',
        'Your entity is registered and your EIN is on the way. Now you need a U.S. bank account. You start reaching out to banks, and they ask for papers you have never heard of, or tell you they cannot work with foreign-owned entities.'
    ), dry_run)

    # C4: text-1-3-4 "payment processors" repeated
    print('  C4: Fix payment processors redundancy in text-1-3-4')
    apply_to_all_files('lesson-1-3', 'text-1-3-4', lambda b, f: sub_fix(b,
        'payment processors offer an alternative for accepting payments. Payment processors can help bridge the gap so you can start accepting payments:',
        'payment processors can help bridge the gap:'
    ), dry_run)

    # C5: text-2-2-1 $3,800 story told twice — remove the teaser, keep the detailed version
    print('  C5: Remove duplicate $3,800 teaser in text-2-2-1')
    apply_to_all_files('lesson-2-2', 'text-2-2-1', lambda b, f: sub_fix(b,
        "</p>\n\n<p>Did you know that one founder owed $3,800 in penalties because she did not register for a free certificate before collecting sales tax? The rules are simple once you know them, but the cost of not knowing is steep.</p>\n\n<p>",
        "</p>\n\n<p>"
    ), dry_run)

    # C6: text-2-3-1 "This is the stop that trips up" — redundant + "stop" metaphor
    print('  C6: Fix "stop" metaphor + redundancy in text-2-3-1')
    apply_to_all_files('lesson-2-3', 'text-2-3-1', lambda b, f: sub_fix(b,
        'banking. This is the stop that trips up more international founders than any other.',
        'banking.'
    ), dry_run)

    # C7: text-4-3-1 redundant warm-up — merge paragraphs 1-2 into one
    print('  C7: Fix redundant warm-up in text-4-3-1')
    apply_to_all_files('lesson-4-3', 'text-4-3-1', lambda b, f: sub_fix(b,
        '<p>Now that you understand visa requirements, it is time to look at what it actually costs to keep the team running.</p>\n\n<p>Every business has an operating budget that goes well beyond wages. There are taxes, insurance premiums, compliance costs, and benefits. Hiring in the U.S. works this way: salary is just the starting number. The real cost includes a stack of taxes, insurance, and obligations that add up fast.</p>',
        '<p>Now that you understand visa requirements, it is time to look at what it actually costs to keep a team running. Salary is just the starting number. The real cost includes taxes, insurance, and obligations that add up fast.</p>'
    ), dry_run)

    # C8: text-4-3-1 "The base salary is just the starting point" duplicates "salary is just the starting number"
    print('  C8: Fix duplicate "starting point" in text-4-3-1')
    apply_to_all_files('lesson-4-3', 'text-4-3-1', lambda b, f: sub_fix(b,
        'What does this actually mean day to day? The base salary is just the starting point. Every employee comes with additional costs. In many countries, employer costs are a single rate.',
        'In many countries, employer costs are a single rate.'
    ), dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE D: GRAMMAR AND SENTENCE STRUCTURE FIXES
# ═══════════════════════════════════════════════════════════════════════════

def phase_D(dry_run=False):
    print('\n=== PHASE D: Grammar and Structure Fixes ===')

    # D1: text-1-2-0 sentence fragment "C-Corp. It is time"
    print('  D1: Fix sentence fragment in text-1-2-0')
    apply_to_all_files('lesson-1-2', 'text-1-2-0', lambda b, f: sub_fix(b,
        'whether an LLC or a C-Corp. It is time',
        'whether an LLC or a C-Corp, it is time'
    ), dry_run)
    # Also handle em-dash variant
    apply_to_all_files('lesson-1-2', 'text-1-2-0', lambda b, f: sub_fix(b,
        'whether an LLC or a C\u2011Corp. It is time',
        'whether an LLC or a C\u2011Corp, it is time'
    ), dry_run)

    # D2: callout-1-3-2 incomplete sentence "Notice how monthly maintenance fees..."
    print('  D2: Fix incomplete sentence in callout-1-3-2')
    apply_to_all_files('lesson-1-3', 'callout-1-3-2', lambda b, f: sub_fix(b,
        'Notice how monthly maintenance fees, wire transfer costs, minimum balance requirements. These may seem small individually',
        'Monthly maintenance fees, wire transfer costs, and minimum balance requirements may seem small individually'
    ), dry_run)

    # D3: text-2-3-2 "Orlando metro" → "Central Florida"
    print('  D3: Fix "Orlando metro" in text-2-3-2')
    apply_to_all_files('lesson-2-3', 'text-2-3-2', lambda b, f: sub_fix(b,
        'the Orlando metro has over 400 bank branches',
        'Central Florida has over 400 bank branches'
    ), dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE E: INSTRUCTIONAL DESIGN FIXES
# ═══════════════════════════════════════════════════════════════════════════

def phase_E(dry_run=False):
    print('\n=== PHASE E: Instructional Design Fixes ===')

    # E1: text-3-2-1 — contracts example in insurance lesson
    # Replace the Costa Rica contract story with an insurance-relevant opening example
    print('  E1: Fix contracts example in insurance lesson text-3-2-1')
    apply_to_all_files('lesson-3-2', 'text-3-2-1', lambda b, f: sub_fix(b,
        '<p>A founder from Costa Rica lost $22,000 because he closed a deal with a handshake instead of a contract. In the U.S., that handshake is worth almost nothing \u2014 three months later, the distributor changed payment terms and refused to pay outstanding invoices. Without a signed contract, the founder had no legal leverage. This is why contracts matter (we cover contract types in the next lesson), but first, you need to understand the insurance and risk management foundations that protect your business every day.</p>',
        '<p>A Brazilian founder renting a shared office in Orlando had a client trip over an extension cord during a meeting. The medical bill was $14,000. Without general liability insurance, he paid it out of pocket. Insurance is the safety net that protects your business from the risks you cannot predict, and it needs to be in place before you start operating.</p>'
    ), dry_run)
    # Try straight dash variant
    apply_to_all_files('lesson-3-2', 'text-3-2-1', lambda b, f: sub_fix(b,
        '<p>A founder from Costa Rica lost $22,000 because he closed a deal with a handshake instead of a contract. In the U.S., that handshake is worth almost nothing — three months later, the distributor changed payment terms and refused to pay outstanding invoices. Without a signed contract, the founder had no legal leverage. This is why contracts matter (we cover contract types in the next lesson), but first, you need to understand the insurance and risk management foundations that protect your business every day.</p>',
        '<p>A Brazilian founder renting a shared office in Orlando had a client trip over an extension cord during a meeting. The medical bill was $14,000. Without general liability insurance, he paid it out of pocket. Insurance is the safety net that protects your business from the risks you cannot predict, and it needs to be in place before you start operating.</p>'
    ), dry_run)

    # E2: kt-3-2-1 — key takeaway leads with contract advice in insurance lesson
    print('  E2: Fix kt-3-2-1 leading with contract advice')
    apply_to_all_files('lesson-3-2', 'kt-3-2-1', lambda b, f: sub_fix(b,
        'The takeaway is clear: get your contracts in writing, every time, with every partner. Carry general liability insurance from day one',
        'Carry general liability insurance from day one'
    ), dry_run)

    # E3: kc-3-2 Q3 — NDA question belongs in lesson 3-3, not 3-2
    # Replace with an insurance-relevant question
    print('  E3: Replace NDA question in kc-3-2 with insurance question')
    new_q3 = {
        "stem": "A founder from Peru is opening a small food packaging operation in Central Florida. She has general liability insurance and product liability insurance. Her lease requires one additional document before she can move in. What is it?",
        "options": [
            "A Certificate of Insurance (COI) naming the landlord as an additional insured",
            "A copy of her LLC operating agreement",
            "Proof of workers' compensation insurance",
            "A signed non-disclosure agreement with the landlord"
        ],
        "correctAnswer": 0,
        "explanation": "Most commercial landlords require a Certificate of Insurance (COI) before allowing a tenant to occupy the space. The COI proves you carry general liability coverage and typically names the landlord as an additional insured party. This is standard practice in U.S. commercial leasing."
    }
    apply_kc_question_replacement('lesson-3-2', 'kc-3-2', 2, new_q3, dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE F: TIMELINE AND DATA CONSISTENCY FIXES
# ═══════════════════════════════════════════════════════════════════════════

def phase_F(dry_run=False):
    print('\n=== PHASE F: Timeline/Data Consistency Fixes ===')

    # F1: int-4-2-1 E-2 accordion says "2-4 months" but table says "4-8 months"
    # The table is more conservative/accurate. Update accordion to match.
    print('  F1: Fix E-2 timeline in int-4-2-1 accordion')
    apply_to_accordion_section('lesson-4-2', 'int-4-2-1',
        'E-2 \u2014 Treaty Investor',
        '2\u20134 months (consular processing)',
        '4\u20138 months (consular processing)',
        dry_run)
    # Try straight dash variants
    apply_to_accordion_section('lesson-4-2', 'int-4-2-1',
        'E-2 — Treaty Investor',
        '2–4 months (consular processing)',
        '4–8 months (consular processing)',
        dry_run)
    apply_to_accordion_section('lesson-4-2', 'int-4-2-1',
        'E-2 — Treaty Investor',
        '2-4 months (consular processing)',
        '4-8 months (consular processing)',
        dry_run)

    # F2: int-4-2-1 L-1A accordion says "3-8 months" but table says "4-8 months"
    print('  F2: Fix L-1A timeline in int-4-2-1 accordion')
    apply_to_accordion_section('lesson-4-2', 'int-4-2-1',
        'L-1A \u2014 Intracompany Transfer',
        '3\u20138 months',
        '4\u20138 months (standard); 15 business days (premium processing)',
        dry_run)
    apply_to_accordion_section('lesson-4-2', 'int-4-2-1',
        'L-1A — Intracompany Transfer',
        '3–8 months',
        '4–8 months (standard); 15 business days (premium processing)',
        dry_run)
    apply_to_accordion_section('lesson-4-2', 'int-4-2-1',
        'L-1A — Intracompany Transfer',
        '3-8 months',
        '4-8 months (standard); 15 business days (premium processing)',
        dry_run)

    # F3: ig-1-2-sunbiz step 1 "Most international founders" → "Many"
    print('  F3: Fix "Most" in ig-1-2-sunbiz')
    apply_to_infographic_step('lesson-1-2', 'ig-1-2-sunbiz', 0, 'desc',
        'Most international founders choose LLC.',
        'Many international founders choose LLC.',
        dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE G: FILLER PHRASE CLEANUP
# ═══════════════════════════════════════════════════════════════════════════

def phase_G(dry_run=False):
    print('\n=== PHASE G: Filler Phrase Cleanup ===')

    # G1: text-1-2-1 "Here's how this plays out. Before you begin"
    print('  G1: Remove filler in text-1-2-1')
    apply_to_all_files('lesson-1-2', 'text-1-2-1', lambda b, f: sub_fix(b,
        "Here\u2019s how this plays out. Before you begin",
        "Before you begin"
    ), dry_run)
    apply_to_all_files('lesson-1-2', 'text-1-2-1', lambda b, f: sub_fix(b,
        "Here's how this plays out. Before you begin",
        "Before you begin"
    ), dry_run)

    # G2: text-1-3-4 "Let's put this in perspective. <strong>Important:</strong>"
    print('  G2: Remove filler in text-1-3-4')
    apply_to_all_files('lesson-1-3', 'text-1-3-4', lambda b, f: sub_fix(b,
        "Let\u2019s put this in perspective. <strong>Important:</strong>",
        "<strong>Important:</strong>"
    ), dry_run)
    apply_to_all_files('lesson-1-3', 'text-1-3-4', lambda b, f: sub_fix(b,
        "Let's put this in perspective. <strong>Important:</strong>",
        "<strong>Important:</strong>"
    ), dry_run)

    # G3: text-2-2-1 "Here is the practical takeaway. An Argentine founder"
    print('  G3: Remove filler in text-2-2-1')
    apply_to_all_files('lesson-2-2', 'text-2-2-1', lambda b, f: sub_fix(b,
        'Here is the practical takeaway. An Argentine founder',
        'An Argentine founder'
    ), dry_run)

    # G4: text-2-3-2 "Here\u2019s the path to build credit:" → "Here is how to build credit:"
    print('  G4: Clean up filler in text-2-3-2')
    apply_to_all_files('lesson-2-3', 'text-2-3-2', lambda b, f: sub_fix(b,
        "Here\u2019s the path to build credit:",
        "Here is how to build credit:"
    ), dry_run)
    apply_to_all_files('lesson-2-3', 'text-2-3-2', lambda b, f: sub_fix(b,
        "Here's the path to build credit:",
        "Here is how to build credit:"
    ), dry_run)

    # G5: text-2-3-2 "Here is the practical takeaway. <strong>Step 1"
    print('  G5: Remove filler in text-2-3-2')
    apply_to_all_files('lesson-2-3', 'text-2-3-2', lambda b, f: sub_fix(b,
        "Here is the practical takeaway. <strong>Step 1",
        "<strong>Step 1"
    ), dry_run)

    # G6: kt-3-2-1 "The takeaway is clear:" (already partially fixed in E2, catch remaining)
    print('  G6: Remove "The takeaway is clear:" if still present')
    apply_to_all_files('lesson-3-2', 'kt-3-2-1', lambda b, f: sub_fix(b,
        'The takeaway is clear: ',
        ''
    ), dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='UCF Business Course editorial fix v4')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--phase', type=str, help='Run single phase (A-G)')
    args = parser.parse_args()

    phases = {
        'A': phase_A, 'B': phase_B, 'C': phase_C,
        'D': phase_D, 'E': phase_E, 'F': phase_F, 'G': phase_G,
    }

    if args.phase:
        p = args.phase.upper()
        if p not in phases:
            print(f'Unknown phase: {p}. Valid: {", ".join(phases.keys())}')
            sys.exit(1)
        phases[p](args.dry_run)
    else:
        for name, fn in phases.items():
            fn(args.dry_run)

    print(f'\n=== SUMMARY ===')
    print(f'Total fixes applied: {fix_count}')
    print(f'Blocks changed: {sum(len(v) for v in changed_blocks.values())}')
    print(f'Lessons affected: {len(changed_blocks)}')

    if _dirty_files:
        print(f'\n=== SAVING {len(_dirty_files)} FILES ===')
        save_all(args.dry_run)

    # Write manifest
    manifest = {lid: sorted(list(bids)) for lid, bids in sorted(changed_blocks.items())}
    manifest_path = os.path.join(BASE, 'changed-blocks-manifest-v4.json')
    if not args.dry_run:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f'\nManifest written to: changed-blocks-manifest-v4.json')
    else:
        print(f'\n[DRY-RUN] Would write manifest: changed-blocks-manifest-v4.json')
        print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
