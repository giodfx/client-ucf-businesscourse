#!/usr/bin/env python3
"""
Editorial fix script V2 for UCF Business Course.
Fixes remaining metaphors in Modules 4, 5, 6 + targeted fixes + em-dash reduction.

Updates ALL THREE file layers:
  1. phase1-lessons/{lessonId}.json
  2. generated/content-phase1-module{N}.json  (no hyphen - HTML generator)
  3. generated/content-phase1-module-{N}.json (hyphen - Visualizer, modules 0 & 2)

Usage:
  python fix-content-editorial-v2.py              # apply all phases
  python fix-content-editorial-v2.py --dry-run    # preview changes only
  python fix-content-editorial-v2.py --phase A    # run single phase
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


# ── PHASE A: MODULE 4 METAPHOR CLEANUP ────────────────────────────────────

def run_phase_a(dry_run=False):
    print('\n' + '='*70)
    print('PHASE A: Module 4 — Remove theme park / backstage metaphors')
    print('='*70)

    # text-4-1-1: title + opening paragraph
    def fix_4_1_1(block, fpath):
        changed = False
        if title_fix(block,
            "Welcome to the Theme Park: Building a Team That Keeps the Rides Running",
            "Your First U.S. Hire: Building a Team the Right Way"):
            changed = True
            print(f'  FIX text-4-1-1 title in {fpath}')
        if sub_fix(block,
            "Central Florida\u2019s entertainment sector is one of the largest in the world. Behind every major operation is a massive workforce: operators, engineers, performers, managers, safety teams. Every person is in a defined role with specific rules governing how they work. Building your own team works the same way. Classify people wrong, and the whole operation shuts down.",
            "Every person you hire in the U.S. falls into a defined legal category with specific rules governing how they work. Classify people wrong, and you owe back taxes from day one."):
            changed = True
            print(f'  FIX text-4-1-1 content in {fpath}')
        # Also try the straight quote version
        if sub_fix(block,
            "Central Florida's entertainment sector is one of the largest in the world. Behind every major operation is a massive workforce: operators, engineers, performers, managers, safety teams. Every person is in a defined role with specific rules governing how they work. Building your own team works the same way. Classify people wrong, and the whole operation shuts down.",
            "Every person you hire in the U.S. falls into a defined legal category with specific rules governing how they work. Classify people wrong, and you owe back taxes from day one."):
            changed = True
            print(f'  FIX text-4-1-1 content (alt quotes) in {fpath}')
        return changed
    apply_to_all_files('lesson-4-1', 'text-4-1-1', fix_4_1_1, dry_run)

    # text-4-1-3: roller coaster analogy
    def fix_4_1_3(block, fpath):
        changed = sub_fix(block,
            "Think of it like the entertainment district: the engineers who designed the roller coaster are contractors, but the operators who run it every day are employees.",
            "The distinction is straightforward: a freelance web designer who builds your site and moves on is a contractor. A marketing coordinator who works 9-to-5 at your direction is an employee.")
        if changed:
            print(f'  FIX text-4-1-3 in {fpath}')
        return changed
    apply_to_all_files('lesson-4-1', 'text-4-1-3', fix_4_1_3, dry_run)

    # text-4-2-1: title + backstage opening
    def fix_4_2_1(block, fpath):
        changed = False
        if title_fix(block,
            "Earning Your Backstage Pass: Visa Pathways for International Founders",
            "Visa Pathways for International Founders"):
            changed = True
            print(f'  FIX text-4-2-1 title in {fpath}')
        if sub_fix(block,
            "Now the question turns to you: what pass gets you through the gate?</p>\n\n<p>In Central Florida\u2019s entertainment district, no one walks backstage without the right credential. The same is true for working in the U.S. Owning a company does not by itself give you the right to work here.",
            "Now the question turns to you: what visa do you need to work legally?</p>\n\n<p>Owning a U.S. company does not by itself give you the right to work here."):
            changed = True
            print(f'  FIX text-4-2-1 content in {fpath}')
        if sub_fix(block,
            "Now the question turns to you: what pass gets you through the gate?</p>\n\n<p>In Central Florida's entertainment district, no one walks backstage without the right credential. The same is true for working in the U.S. Owning a company does not by itself give you the right to work here.",
            "Now the question turns to you: what visa do you need to work legally?</p>\n\n<p>Owning a U.S. company does not by itself give you the right to work here."):
            changed = True
            print(f'  FIX text-4-2-1 content (alt) in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'text-4-2-1', fix_4_2_1, dry_run)

    # text-4-2-2: backstage pass
    def fix_4_2_2(block, fpath):
        changed = sub_fix(block,
            "Think of each visa as a different backstage pass to the U.S. market. Each one opens different doors, costs different amounts, and takes different timelines to obtain.",
            "Each visa type has different requirements, costs, and timelines.")
        if changed:
            print(f'  FIX text-4-2-2 in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'text-4-2-2', fix_4_2_2, dry_run)

    # text-4-2-3: complex park analogy
    def fix_4_2_3(block, fpath):
        changed = sub_fix(block,
            "In any complex park, you want a guide who knows which doors lead where. The same applies here: look for an attorney",
            "Immigration law is complex. Look for an attorney")
        if changed:
            print(f'  FIX text-4-2-3 in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'text-4-2-3', fix_4_2_3, dry_run)

    # ig-4-2-visa: infographic subtitle
    def fix_ig_4_2(block, fpath):
        changed = False
        if sub_fix(block, "Four backstage passes, four different doors", "Four visa types, four different pathways", field='subtitle'):
            changed = True
            print(f'  FIX ig-4-2-visa subtitle in {fpath}')
        if sub_fix(block, "Cuatro pases tras bambalinas, cuatro puertas diferentes", "Cuatro tipos de visa, cuatro rutas diferentes", field='subtitleEs'):
            changed = True
            print(f'  FIX ig-4-2-visa subtitleEs in {fpath}')
        return changed
    apply_to_all_files('lesson-4-2', 'ig-4-2-visa', fix_ig_4_2, dry_run)

    # text-4-3-1: title + backstage pass reference
    def fix_4_3_1(block, fpath):
        changed = False
        if title_fix(block,
            "Running the Park: Payroll, Taxes, and the Real Cost of Every Team Member",
            "Payroll, Taxes, and the Real Cost of Every Team Member"):
            changed = True
            print(f'  FIX text-4-3-1 title in {fpath}')
        if sub_fix(block,
            "Now that you have your backstage pass sorted, it is time to look at what it actually costs to keep the team running.",
            "Now that you understand visa requirements, it is time to look at what it actually costs to keep the team running."):
            changed = True
            print(f'  FIX text-4-3-1 content in {fpath}')
        return changed
    apply_to_all_files('lesson-4-3', 'text-4-3-1', fix_4_3_1, dry_run)

    # text-4-3-2: theme parks payroll
    def fix_4_3_2(block, fpath):
        changed = sub_fix(block,
            "Even the biggest theme parks do not run their own payroll in-house",
            "Even large companies do not run payroll manually")
        if changed:
            print(f'  FIX text-4-3-2 in {fpath}')
        return changed
    apply_to_all_files('lesson-4-3', 'text-4-3-2', fix_4_3_2, dry_run)

    # text-4-3-3: theme park perks
    def fix_4_3_3(block, fpath):
        changed = sub_fix(block,
            "Theme parks keep their best performers by offering perks \u2014 food discounts, flexible schedules, free passes. U.S. employers compete for talent the same way: benefits are how you keep people from walking to the park next door.",
            "U.S. employers compete for talent through benefits: PTO, flexible schedules, health coverage. Benefits are how you keep people from leaving for a competitor.")
        if changed:
            print(f'  FIX text-4-3-3 in {fpath}')
        # Try with regular dash
        changed2 = sub_fix(block,
            "Theme parks keep their best performers by offering perks — food discounts, flexible schedules, free passes. U.S. employers compete for talent the same way: benefits are how you keep people from walking to the park next door.",
            "U.S. employers compete for talent through benefits: PTO, flexible schedules, health coverage. Benefits are how you keep people from leaving for a competitor.")
        if changed2:
            print(f'  FIX text-4-3-3 (alt) in {fpath}')
        return changed or changed2
    apply_to_all_files('lesson-4-3', 'text-4-3-3', fix_4_3_3, dry_run)


# ── PHASE B: MODULE 6 METAPHOR CLEANUP ────────────────────────────────────

def run_phase_b(dry_run=False):
    print('\n' + '='*70)
    print('PHASE B: Module 6 — Remove beach / ocean / current metaphors')
    print('='*70)

    # text-6-1-1: title
    def fix_6_1_1(block, fpath):
        changed = title_fix(block,
            "Welcome to the Beach \u2014 Where the Water Looks Calm",
            "What Looks Casual Has Rules")
        if not changed:
            changed = title_fix(block,
                "Welcome to the Beach — Where the Water Looks Calm",
                "What Looks Casual Has Rules")
        if changed:
            print(f'  FIX text-6-1-1 title in {fpath}')
        return changed
    apply_to_all_files('lesson-6-1', 'text-6-1-1', fix_6_1_1, dry_run)

    # text-6-1-direct-indirect: title + subheading
    def fix_6_1_di(block, fpath):
        changed = False
        if title_fix(block,
            "The Direct Parts and the Undercurrents",
            "The Direct Parts and the Hidden Signals"):
            changed = True
            print(f'  FIX text-6-1-direct-indirect title in {fpath}')
        if sub_fix(block, "<h4>The Undercurrents</h4>", "<h4>The Hidden Signals</h4>"):
            changed = True
            print(f'  FIX text-6-1-direct-indirect heading in {fpath}')
        return changed
    apply_to_all_files('lesson-6-1', 'text-6-1-direct-indirect', fix_6_1_di, dry_run)

    # kt-6-2-1: currents metaphor
    def fix_kt_6_2_1(block, fpath):
        changed = sub_fix(block,
            "Learn to read the currents beneath the surface, and you will navigate U.S. business relationships with confidence.",
            "Learn to read the signals beneath the surface, and you will handle U.S. business relationships with confidence.")
        if changed:
            print(f'  FIX kt-6-2-1 in {fpath}')
        return changed
    apply_to_all_files('lesson-6-2', 'kt-6-2-1', fix_kt_6_2_1, dry_run)

    # table-6-3-1: title
    def fix_table_6_3_1(block, fpath):
        changed = title_fix(block,
            "Reading the Undercurrents \u2014 What Americans Really Mean",
            "Reading Between the Lines \u2014 What Americans Really Mean")
        if not changed:
            changed = title_fix(block,
                "Reading the Undercurrents — What Americans Really Mean",
                "Reading Between the Lines — What Americans Really Mean")
        if changed:
            print(f'  FIX table-6-3-1 title in {fpath}')
        return changed
    apply_to_all_files('lesson-6-3', 'table-6-3-1', fix_table_6_3_1, dry_run)

    # kt-6-3-1: heavy beach/undertow/current metaphors
    def fix_kt_6_3_1(block, fpath):
        changed = sub_fix(block,
            "The beach looks inviting, but the undertow is real \u2014 and it pulls hardest when you feel most comfortable. The founders who avoid the biggest losses are the ones who learned to read the currents before wading in deep.",
            "U.S. business culture feels friendly, but the expectations are strict \u2014 and the costs hit hardest when you feel most comfortable. The founders who avoid the biggest losses are the ones who learned to read the signals before committing resources.")
        if not changed:
            changed = sub_fix(block,
                "The beach looks inviting, but the undertow is real — and it pulls hardest when you feel most comfortable. The founders who avoid the biggest losses are the ones who learned to read the currents before wading in deep.",
                "U.S. business culture feels friendly, but the expectations are strict — and the costs hit hardest when you feel most comfortable. The founders who avoid the biggest losses are the ones who learned to read the signals before committing resources.")
        if changed:
            print(f'  FIX kt-6-3-1 in {fpath}')
        return changed
    apply_to_all_files('lesson-6-3', 'kt-6-3-1', fix_kt_6_3_1, dry_run)


# ── PHASE C: MODULE 5 FIXES ───────────────────────────────────────────────

def run_phase_c(dry_run=False):
    print('\n' + '='*70)
    print('PHASE C: Module 5 — Remove scenic drive framing + grammar fixes')
    print('='*70)

    # text-5-1-1: title + scenic drive opening
    def fix_5_1_1(block, fpath):
        changed = False
        if title_fix(block,
            "Arriving at the Commercial Hub: Why Your Product Needs to Change for the U.S.",
            "Why Your Product Needs to Change for the U.S."):
            changed = True
            print(f'  FIX text-5-1-1 title in {fpath}')
        if sub_fix(block,
            "Drive east from Orlando and you reach Port Canaveral, one of the busiest ports in North America, where goods from dozens of countries arrive daily. Head to the outlet corridors along International Drive and you see the other side of the equation: millions of American consumers browsing, comparing, and deciding what to buy. This is the U.S. marketplace. Products flow in from around the world, but the ones that sell are the ones built for the buyers standing in front of them.",
            "Products from dozens of countries enter the U.S. market every day. But the ones that sell are the ones built for American buyers \u2014 adapted to their expectations, priced for their market, and supported in their timezone."):
            changed = True
            print(f'  FIX text-5-1-1 content in {fpath}')
        return changed
    apply_to_all_files('lesson-5-1', 'text-5-1-1', fix_5_1_1, dry_run)

    # text-5-2-1: title + shopping corridor
    def fix_5_2_1(block, fpath):
        changed = False
        if title_fix(block,
            "Inside the Shopping Center: How Americans Find, Compare, and Buy",
            "How Americans Find, Compare, and Buy"):
            changed = True
            print(f'  FIX text-5-2-1 title in {fpath}')
        if sub_fix(block,
            "Stand in any major shopping corridor in Central Florida and watch how customers move: they scan, compare, check reviews on their phones, and make a decision in minutes. That same behavior drives B2B purchasing too, just with bigger numbers and more paperwork.",
            "American buyers scan options, compare features, check reviews, and make decisions fast. That same behavior drives B2B purchasing too, just with bigger numbers and more paperwork."):
            changed = True
            print(f'  FIX text-5-2-1 content in {fpath}')
        return changed
    apply_to_all_files('lesson-5-2', 'text-5-2-1', fix_5_2_1, dry_run)

    # callout-5-2-funfact: "The Central Florida" grammar
    def fix_5_2_ff(block, fpath):
        changed = sub_fix(block, "The Central Florida attracts", "Central Florida attracts")
        if changed:
            print(f'  FIX callout-5-2-funfact grammar in {fpath}')
        return changed
    apply_to_all_files('lesson-5-2', 'callout-5-2-funfact', fix_5_2_ff, dry_run)


# ── PHASE D: PRIORITY 2 TARGETED FIXES ────────────────────────────────────

def run_phase_d(dry_run=False):
    print('\n' + '='*70)
    print('PHASE D: Targeted fixes (Modules 0, 1, 7)')
    print('='*70)

    # text-1-3-5: street/district metaphor
    def fix_1_3_5(block, fpath):
        changed = sub_fix(block,
            "You have walked the length of this street. This lesson covers what you need to open your first U.S. bank account. Module 2 takes you deeper into the district \u2014 credit history, handling rejections, and funding considerations.",
            "This lesson covers the basics of opening your first U.S. bank account. Module 2 goes deeper into credit history, handling rejections, and funding considerations.")
        if not changed:
            changed = sub_fix(block,
                "You have walked the length of this street. This lesson covers what you need to open your first U.S. bank account. Module 2 takes you deeper into the district — credit history, handling rejections, and funding considerations.",
                "This lesson covers the basics of opening your first U.S. bank account. Module 2 goes deeper into credit history, handling rejections, and funding considerations.")
        if changed:
            print(f'  FIX text-1-3-5 in {fpath}')
        return changed
    apply_to_all_files('lesson-1-3', 'text-1-3-5', fix_1_3_5, dry_run)

    # callout-1-1-funfact: "The Central Florida" grammar
    def fix_1_1_ff(block, fpath):
        changed = sub_fix(block, "The Central Florida has over 30,000", "Central Florida has over 30,000")
        if changed:
            print(f'  FIX callout-1-1-funfact grammar in {fpath}')
        return changed
    apply_to_all_files('lesson-1-1', 'callout-1-1-funfact', fix_1_1_ff, dry_run)

    # kt-7-4-1: spring metaphor closing sentence
    def fix_kt_7_4_1(block, fpath):
        changed = sub_fix(block,
            " The data confirms what the springs reveal \u2014 the deepest aquifer sustains the strongest flow.",
            "")
        if not changed:
            changed = sub_fix(block,
                " The data confirms what the springs reveal — the deepest aquifer sustains the strongest flow.",
                "")
        if changed:
            print(f'  FIX kt-7-4-1 in {fpath}')
        return changed
    apply_to_all_files('lesson-7-4', 'kt-7-4-1', fix_kt_7_4_1, dry_run)

    # text-0-1-learn-first: add "9 modules total" note
    def fix_0_1_lf(block, fpath):
        content = block.get('content', '')
        marker = "The program is self-paced, with no deadlines or exams.</p>"
        insert = " This program has 9 modules total: 1 introductory module (this one) plus 8 content modules organized around 4 themes.</p>"
        old = marker
        new = marker.replace("</p>", "") + insert
        if old in content and insert not in content:
            block['content'] = content.replace(old, new)
            print(f'  FIX text-0-1-learn-first (9 modules) in {fpath}')
            return True
        return False
    apply_to_all_files('lesson-0-1', 'text-0-1-learn-first', fix_0_1_lf, dry_run)

    # text-0-1-1: make 4 themes / 8 modules explicit
    def fix_0_1_1(block, fpath):
        changed = sub_fix(block,
            "The eight modules ahead each address one or more of these areas.",
            "The eight content modules ahead are organized around these four themes. Each module addresses one or more of these areas.")
        if changed:
            print(f'  FIX text-0-1-1 (4 themes / 8 modules) in {fpath}')
        return changed
    apply_to_all_files('lesson-0-1', 'text-0-1-1', fix_0_1_1, dry_run)

    # callout-0-1-legal: update disclaimer text to Brian's exact wording
    def fix_0_1_disclaimer(block, fpath):
        target = "This program provides general educational information and does not constitute legal, tax, immigration, or financial advice. Always consult qualified professionals before making business decisions."
        content = block.get('content', '')
        if target in content:
            return False  # already correct
        # Look for existing disclaimer-like content and replace
        if 'does not constitute' in content or 'educational information' in content:
            # Already has a disclaimer but wrong wording — replace
            block['content'] = f"<p>{target}</p>"
            print(f'  FIX callout-0-1-legal disclaimer in {fpath}')
            return True
        return False
    apply_to_all_files('lesson-0-1', 'callout-0-1-legal', fix_0_1_disclaimer, dry_run)

    # Residual "most" -> "many" fixes in Module 2
    most_to_many_fixes = [
        ('lesson-2-2', 'callout-2-2-2', "most accounting firms", "many accounting firms"),
        ('lesson-2-3', 'text-2-3-fund', "most international founders", "many international founders"),
    ]
    for lesson_id, block_id, old, new in most_to_many_fixes:
        def make_fix(o, n):
            def fix(block, fpath):
                changed = sub_fix(block, o, n)
                if changed:
                    print(f'  FIX {block.get("id")} "most"→"many" in {fpath}')
                return changed
            return fix
        apply_to_all_files(lesson_id, block_id, make_fix(old, new), dry_run)

    # "Orlando metro area" -> "Central Florida" in Module 2
    def fix_2_1_orlando(block, fpath):
        changed = sub_fix(block, "Orlando metro area", "Central Florida")
        if changed:
            print(f'  FIX text-2-1-no-state-tax Orlando→CF in {fpath}')
        return changed
    apply_to_all_files('lesson-2-1', 'text-2-1-no-state-tax', fix_2_1_orlando, dry_run)


# ── PHASE E: EM-DASH REDUCTION ─────────────────────────────────────────────

def reduce_emdashes_in_text(text):
    """Reduce em-dash usage by replacing with commas, colons, or periods.
    Returns (new_text, count_removed)."""
    removed = 0
    # Pattern: " — word" where word starts with lowercase
    # These are typically parenthetical asides or continuations
    # Replace with ", word"

    # Before conjunctions: " — and/but/or/so/yet" → ", and/but/or/so/yet"
    for conj in ['and ', 'but ', 'or ', 'so ', 'yet ', 'not ', 'just ', 'which ']:
        old = f' \u2014 {conj}'
        new = f', {conj}'
        count = text.count(old)
        if count > 0:
            text = text.replace(old, new)
            removed += count

    # Before pronouns that start new clauses: " — you/they/it/we/he/she"
    for pronoun in ['you ', 'they ', 'it ', 'we ', 'he ', 'she ', 'this ', 'these ', 'those ']:
        old = f' \u2014 {pronoun}'
        # Replace with period + capitalize
        new = f'. {pronoun[0].upper()}{pronoun[1:]}'
        count = text.count(old)
        if count > 0:
            text = text.replace(old, new)
            removed += count

    # " — a " or " — the " → ", a " / ", the " (article continuations)
    for art in ['a ', 'the ', 'an ', 'no ', 'some ', 'every ', 'from ', 'for ', 'in ', 'at ', 'on ', 'with ']:
        old = f' \u2014 {art}'
        new = f', {art}'
        count = text.count(old)
        if count > 0:
            text = text.replace(old, new)
            removed += count

    return text, removed


def run_phase_e(dry_run=False):
    print('\n' + '='*70)
    print('PHASE E: Em-dash reduction (course-wide)')
    print('='*70)

    total_removed = 0

    # Process ALL lessons
    for lesson_id, files in LESSON_FILES.items():
        for fpath in files:
            data = load_file(fpath)
            if data is None:
                continue
            lesson = find_lesson(data, lesson_id)
            if lesson is None:
                continue
            for block in lesson.get('contentBlocks', []):
                content = block.get('content', '')
                if '\u2014' not in content:
                    continue
                new_content, removed = reduce_emdashes_in_text(content)
                if removed > 0:
                    block['content'] = new_content
                    total_removed += removed
                    mark_dirty(fpath)
                    record_change(lesson_id, block.get('id', '?'))
                    if dry_run:
                        print(f'  [DRY-RUN] {lesson_id}/{block.get("id")}: removed {removed} em-dashes')

                # Also check title
                title = block.get('title', '')
                if '\u2014' in title:
                    new_title, t_removed = reduce_emdashes_in_text(title)
                    if t_removed > 0:
                        block['title'] = new_title
                        total_removed += t_removed
                        mark_dirty(fpath)

    print(f'\n  Total em-dashes removed: {total_removed}')


# ── MAIN ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Editorial fix V2')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--phase', type=str, default='ALL')
    args = parser.parse_args()

    phases = {
        'A': ('Module 4 metaphor cleanup', run_phase_a),
        'B': ('Module 6 metaphor cleanup', run_phase_b),
        'C': ('Module 5 fixes', run_phase_c),
        'D': ('Priority 2 targeted fixes', run_phase_d),
        'E': ('Em-dash reduction', run_phase_e),
    }

    to_run = phases if args.phase == 'ALL' else {args.phase.upper(): phases[args.phase.upper()]}

    print('='*70)
    print('UCF BUSINESS COURSE — EDITORIAL FIX V2')
    print('='*70)
    if args.dry_run:
        print('*** DRY RUN — no files will be modified ***')

    for key, (desc, fn) in to_run.items():
        fn(args.dry_run)

    # Save
    print('\n' + '='*70)
    print('SAVING FILES')
    print('='*70)
    count = save_all(args.dry_run)
    print(f'\n  Files saved: {count}')
    print(f'  Block-level fixes applied: {fix_count}')
    print(f'  Lessons affected: {len(changed_blocks)}')

    # Update changed-blocks manifest
    manifest_path = os.path.join(BASE, 'changed-blocks-manifest-v2.json')
    manifest = {}
    for lid, bids in sorted(changed_blocks.items()):
        manifest[lid] = sorted(bids)
    if args.dry_run:
        print(f'\n  [DRY-RUN] Would write manifest: changed-blocks-manifest-v2.json')
        print(f'  Manifest preview: {json.dumps(manifest, indent=2)[:500]}')
    else:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f'\n  Manifest written: changed-blocks-manifest-v2.json')

    print('\nDone.')


if __name__ == '__main__':
    main()
