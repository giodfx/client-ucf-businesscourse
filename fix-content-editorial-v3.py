#!/usr/bin/env python3
"""
Editorial fix script V3 for UCF Business Course.
COMPREHENSIVE scan-and-fix for ALL remaining metaphor language + grammar errors.

This is the THIRD and FINAL pass. Fixes:
  Phase A: Module 1 — storefront metaphor in text-1-2-2
  Phase B: Module 2 — "Financial District" title + "the Central Florida" grammar
  Phase C: Module 3 — "Space Center" in title
  Phase D: Module 4 — key takeaway metaphors + grammar errors
  Phase E: Module 6 — ALL beach/ocean/current/tide/swim/undertow/sandbar metaphors
  Phase F: Module 7 — ALL spring/river/current/flow metaphors + grammar errors
  Phase G: Module 8 — headquarters/journey/map/route language
  Phase H: Module 6 text-6-3-2 — "calm surface" metaphor

Updates ALL THREE file layers:
  1. phase1-lessons/{lessonId}.json
  2. generated/content-phase1-module{N}.json  (no hyphen - HTML generator)
  3. generated/content-phase1-module-{N}.json (hyphen - Visualizer, modules 0 & 2)

Usage:
  python fix-content-editorial-v3.py              # apply all phases
  python fix-content-editorial-v3.py --dry-run    # preview changes only
  python fix-content-editorial-v3.py --phase A    # run single phase
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
    """Replace substring in block field. Returns True if changed."""
    val = block.get(field, '')
    if old in val:
        block[field] = val.replace(old, new)
        return True
    return False


def title_fix(block, old, new):
    """Replace substring in block title."""
    return sub_fix(block, old, new, field='title')


def fix_objective(lesson, old, new):
    """Replace substring in lesson objectives list."""
    objs = lesson.get('objectives', [])
    for i, obj in enumerate(objs):
        if old in obj:
            objs[i] = obj.replace(old, new)
            return True
    return False


def apply_to_lesson_objectives(lesson_id, old_text, new_text, dry_run=False):
    """Apply a fix to lesson-level objectives across all files."""
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
        if fix_objective(lesson, old_text, new_text):
            mark_dirty(fpath)
            applied = True
    if applied:
        fix_count += 1
        print(f'  FIX objective in {lesson_id}: "{old_text[:50]}..."')
    return applied


def apply_to_module_description(module_num, old_text, new_text, dry_run=False):
    """Fix module-level description field."""
    global fix_count
    applied = False
    nohyphen = f'generated/content-phase1-module{module_num}.json'
    hyphen = f'generated/content-phase1-module-{module_num}.json'
    for fpath in [nohyphen, hyphen]:
        data = load_file(fpath)
        if data is None:
            continue
        desc = data.get('description', '')
        if old_text in desc:
            data['description'] = desc.replace(old_text, new_text)
            mark_dirty(fpath)
            applied = True
            print(f'  FIX module description in {fpath}')
    if applied:
        fix_count += 1
    return applied


def apply_to_tab_content(lesson_id, block_id, tab_label, old_text, new_text, dry_run=False):
    """Fix content inside a specific tab of a tabs block."""
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
        tabs = block.get('tabs', [])
        for tab in tabs:
            if tab.get('label') == tab_label:
                content = tab.get('content', '')
                if old_text in content:
                    tab['content'] = content.replace(old_text, new_text)
                    mark_dirty(fpath)
                    record_change(lesson_id, block_id)
                    applied = True
                    print(f'  FIX tab "{tab_label}" in {block_id} ({fpath})')
    if applied:
        fix_count += 1
    return applied


# ── PHASE A: MODULE 1 — STOREFRONT METAPHOR ──────────────────────────────

def run_phase_a(dry_run=False):
    print('\n' + '='*70)
    print('PHASE A: Module 1 — Remove storefront metaphor in text-1-2-2')
    print('='*70)

    def fix_1_2_2(block, fpath):
        changed = sub_fix(block,
            "Your EIN is like the address number on your storefront \u2014 without it, no one can find you in the system.",
            "Your EIN is your business identity in the federal system. You need it for bank accounts, tax filings, hiring, and business licenses.")
        if not changed:
            # Try straight dash variant
            changed = sub_fix(block,
                "Your EIN is like the address number on your storefront — without it, no one can find you in the system.",
                "Your EIN is your business identity in the federal system. You need it for bank accounts, tax filings, hiring, and business licenses.")
        if not changed:
            # Try with -- instead of em dash
            changed = sub_fix(block,
                "Your EIN is like the address number on your storefront -- without it, no one can find you in the system.",
                "Your EIN is your business identity in the federal system. You need it for bank accounts, tax filings, hiring, and business licenses.")
        if changed:
            # Remove the now-redundant sentence that follows (since we included it)
            sub_fix(block,
                " You will need it for bank accounts, tax filings, hiring, and business licenses. The EIN is free.",
                " The EIN is free.")
            print(f'  FIX text-1-2-2 storefront metaphor in {fpath}')
        return changed
    apply_to_all_files('lesson-1-2', 'text-1-2-2', fix_1_2_2, dry_run)


# ── PHASE B: MODULE 2 — FINANCIAL DISTRICT TITLE + GRAMMAR ───────────────

def run_phase_b(dry_run=False):
    print('\n' + '='*70)
    print('PHASE B: Module 2 — Financial District title + grammar fix')
    print('='*70)

    # text-2-1-1: title "Welcome to the Financial District"
    def fix_2_1_1(block, fpath):
        changed = title_fix(block,
            "Welcome to the Financial District",
            "Federal and State Taxes: What You Actually Owe")
        if changed:
            print(f'  FIX text-2-1-1 title in {fpath}')
        return changed
    apply_to_all_files('lesson-2-1', 'text-2-1-1', fix_2_1_1, dry_run)

    # text-2-1-no-state-tax: "the Central Florida" grammar error
    def fix_2_1_tax(block, fpath):
        changed = sub_fix(block,
            "and the Central Florida consistently ranks",
            "and Central Florida consistently ranks")
        if changed:
            print(f'  FIX text-2-1-no-state-tax grammar in {fpath}')
        return changed
    apply_to_all_files('lesson-2-1', 'text-2-1-no-state-tax', fix_2_1_tax, dry_run)


# ── PHASE C: MODULE 3 — SPACE CENTER IN TITLE ────────────────────────────

def run_phase_c(dry_run=False):
    print('\n' + '='*70)
    print('PHASE C: Module 3 — Remove Space Center from title')
    print('='*70)

    def fix_3_1_1(block, fpath):
        changed = title_fix(block,
            "Welcome to the Space Center, Protecting What You Have Built",
            "Protecting What You Have Built")
        if not changed:
            changed = title_fix(block,
                "Welcome to the Space Center: Protecting What You Have Built",
                "Protecting What You Have Built")
        if changed:
            print(f'  FIX text-3-1-1 title in {fpath}')
        return changed
    apply_to_all_files('lesson-3-1', 'text-3-1-1', fix_3_1_1, dry_run)


# ── PHASE D: MODULE 4 — KEY TAKEAWAY METAPHORS + GRAMMAR ─────────────────

def run_phase_d(dry_run=False):
    print('\n' + '='*70)
    print('PHASE D: Module 4 — Key takeaway metaphors + grammar errors')
    print('='*70)

    # kt-4-1-1: "The theme park runs because every role is classified correctly — your business works the same way."
    def fix_kt_4_1_1(block, fpath):
        changed = sub_fix(block,
            "The theme park runs because every role is classified correctly \u2014 your business works the same way.",
            "Every role must be classified correctly from day one.")
        if not changed:
            changed = sub_fix(block,
                "The theme park runs because every role is classified correctly — your business works the same way.",
                "Every role must be classified correctly from day one.")
        if not changed:
            changed = sub_fix(block,
                "The theme park runs because every role is classified correctly -- your business works the same way.",
                "Every role must be classified correctly from day one.")
        if changed:
            print(f'  FIX kt-4-1-1 theme park metaphor in {fpath}')
        return changed
    apply_to_all_files('lesson-4-1', 'kt-4-1-1', fix_kt_4_1_1, dry_run)

    # table-4-2-1: title "Your Backstage Credentials — Visa Pathways at a Glance"
    def fix_table_4_2_1(block, fpath):
        changed = title_fix(block,
            "Your Backstage Credentials \u2014 Visa Pathways at a Glance",
            "Visa Pathways at a Glance")
        if not changed:
            changed = title_fix(block,
                "Your Backstage Credentials — Visa Pathways at a Glance",
                "Visa Pathways at a Glance")
        if not changed:
            changed = title_fix(block,
                "Your Backstage Credentials -- Visa Pathways at a Glance",
                "Visa Pathways at a Glance")
        if changed:
            print(f'  FIX table-4-2-1 backstage title in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'table-4-2-1', fix_table_4_2_1, dry_run)

    # kt-4-2-1: "Four backstage passes, four different doors, but none are handed out automatically."
    def fix_kt_4_2_1(block, fpath):
        changed = sub_fix(block,
            "Four backstage passes, four different doors, but none are handed out automatically.",
            "Four visa categories, four different requirements, but none are granted automatically.")
        if changed:
            print(f'  FIX kt-4-2-1 backstage metaphor in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'kt-4-2-1', fix_kt_4_2_1, dry_run)

    # callout-4-2-funfact: "The Central Florida is home to"
    def fix_callout_4_2(block, fpath):
        changed = sub_fix(block,
            "The Central Florida is home to",
            "Central Florida is home to")
        if changed:
            print(f'  FIX callout-4-2-funfact grammar in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'callout-4-2-funfact', fix_callout_4_2, dry_run)

    # callout-4-3-funfact: "The Central Florida added over"
    def fix_callout_4_3(block, fpath):
        changed = sub_fix(block,
            "The Central Florida added over",
            "Central Florida added over")
        if changed:
            print(f'  FIX callout-4-3-funfact grammar in {fpath}')
        return changed
    apply_to_all_files('lesson-4-3', 'callout-4-3-funfact', fix_callout_4_3, dry_run)


# ── PHASE E: MODULE 6 — ALL BEACH/OCEAN/CURRENT METAPHORS ────────────────

def run_phase_e(dry_run=False):
    print('\n' + '='*70)
    print('PHASE E: Module 6 — Remove ALL beach/ocean/current metaphors')
    print('='*70)

    # text-6-1-2: Full content rewrite — heavy beach metaphors throughout
    def fix_6_1_2(block, fpath):
        changed = False
        # Opening sentence
        if sub_fix(block,
            "Reading the currents takes practice, but every commitment you keep proves you can swim in these waters.",
            "Building trust takes practice, but every commitment you keep proves you belong in this market."):
            changed = True
            print(f'  FIX text-6-1-2 opening in {fpath}')
        # Mid-paragraph tide/swim
        if sub_fix(block,
            "Like reading the tide before you swim, reading U.S. trust signals comes down to observation.",
            "Reading U.S. trust signals comes down to observation."):
            changed = True
            print(f'  FIX text-6-1-2 tide metaphor in {fpath}')
        # "life jackets" section
        if sub_fix(block,
            "These are your life jackets, the things that keep you afloat when Americans are deciding whether to trust you.",
            "These are your credibility markers, the things that reduce perceived risk when Americans are deciding whether to trust you."):
            changed = True
            print(f'  FIX text-6-1-2 life jackets in {fpath}')
        # Try alternate punctuation variants
        if sub_fix(block,
            "These are your life jackets \u2014 the things that keep you afloat when Americans are deciding whether to trust you.",
            "These are your credibility markers, the things that reduce perceived risk when Americans are deciding whether to trust you."):
            changed = True
        return changed
    apply_to_all_files('lesson-6-1', 'text-6-1-2', fix_6_1_2, dry_run)

    # kt-6-1-1: "The beach is open to everyone, but the currents are real. Learn to read them before you wade in deep."
    def fix_kt_6_1_1(block, fpath):
        changed = sub_fix(block,
            "The beach is open to everyone, but the currents are real. Learn to read them before you wade in deep. Be direct, be fast, and follow through.",
            "The U.S. market is open to everyone, but the expectations are real. Learn them before you commit resources. Be direct, be fast, and follow through.")
        if changed:
            print(f'  FIX kt-6-1-1 beach metaphor in {fpath}')
        return changed
    apply_to_all_files('lesson-6-1', 'kt-6-1-1', fix_kt_6_1_1, dry_run)

    # text-6-2-2: "Read the tide of the conversation"
    def fix_6_2_2(block, fpath):
        changed = sub_fix(block,
            "Read the tide of the conversation",
            "Read the direction of the conversation")
        if changed:
            print(f'  FIX text-6-2-2 tide metaphor in {fpath}')
        return changed
    apply_to_all_files('lesson-6-2', 'text-6-2-2', fix_6_2_2, dry_run)

    # kt-6-2-1: "Learn to read the signals beneath the surface"
    def fix_kt_6_2_1(block, fpath):
        changed = sub_fix(block,
            "Learn to read the signals beneath the surface, and you will handle U.S. business relationships with confidence.",
            "Learn to read the signals behind the words, and you will handle U.S. business relationships with confidence.")
        if changed:
            print(f'  FIX kt-6-2-1 surface metaphor in {fpath}')
        return changed
    apply_to_all_files('lesson-6-2', 'kt-6-2-1', fix_kt_6_2_1, dry_run)

    # text-6-3-1: title "The Undertow You Didn't See Coming"
    def fix_6_3_1(block, fpath):
        changed = False
        if title_fix(block,
            "The Undertow You Didn\u2019t See Coming",
            "The Mistakes You Didn\u2019t See Coming"):
            changed = True
            print(f'  FIX text-6-3-1 title (smart quote) in {fpath}')
        if title_fix(block,
            "The Undertow You Didn't See Coming",
            "The Mistakes You Didn't See Coming"):
            changed = True
            print(f'  FIX text-6-3-1 title in {fpath}')
        # Body: "The surface looks inviting" paragraph
        if sub_fix(block,
            "The surface looks inviting, a warm smile, enthusiastic words,",
            "The signals look positive, a warm smile, enthusiastic words,"):
            changed = True
            print(f'  FIX text-6-3-1 "surface" in {fpath}')
        # "But do not dive in"
        if sub_fix(block,
            "But do not dive in until you see written confirmation.",
            "But do not commit until you see written confirmation."):
            changed = True
            print(f'  FIX text-6-3-1 "dive in" in {fpath}')
        # "The undercurrent here pulls founders"
        if sub_fix(block,
            "The undercurrent here pulls founders into spending money on verbal promises.",
            "This pattern pulls founders into spending money on verbal promises."):
            changed = True
            print(f'  FIX text-6-3-1 "undercurrent" in {fpath}')
        # "This is a sandbar you do not see coming."
        if sub_fix(block,
            "This is a sandbar you do not see coming.",
            "This is a mistake you do not see coming."):
            changed = True
            print(f'  FIX text-6-3-1 "sandbar" in {fpath}')
        return changed
    apply_to_all_files('lesson-6-3', 'text-6-3-1', fix_6_3_1, dry_run)

    # text-6-3-2: "The calm surface again"
    def fix_6_3_2(block, fpath):
        changed = sub_fix(block,
            "The calm surface again \u2014 friendliness is the default in American business, not a commitment.",
            "Remember: friendliness is the default in American business, not a commitment.")
        if not changed:
            changed = sub_fix(block,
                "The calm surface again — friendliness is the default in American business, not a commitment.",
                "Remember: friendliness is the default in American business, not a commitment.")
        if changed:
            print(f'  FIX text-6-3-2 "calm surface" in {fpath}')
        return changed
    apply_to_all_files('lesson-6-3', 'text-6-3-2', fix_6_3_2, dry_run)


# ── PHASE F: MODULE 7 — ALL SPRING/RIVER/FLOW METAPHORS + GRAMMAR ────────

def run_phase_f(dry_run=False):
    print('\n' + '='*70)
    print('PHASE F: Module 7 — Remove ALL spring/river/flow metaphors')
    print('='*70)

    # text-7-1-1: title + entire opening paragraph is spring metaphor
    def fix_7_1_1(block, fpath):
        changed = False
        if title_fix(block,
            "Discovering the Springs, Where Everything Connects",
            "Your Support Network: Where Everything Connects"):
            changed = True
            print(f'  FIX text-7-1-1 title in {fpath}')
        # Full replacement of spring metaphor opening paragraph
        old_para = "Imagine stepping off a trail in Central Florida and discovering a crystal-clear natural spring. The water is so transparent you can see every detail of the riverbed below. Fish, turtles, manatees, cypress roots, aquatic plants: an entire ecosystem thriving because everything in it is interconnected. Central Florida\u2019s business support network works the same way. SBDC, SBA, chambers of commerce, UCF BIP, SCORE, Prospera: each one feeds into the same living system, and they are all here to support founders like you."
        new_para = "Central Florida has a business support network that most international founders never discover on their own. SBDC, SBA, chambers of commerce, UCF BIP, SCORE, Prospera: each one connects to the others, and they are all here to support founders like you."
        if sub_fix(block, old_para, new_para):
            changed = True
            print(f'  FIX text-7-1-1 opening paragraph in {fpath}')
        # Try straight quote version
        old_para_alt = old_para.replace('\u2019', "'")
        if sub_fix(block, old_para_alt, new_para):
            changed = True
            print(f'  FIX text-7-1-1 opening paragraph (alt) in {fpath}')
        # "standing at the edge of the springs"
        if sub_fix(block,
            "She had been standing at the edge of the springs without realizing the whole ecosystem was already there.",
            "She had been spending money on private help without realizing the whole support network was already there."):
            changed = True
            print(f'  FIX text-7-1-1 "edge of springs" in {fpath}')
        return changed
    apply_to_all_files('lesson-7-1', 'text-7-1-1', fix_7_1_1, dry_run)

    # kt-7-1-1: "like its natural springs: deep, clear, and interconnected"
    def fix_kt_7_1_1(block, fpath):
        changed = sub_fix(block,
            "Central Florida\u2019s support ecosystem is like its natural springs: deep, clear, and interconnected.",
            "Central Florida\u2019s support ecosystem is deep, well-organized, and interconnected.")
        if not changed:
            changed = sub_fix(block,
                "Central Florida's support ecosystem is like its natural springs: deep, clear, and interconnected.",
                "Central Florida's support ecosystem is deep, well-organized, and interconnected.")
        if changed:
            print(f'  FIX kt-7-1-1 spring simile in {fpath}')
        # Also: "step into the ecosystem"
        if sub_fix(block,
            "The founders who succeed fastest are the ones who step into the ecosystem and use every available advantage.",
            "The founders who succeed fastest are the ones who engage the ecosystem and use every available advantage."):
            changed = True
        return changed
    apply_to_all_files('lesson-7-1', 'kt-7-1-1', fix_kt_7_1_1, dry_run)

    # text-7-2-1: title + full spring/river opening
    def fix_7_2_1(block, fpath):
        changed = False
        if title_fix(block,
            "The Living Ecosystem, Where Every Current Carries You Forward",
            "The Living Ecosystem: Why Central Florida Works for Founders"):
            changed = True
            print(f'  FIX text-7-2-1 title in {fpath}')
        # Full opening paragraph replacement
        old_p = "Deeper into the springs, the water moves with purpose. Side channels branch out, each one leading to a different part of the river system, but they all stay connected to the same source. Central Florida\u2019s startup ecosystem works the same way: different organizations serve different needs, but they feed the same network of founders, mentors, and opportunities."
        new_p = "Central Florida\u2019s startup ecosystem has a structure that works in your favor: different organizations serve different needs, but they all connect to the same network of founders, mentors, and opportunities."
        if sub_fix(block, old_p, new_p):
            changed = True
            print(f'  FIX text-7-2-1 opening paragraph in {fpath}')
        old_p_alt = old_p.replace('\u2019', "'")
        new_p_alt = new_p.replace('\u2019', "'")
        if sub_fix(block, old_p_alt, new_p_alt):
            changed = True
            print(f'  FIX text-7-2-1 opening paragraph (alt) in {fpath}')
        return changed
    apply_to_all_files('lesson-7-2', 'text-7-2-1', fix_7_2_1, dry_run)

    # text-7-2-3: "Just as a healthy spring ecosystem thrives..."
    def fix_7_2_3(block, fpath):
        changed = sub_fix(block,
            "Just as a healthy spring ecosystem thrives because its species cooperate rather than compete for the same resources, the startup culture here is team-minded, not cutthroat.",
            "The startup culture here is team-minded, not cutthroat.")
        if changed:
            print(f'  FIX text-7-2-3 spring ecosystem simile in {fpath}')
        return changed
    apply_to_all_files('lesson-7-2', 'text-7-2-3', fix_7_2_3, dry_run)

    # kt-7-2-1: "Like a spring-fed river..." and "Step into the current"
    def fix_kt_7_2_1(block, fpath):
        changed = False
        if sub_fix(block,
            "Like a spring-fed river that sustains an entire ecosystem, the region has",
            "The region has"):
            changed = True
            print(f'  FIX kt-7-2-1 "spring-fed river" in {fpath}')
        if sub_fix(block,
            "Step into the current, build relationships early, and use the community as your launchpad.",
            "Get involved early, build relationships, and use the community as your launchpad."):
            changed = True
            print(f'  FIX kt-7-2-1 "step into the current" in {fpath}')
        return changed
    apply_to_all_files('lesson-7-2', 'kt-7-2-1', fix_kt_7_2_1, dry_run)

    # text-7-3-1: title "Measuring the Flow" + spring metaphor in content
    def fix_7_3_1(block, fpath):
        changed = False
        if title_fix(block,
            "Measuring the Flow, Central Florida by the Numbers",
            "Central Florida by the Numbers"):
            changed = True
            print(f'  FIX text-7-3-1 title in {fpath}')
        # Spring opening paragraph
        if sub_fix(block,
            "A natural spring\u2019s strength is measured by how many gallons per second it pushes to the surface. An ecosystem\u2019s strength is measured by what it produces.",
            "An ecosystem\u2019s strength is measured by what it produces."):
            changed = True
            print(f'  FIX text-7-3-1 spring metaphor in {fpath}')
        if sub_fix(block,
            "A natural spring's strength is measured by how many gallons per second it pushes to the surface. An ecosystem's strength is measured by what it produces.",
            "An ecosystem's strength is measured by what it produces."):
            changed = True
        return changed
    apply_to_all_files('lesson-7-3', 'text-7-3-1', fix_7_3_1, dry_run)

    # callout-7-2-latam: "in the Central Florida" grammar error
    def fix_callout_7_2_latam(block, fpath):
        changed = sub_fix(block,
            "are well-established in the Central Florida",
            "are well-established in Central Florida")
        if changed:
            print(f'  FIX callout-7-2-latam grammar in {fpath}')
        return changed
    apply_to_all_files('lesson-7-2', 'callout-7-2-latam', fix_callout_7_2_latam, dry_run)

    # Module 7 description: "The Central Florida ecosystem"
    apply_to_module_description(7,
        "The Central Florida ecosystem",
        "Central Florida's ecosystem",
        dry_run)


# ── PHASE G: MODULE 8 — HEADQUARTERS/JOURNEY/MAP/ROUTE LANGUAGE ──────────

def run_phase_g(dry_run=False):
    print('\n' + '='*70)
    print('PHASE G: Module 8 — Remove headquarters/journey/map/route metaphors')
    print('='*70)

    # text-8-1-2: "Before you leave headquarters and head into the U.S. market"
    def fix_8_1_2(block, fpath):
        changed = False
        if sub_fix(block,
            "Before you leave headquarters and head into the U.S. market, you need a readiness review.",
            "Before you enter the U.S. market, you need a readiness review."):
            changed = True
            print(f'  FIX text-8-1-2 "leave headquarters" in {fpath}')
        if sub_fix(block,
            "once you step out of headquarters",
            "once you start operating in the U.S."):
            changed = True
            print(f'  FIX text-8-1-2 "step out" in {fpath}')
        # "These power everything that follows once you step out of headquarters."
        # Already covered by the above
        return changed
    apply_to_all_files('lesson-8-1', 'text-8-1-2', fix_8_1_2, dry_run)

    # text-8-1-4: "before they leave headquarters" + "Your readiness scores are your map"
    def fix_8_1_4(block, fpath):
        changed = False
        if sub_fix(block,
            "get help before they leave headquarters",
            "get help before entering the market"):
            changed = True
            print(f'  FIX text-8-1-4 "leave headquarters" in {fpath}')
        if sub_fix(block,
            "Your readiness scores are your map.",
            "Your readiness scores are your priority list."):
            changed = True
            print(f'  FIX text-8-1-4 "map" metaphor in {fpath}')
        if sub_fix(block,
            "waiting in the buildings around you",
            "available to you through UCF"):
            changed = True
            print(f'  FIX text-8-1-4 "buildings around you" in {fpath}')
        return changed
    apply_to_all_files('lesson-8-1', 'text-8-1-4', fix_8_1_4, dry_run)

    # kt-8-1-1: "pre-departure checklist" + "arrived at campus headquarters"
    def fix_kt_8_1_1(block, fpath):
        changed = False
        if sub_fix(block,
            "It is your pre-departure checklist.",
            "It is your priority checklist."):
            changed = True
            print(f'  FIX kt-8-1-1 "pre-departure" in {fpath}')
        if sub_fix(block,
            "You have arrived at campus headquarters for a reason.",
            "You completed this program for a reason."):
            changed = True
            print(f'  FIX kt-8-1-1 "campus headquarters" in {fpath}')
        return changed
    apply_to_all_files('lesson-8-1', 'kt-8-1-1', fix_kt_8_1_1, dry_run)

    # kt-8-2-1: "do not leave headquarters without your equipment"
    def fix_kt_8_2_1(block, fpath):
        changed = sub_fix(block,
            "do not leave headquarters without your equipment",
            "do not move forward without your tools")
        if changed:
            print(f'  FIX kt-8-2-1 "leave headquarters" in {fpath}')
        # Also: "at campus headquarters"
        if sub_fix(block,
            "bring them to your 1:1 meeting with the [UCF BIP](https://incubator.ucf.edu) team at campus headquarters",
            "bring them to your 1:1 meeting with the [UCF BIP](https://incubator.ucf.edu) team"):
            changed = True
            print(f'  FIX kt-8-2-1 "campus headquarters" in {fpath}')
        return changed
    apply_to_all_files('lesson-8-2', 'kt-8-2-1', fix_kt_8_2_1, dry_run)

    # text-8-3-1: "orientation inside headquarters" + "helps you plan the route" + "entry briefing"
    def fix_8_3_1(block, fpath):
        changed = False
        if sub_fix(block,
            "you are standing at the front door of UCF\u2019s incubator complex",
            "you are ready to connect with UCF\u2019s incubator team"):
            changed = True
            print(f'  FIX text-8-3-1 "front door" in {fpath}')
        if not changed:
            if sub_fix(block,
                "you are standing at the front door of UCF's incubator complex",
                "you are ready to connect with UCF's incubator team"):
                changed = True
        if sub_fix(block,
            "This is your orientation inside headquarters, the team gets to know your mission and helps you plan the route.",
            "The team gets to know your mission and helps you plan your next steps."):
            changed = True
            print(f'  FIX text-8-3-1 "orientation/route" in {fpath}')
        # Try alternate punctuation
        if sub_fix(block,
            "This is your orientation inside headquarters \u2014 the team gets to know your mission and helps you plan the route.",
            "The team gets to know your mission and helps you plan your next steps."):
            changed = True
        if sub_fix(block,
            "that is your entry briefing for the team",
            "that gives the team what they need to help you"):
            changed = True
            print(f'  FIX text-8-3-1 "entry briefing" in {fpath}')
        # Try with em dash
        if sub_fix(block,
            "that is your entry briefing for the team",
            "that gives the team what they need to help you"):
            pass  # already handled
        return changed
    apply_to_all_files('lesson-8-3', 'text-8-3-1', fix_8_3_1, dry_run)

    # text-8-3-1 title: "Your Next Move from Campus Headquarters"
    def fix_8_3_1_title(block, fpath):
        changed = title_fix(block,
            "Your Next Move from Campus Headquarters",
            "Your Next Move")
        if changed:
            print(f'  FIX text-8-3-1 title in {fpath}')
        return changed
    apply_to_all_files('lesson-8-3', 'text-8-3-1', fix_8_3_1_title, dry_run)

    # kt-8-3-1: "The door is open." + "arrived at campus headquarters"
    def fix_kt_8_3_1(block, fpath):
        changed = False
        if sub_fix(block,
            "The door is open. The next move is yours. You have arrived at campus headquarters not as a finish line, but as a starting point.",
            "The next move is yours. You completed this program not as a finish line, but as a starting point."):
            changed = True
            print(f'  FIX kt-8-3-1 "door/headquarters" in {fpath}')
        return changed
    apply_to_all_files('lesson-8-3', 'kt-8-3-1', fix_kt_8_3_1, dry_run)

    # Lesson 8-3 objective: "your continued journey with UCF BIP"
    apply_to_lesson_objectives('lesson-8-3',
        "your continued journey with UCF BIP",
        "what UCF BIP", dry_run)

    # int-8-3-1 tab: "Your U.S. business journey starts now."
    apply_to_tab_content('lesson-8-3', 'int-8-3-1', "What's Next",
        "Your U.S. business journey starts now.",
        "Your U.S. business starts now.", dry_run)

    # text-8-3-3: "after leaving campus"
    def fix_8_3_3(block, fpath):
        changed = sub_fix(block,
            "These are your first three moves after leaving campus.",
            "These are your first three moves after completing this program.")
        if changed:
            print(f'  FIX text-8-3-3 "leaving campus" in {fpath}')
        return changed
    apply_to_all_files('lesson-8-3', 'text-8-3-3', fix_8_3_3, dry_run)

    # text-8-2-1: "walking through the UCF BIP resource center" + "leave campus"
    def fix_8_2_1(block, fpath):
        changed = False
        if sub_fix(block,
            "think of this as walking through the UCF BIP resource center",
            "think of this as your UCF BIP resource toolkit"):
            changed = True
            print(f'  FIX text-8-2-1 "walking through" in {fpath}')
        if sub_fix(block,
            "You would not leave campus without picking up the materials",
            "You would not finish this program without picking up the materials"):
            changed = True
            print(f'  FIX text-8-2-1 "leave campus" in {fpath}')
        return changed
    apply_to_all_files('lesson-8-2', 'text-8-2-1', fix_8_2_1, dry_run)


# ── MAIN ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='UCF Business Course editorial fix V3')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes only')
    parser.add_argument('--phase', type=str, help='Run single phase (A-G)')
    args = parser.parse_args()

    phases = {
        'A': ('Module 1: storefront in text-1-2-2', run_phase_a),
        'B': ('Module 2: Financial District title + grammar', run_phase_b),
        'C': ('Module 3: Space Center in title', run_phase_c),
        'D': ('Module 4: key takeaway metaphors + grammar', run_phase_d),
        'E': ('Module 6: ALL beach/ocean/current metaphors', run_phase_e),
        'F': ('Module 7: ALL spring/river/flow metaphors', run_phase_f),
        'G': ('Module 8: headquarters/journey/map/route', run_phase_g),
    }

    print('='*70)
    print('UCF Business Course — Editorial Fix V3 (COMPREHENSIVE)')
    print(f'Mode: {"DRY-RUN" if args.dry_run else "LIVE"}')
    print('='*70)

    if args.phase:
        key = args.phase.upper()
        if key in phases:
            label, fn = phases[key]
            print(f'\nRunning Phase {key}: {label}')
            fn(args.dry_run)
        else:
            print(f'Unknown phase: {key}. Valid: {", ".join(phases.keys())}')
            sys.exit(1)
    else:
        for key in sorted(phases.keys()):
            label, fn = phases[key]
            fn(args.dry_run)

    # Save
    print('\n' + '='*70)
    print('SAVING FILES')
    print('='*70)
    file_count = save_all(args.dry_run)

    # Manifest
    manifest = {lesson: sorted(list(blocks)) for lesson, blocks in sorted(changed_blocks.items())}
    manifest_path = os.path.join(BASE, 'changed-blocks-manifest-v3.json')
    if not args.dry_run:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print(f'\nManifest: changed-blocks-manifest-v3.json')

    # Summary
    total_blocks = sum(len(b) for b in changed_blocks.values())
    total_lessons = len(changed_blocks)
    print(f'\n{"="*70}')
    print(f'SUMMARY: {fix_count} fixes applied across {total_lessons} lessons, {total_blocks} blocks, {file_count} files')
    print(f'{"="*70}')

    if changed_blocks:
        print('\nChanged blocks by lesson:')
        for lesson, blocks in sorted(manifest.items()):
            print(f'  {lesson}: {", ".join(blocks)}')


if __name__ == '__main__':
    main()
