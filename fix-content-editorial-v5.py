#!/usr/bin/env python3
"""
Editorial fix script V5 for UCF Business Course.
GLOBAL filler phrase sweep + fun-fact metaphor bridges + individual fixes.

Key difference from v1-v4: Phase A does a GLOBAL scan of ALL content fields
in ALL blocks across ALL files, removing filler phrases systematically.

Phases:
  A: Global filler phrase removal (ALL blocks, ALL files)
  B: Module 7 fun-fact metaphor bridge removal (4 callouts)
  C: Critical individual fixes (garbled text, typos, inconsistencies)
  D: Medium individual fixes (redundancy, formatting, data alignment)

Usage:
  python fix-content-editorial-v5.py              # apply all
  python fix-content-editorial-v5.py --dry-run    # preview only
  python fix-content-editorial-v5.py --phase A    # single phase
"""
import json, sys, io, os, argparse, re, copy

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

# All generated module files
MODULE_FILES = [
    'generated/content-phase1-module0.json',
    'generated/content-phase1-module-0.json',
    'generated/content-phase1-module1.json',
    'generated/content-phase1-module2.json',
    'generated/content-phase1-module-2.json',
    'generated/content-phase1-module3.json',
    'generated/content-phase1-module4.json',
    'generated/content-phase1-module5.json',
    'generated/content-phase1-module6.json',
    'generated/content-phase1-module7.json',
    'generated/content-phase1-module8.json',
]

# Individual lesson files
LESSON_FILES_MAP = {
    'lesson-0-1': ['phase1-lessons/lesson-0-1.json', 'generated/content-phase1-module0.json', 'generated/content-phase1-module-0.json'],
    'lesson-1-1': ['phase1-lessons/lesson-1-1.json', 'generated/content-phase1-module1.json'],
    'lesson-1-2': ['phase1-lessons/lesson-1-2.json', 'generated/content-phase1-module1.json'],
    'lesson-1-3': ['phase1-lessons/lesson-1-3.json', 'generated/content-phase1-module1.json'],
    'lesson-2-1': ['phase1-lessons/lesson-2-1.json', 'generated/content-phase1-module2.json', 'generated/content-phase1-module-2.json'],
    'lesson-2-2': ['phase1-lessons/lesson-2-2.json', 'generated/content-phase1-module2.json', 'generated/content-phase1-module-2.json'],
    'lesson-2-3': ['phase1-lessons/lesson-2-3.json', 'generated/content-phase1-module2.json', 'generated/content-phase1-module-2.json'],
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
    files = LESSON_FILES_MAP.get(lesson_id, [])
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


# ═══════════════════════════════════════════════════════════════════════════
# PHASE A: GLOBAL FILLER PHRASE REMOVAL
# Scans ALL content fields in ALL blocks in ALL files
# ═══════════════════════════════════════════════════════════════════════════

# Filler phrases to remove. Each is (old, new).
# Order matters — longer phrases first to avoid partial matches.
FILLER_PHRASES = [
    # "The takeaway is X." patterns
    ("The takeaway is clear. ", ""),
    ("The takeaway is simple. ", ""),
    ("The takeaway is this: ", ""),
    ("The takeaway is clear: ", ""),
    # "Here's how this plays out" patterns
    ("Here\u2019s how this plays out: ", ""),
    ("Here\u2019s how this plays out. ", ""),
    ("Here's how this plays out: ", ""),
    ("Here's how this plays out. ", ""),
    # "Here is the practical takeaway" patterns
    ("Here is the practical takeaway. ", ""),
    ("Here is the practical takeaway: ", ""),
    # "Let's put this in perspective" patterns
    ("Let\u2019s put this in perspective. ", ""),
    ("Let's put this in perspective. ", ""),
    # "Think about this" patterns (various)
    ("Think about this before you start selling. ", ""),
    ("Think about this cultural shift. ", ""),
    ("Think about this carefully. ", ""),
    ("Think about this: ", ""),
    ("Think about this. ", ""),
    # "Here's where" patterns
    ("Here\u2019s where founders lose time. ", ""),
    ("Here\u2019s where it trips people up. ", ""),
    ("Here\u2019s where the numbers matter. ", ""),
    ("Here\u2019s where it catches many founders off guard. ", ""),
    ("Here\u2019s where many founders lose momentum. ", ""),
    ("Here\u2019s where it adds up. ", ""),
    ("Here\u2019s where speed becomes a dealbreaker. ", ""),
    ("Here\u2019s where it gets serious. ", ""),
    ("Here\u2019s where the risk is real. ", ""),
    ("Here's where founders lose time. ", ""),
    ("Here's where it trips people up. ", ""),
    ("Here's where the numbers matter. ", ""),
    ("Here's where it catches many founders off guard. ", ""),
    ("Here's where many founders lose momentum. ", ""),
    ("Here's where it adds up. ", ""),
    ("Here's where speed becomes a dealbreaker. ", ""),
    ("Here's where it gets serious. ", ""),
    ("Here's where the risk is real. ", ""),
    # "Now, here is where" patterns
    ("Now, here is where it gets tricky. ", ""),
    ("Now, here is where it gets tricky.", ""),
    # Other fillers
    ("The bottom line? ", ""),
    ("Why does this matter? ", ""),
    ("Notice these patterns: ", ""),
    ("In other words, plan ahead. ", "Plan ahead. "),
    ("In other words, choose the right tool for the job. ", ""),
    ("In other words, ", ""),
    ("Interestingly, ", ""),
    ("Now, let\u2019s continue with the remaining modules. ", ""),
    ("Now, let's continue with the remaining modules. ", ""),
    ("Now, let\u2019s continue with the remaining modules.", ""),
    ("Now, let's continue with the remaining modules.", ""),
    ("But here\u2019s what you should also know. ", ""),
    ("But here's what you should also know. ", ""),
    # "Now, consider" patterns
    ("Now, consider this carefully. ", ""),
    ("Now, consider the mistakes that cost founders the most time and money at this stage: ", ""),
    ("Now, consider the mistakes that cost founders the most time and money at this stage:", ""),
    # "Consider this:" patterns
    ("Consider this: ", ""),
    # "Here is what they do not tell you" patterns
    ("Here is what they do not tell you on any bank\u2019s website: ", ""),
    ("Here is what they do not tell you on any bank's website: ", ""),
    # "In short:" patterns
    (" In short: ", " "),
    ("In short: ", ""),
    # "What does that mean for you?" patterns
    ("What does that mean for you? ", ""),
    ("What does this actually mean day to day? ", ""),
    # "So what happens next?"
    ("So what happens next? ", ""),
]


def apply_filler_removal_to_string(text):
    """Apply all filler phrase removals to a string. Returns (new_text, count)."""
    count = 0
    for old, new in FILLER_PHRASES:
        while old in text:
            text = text.replace(old, new, 1)
            count += 1
    return text, count


def scan_block_for_fillers(block, lesson_id, fpath):
    """Scan all text fields in a block for filler phrases. Returns change count."""
    total = 0
    block_id = block.get('id', 'unknown')

    # Content field
    if 'content' in block:
        new_content, cnt = apply_filler_removal_to_string(block['content'])
        if cnt > 0:
            block['content'] = new_content
            total += cnt

    # Accordion sections
    for sec in block.get('sections', []):
        if 'content' in sec:
            new_content, cnt = apply_filler_removal_to_string(sec['content'])
            if cnt > 0:
                sec['content'] = new_content
                total += cnt

    # Tab content
    for tab in block.get('tabs', []):
        if 'content' in tab:
            new_content, cnt = apply_filler_removal_to_string(tab['content'])
            if cnt > 0:
                tab['content'] = new_content
                total += cnt

    # Quiz explanations
    for q in block.get('questions', []):
        if 'explanation' in q:
            new_text, cnt = apply_filler_removal_to_string(q['explanation'])
            if cnt > 0:
                q['explanation'] = new_text
                total += cnt

    return total


def phase_A(dry_run=False):
    print('\n=== PHASE A: Global Filler Phrase Removal ===')
    global fix_count

    # Collect ALL unique file paths
    all_files = set()
    for files in LESSON_FILES_MAP.values():
        all_files.update(files)

    total_removals = 0
    blocks_hit = set()

    for fpath in sorted(all_files):
        data = load_file(fpath)
        if data is None:
            continue

        lessons = data.get('lessons', [data])
        for lesson in lessons:
            lesson_id = lesson.get('lessonId', 'unknown')
            for block in lesson.get('contentBlocks', []):
                block_id = block.get('id', 'unknown')
                cnt = scan_block_for_fillers(block, lesson_id, fpath)
                if cnt > 0:
                    mark_dirty(fpath)
                    record_change(lesson_id, block_id)
                    total_removals += cnt
                    blocks_hit.add(f'{lesson_id}/{block_id}')

    fix_count += total_removals
    print(f'  Removed {total_removals} filler phrases from {len(blocks_hit)} blocks')
    for bk in sorted(blocks_hit):
        print(f'    {bk}')


# ═══════════════════════════════════════════════════════════════════════════
# PHASE B: MODULE 7 FUN-FACT METAPHOR BRIDGES
# Fun-facts should state the Florida fact and STOP — no "works the same way"
# ═══════════════════════════════════════════════════════════════════════════

def phase_B(dry_run=False):
    print('\n=== PHASE B: Module 7 Fun-Fact Metaphor Bridges ===')

    # B1: callout-7-1-funfact — remove "works in a similar way" bridge
    print('  B1: callout-7-1-funfact')
    apply_to_all_files('lesson-7-1', 'callout-7-1-funfact', lambda b, f: sub_fix(b,
        'The business support network in Central Florida works in a similar way: federal funding flows into the SBA, which feeds the SBDC, which connects to chambers and programs like UCF BIP. One resource leads to the next, and the whole system stays healthy because the parts are connected.',
        'Central Florida is also home to one of the deepest networks of free business support organizations in the country.'
    ), dry_run)

    # B2: callout-7-2-funfact — remove "has a similar draw" bridge
    print('  B2: callout-7-2-funfact')
    apply_to_all_files('lesson-7-2', 'callout-7-2-funfact', lambda b, f: sub_fix(b,
        " Central Florida\u2019s business ecosystem has a similar draw: consistent support, year-round programs, and a welcoming environment that keeps international founders coming back and staying put.",
        ""
    ), dry_run)
    apply_to_all_files('lesson-7-2', 'callout-7-2-funfact', lambda b, f: sub_fix(b,
        " Central Florida's business ecosystem has a similar draw: consistent support, year-round programs, and a welcoming environment that keeps international founders coming back and staying put.",
        ""
    ), dry_run)

    # B3: callout-7-3-funfact — remove "works with a similar kind of momentum" bridge
    print('  B3: callout-7-3-funfact')
    apply_to_all_files('lesson-7-3', 'callout-7-3-funfact', lambda b, f: sub_fix(b,
        " Central Florida\u2019s economy works with a similar kind of momentum: 300,000+ new business filings per year, $150 billion in annual GDP, and a population growing faster than most U.S. metros. The numbers just keep flowing.",
        ""
    ), dry_run)
    apply_to_all_files('lesson-7-3', 'callout-7-3-funfact', lambda b, f: sub_fix(b,
        " Central Florida's economy works with a similar kind of momentum: 300,000+ new business filings per year, $150 billion in annual GDP, and a population growing faster than most U.S. metros. The numbers just keep flowing.",
        ""
    ), dry_run)

    # B4: callout-7-4-funfact — remove business infrastructure sentence (not a fun fact)
    print('  B4: callout-7-4-funfact')
    apply_to_all_files('lesson-7-4', 'callout-7-4-funfact', lambda b, f: sub_fix(b,
        "Central Florida\u2019s trade infrastructure connects inland business parks and incubators to global markets through Port Canaveral, Port Tampa Bay, and Miami International Airport to markets across Latin America, the Caribbean, and beyond.",
        "The St. Johns River is one of the few rivers in North America that flows north, traveling 310 miles from its headwaters near Vero Beach to the Atlantic Ocean at Jacksonville."
    ), dry_run)
    apply_to_all_files('lesson-7-4', 'callout-7-4-funfact', lambda b, f: sub_fix(b,
        "Central Florida's trade infrastructure connects inland business parks and incubators to global markets through Port Canaveral, Port Tampa Bay, and Miami International Airport to markets across Latin America, the Caribbean, and beyond.",
        "The St. Johns River is one of the few rivers in North America that flows north, traveling 310 miles from its headwaters near Vero Beach to the Atlantic Ocean at Jacksonville."
    ), dry_run)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE C: CRITICAL INDIVIDUAL FIXES
# ═══════════════════════════════════════════════════════════════════════════

def phase_C(dry_run=False):
    print('\n=== PHASE C: Critical Individual Fixes ===')

    # C1: text-6-2-2 garbled "form like gradually"
    print('  C1: Fix garbled text in text-6-2-2')
    apply_to_all_files('lesson-6-2', 'text-6-2-2', lambda b, f: sub_fix(b,
        'form like gradually, through consistent engagement over time',
        'form gradually, through consistent engagement over time'
    ), dry_run)

    # C2: text-8-1-2 double period "U.S.."
    print('  C2: Fix double period in text-8-1-2')
    apply_to_all_files('lesson-8-1', 'text-8-1-2', lambda b, f: sub_fix(b,
        'U.S..',
        'U.S.'
    ), dry_run)

    # C3: callout-3-1-cm self-referential "Module 3 pattern"
    print('  C3: Fix self-referential "Module 3 pattern" in callout-3-1-cm')
    apply_to_all_files('lesson-3-1', 'callout-3-1-cm', lambda b, f: sub_fix(b,
        "This isn\u2019t an IP issue, but it\u2019s a Module 3 pattern:",
        "This is not an IP issue, but it is a common pattern:"
    ), dry_run)
    apply_to_all_files('lesson-3-1', 'callout-3-1-cm', lambda b, f: sub_fix(b,
        "This isn't an IP issue, but it's a Module 3 pattern:",
        "This is not an IP issue, but it is a common pattern:"
    ), dry_run)

    # C4: matching-6-1-phrases — fix inconsistency with flashcard
    # Change matching answer for "Let me check with my team" to align with flashcard
    print('  C4: Fix matching-6-1-phrases inconsistency')
    apply_to_all_files('lesson-6-1', 'matching-6-1-phrases', lambda b, f: _fix_matching_pair(b), dry_run)

    # C5: text-3-2-1 — redundant paragraph (safety net repeated)
    print('  C5: Remove redundant paragraph in text-3-2-1')
    apply_to_all_files('lesson-3-2', 'text-3-2-1', lambda b, f: sub_fix(b,
        "<p>Many international founders focus on the legal setup \u2014 entity formation, IP, contracts, and forget to guard against day-to-day business risks. One lawsuit without insurance coverage can shut you down. One slip-and-fall at your office, one product defect, one professional error that costs a client money. Insurance is your safety net for the risks you cannot predict.</p>",
        ""
    ), dry_run)
    apply_to_all_files('lesson-3-2', 'text-3-2-1', lambda b, f: sub_fix(b,
        "<p>Many international founders focus on the legal setup — entity formation, IP, contracts, and forget to guard against day-to-day business risks. One lawsuit without insurance coverage can shut you down. One slip-and-fall at your office, one product defect, one professional error that costs a client money. Insurance is your safety net for the risks you cannot predict.</p>",
        ""
    ), dry_run)

    # C6: callout-5-2-bys — stray period formatting
    print('  C6: Fix stray period in callout-5-2-bys')
    apply_to_all_files('lesson-5-2', 'callout-5-2-bys', lambda b, f: sub_fix(b,
        '<strong>Company registration documentation</strong> . Articles',
        '<strong>Company registration documentation.</strong> Articles'
    ), dry_run)

    # C7: kc-8-3 Q2 — stale "March 28" date
    print('  C7: Fix stale date in kc-8-3')
    apply_to_all_files('lesson-8-3', 'kc-8-3', lambda b, f: _fix_kc_stale_date(b), dry_run)

    # C8: text-1-3-2 metaphor "like showing up at a restricted building without an ID badge"
    print('  C8: Fix metaphor in text-1-3-2')
    apply_to_all_files('lesson-1-3', 'text-1-3-2', lambda b, f: sub_fix(b,
        'walking into a bank without the right documents is like showing up at a restricted building without an ID badge.',
        'walking into a bank without the right documents means you will be turned away.'
    ), dry_run)

    # C9: callout-8-1-1 — remove "Think about this:" (already handled by Phase A global,
    #     but also need to fix the remaining motivational fluff after it)
    # Phase A removes "Think about this:" leaving "you now know more..."
    # But the block still has preachy closing. Fix the whole callout flow.
    print('  C9: Fix preachy closing in callout-8-1-1')
    apply_to_all_files('lesson-8-1', 'callout-8-1-1', lambda b, f: sub_fix(b,
        'Many founders jump in without a structured program. They figure things out by making mistakes. You have the chance to skip the most expensive mistakes entirely. But knowing alone does not cut risk. <strong>Action</strong> cuts risk.',
        'But knowing is not enough. <strong>Action</strong> cuts risk.'
    ), dry_run)


def _fix_matching_pair(block):
    """Fix the 'Let me check with my team' matching pair to align with flashcard."""
    pairs = block.get('pairs', [])
    for pair in pairs:
        if pair.get('left') == 'Let me check with my team' or pair.get('term') == 'Let me check with my team':
            right_key = 'right' if 'right' in pair else 'definition'
            if 'Soft stall' in pair.get(right_key, ''):
                pair[right_key] = "Decision isn\u2019t mine alone \u2014 needs internal approval"
                return True
    return False


def _fix_kc_stale_date(block):
    """Fix stale March 28 date in kc-8-3 quiz options."""
    questions = block.get('questions', [])
    for q in questions:
        for i, opt in enumerate(q.get('options', [])):
            if 'March 28' in opt:
                q['options'][i] = opt.replace('by March 28', 'within 2 weeks')
                return True
    return False


# ═══════════════════════════════════════════════════════════════════════════
# PHASE D: MEDIUM INDIVIDUAL FIXES
# ═══════════════════════════════════════════════════════════════════════════

def phase_D(dry_run=False):
    print('\n=== PHASE D: Medium Individual Fixes ===')

    # D1: text-2-3-3 redundant payment processor opening
    print('  D1: Fix redundant opening in text-2-3-3')
    apply_to_all_files('lesson-2-3', 'text-2-3-3', lambda b, f: sub_fix(b,
        'Payment processors handle transactions while you work on getting a full bank account. While you work on getting a bank account, you still need to accept payments and move money.',
        'While you work on getting a bank account, you still need to accept payments and move money.'
    ), dry_run)

    # D2: text-7-1-1 redundant "resources exist specifically for founders like you"
    print('  D2: Remove redundant sentence in text-7-1-1')
    apply_to_all_files('lesson-7-1', 'text-7-1-1', lambda b, f: sub_fix(b,
        ' The resources exist specifically for founders like you.</p>\n\n<p>',
        '</p>\n\n<p>'
    ), dry_run)

    # D3: int-3-1-1 copyright registration says "USPTO/Copyright Office" — USPTO is wrong
    print('  D3: Fix copyright office reference in int-3-1-1')
    apply_to_all_files('lesson-3-1', 'int-3-1-1', lambda b, f: _fix_copyright_office(b), dry_run)

    # D4: int-3-2-1 E&O cost $3,000 → $2,500 to match table and text
    print('  D4: Fix E&O cost in int-3-2-1 accordion')
    _fix_accordion_content('lesson-3-2', 'int-3-2-1', 'Professional Liability', '$500-$3,000', '$500-$2,500', dry_run)
    _fix_accordion_content('lesson-3-2', 'int-3-2-1', 'Professional Liability', '$500\u2013$3,000', '$500\u2013$2,500', dry_run)

    # D5: text-4-1-1 redundant "owe back taxes" closing
    print('  D5: Remove redundant closing in text-4-1-1')
    apply_to_all_files('lesson-4-1', 'text-4-1-1', lambda b, f: sub_fix(b,
        'Call someone a contractor but treat them like an employee, and you owe all the back taxes from day one.',
        ''
    ), dry_run)

    # D6: kt-4-3-1 redundant second half
    print('  D6: Fix redundant kt-4-3-1 ending')
    apply_to_all_files('lesson-4-3', 'kt-4-3-1', lambda b, f: sub_fix(b,
        ', just like every business costs more to operate than the base salary suggests.',
        '.'
    ), dry_run)

    # D7: text-8-2-1 awkward "reviewing the UCF BIP resource center"
    print('  D7: Fix text-8-2-1 opening')
    apply_to_all_files('lesson-8-2', 'text-8-2-1', lambda b, f: sub_fix(b,
        'With your readiness assessment complete, think of this as reviewing the [UCF BIP](https://incubator.ucf.edu) resource center before you finish. You would not finish this program without picking up the materials that turn everything you learned into a real plan. These four downloadable resources do exactly that:',
        'With your readiness assessment complete, download the four resources that turn what you learned into an actionable plan:'
    ), dry_run)

    # D8: text-5-1-2 Central Florida shopping center scene-setting
    print('  D8: Fix location scene-setting in text-5-1-2')
    apply_to_all_files('lesson-5-1', 'text-5-1-2', lambda b, f: sub_fix(b,
        'Walk through any outlet shopping center in Central Florida and you will notice something: even discount retailers price strategically, not cheaply.',
        'Even discount retailers in the U.S. price strategically, not cheaply.'
    ), dry_run)

    # D9: text-2-3-fund "walk in there" fragment + cleanup
    print('  D9: Fix text-2-3-fund opening')
    apply_to_all_files('lesson-2-3', 'text-2-3-fund', lambda b, f: sub_fix(b,
        'Most early-stage founders are not ready to walk in there yet.',
        'Most early-stage founders are not ready for investor funding yet.'
    ), dry_run)

    # D10: kt-8-2-1 — "The takeaway is this:" already removed by Phase A.
    # Fix the "do not move forward without your tools" phrasing
    print('  D10: Fix kt-8-2-1 phrasing')
    apply_to_all_files('lesson-8-2', 'kt-8-2-1', lambda b, f: sub_fix(b,
        'do not move forward without your tools.',
        'download these resources before your 1:1 meeting with UCF BIP.'
    ), dry_run)

    # D11: text-6-3-2 — thin misstep #5
    # The "What does that mean for you?" filler was already removed by Phase A
    # Add context before the cost figure
    print('  D11: Strengthen misstep #5 in text-6-3-2')
    apply_to_all_files('lesson-6-3', 'text-6-3-2', lambda b, f: sub_fix(b,
        'Founders spend $3,000-$7,000 per trip for meetings that could be video calls.',
        'Many founders fly to the U.S. for preliminary meetings that could be handled on Zoom. A single trip costs $3,000-$7,000 in flights, hotels, and ground transportation.'
    ), dry_run)
    apply_to_all_files('lesson-6-3', 'text-6-3-2', lambda b, f: sub_fix(b,
        'Founders spend $3,000\u2013$7,000 per trip for meetings that could be video calls.',
        'Many founders fly to the U.S. for preliminary meetings that could be handled on Zoom. A single trip costs $3,000\u20137,000 in flights, hotels, and ground transportation.'
    ), dry_run)

    # D12: kt-8-3-1 promotional closing
    print('  D12: Fix promotional closing in kt-8-3-1')
    apply_to_all_files('lesson-8-3', 'kt-8-3-1', lambda b, f: sub_fix(b,
        'Central Florida is ready for you, and the UCF BIP team is ready to help you succeed.',
        'The UCF BIP team is available to help you plan your next steps.'
    ), dry_run)

    # D13: callout-3-2-funfact — "ground your operation" rocket metaphor
    print('  D13: Fix rocket metaphor in callout-3-2-funfact')
    apply_to_all_files('lesson-3-2', 'callout-3-2-funfact', lambda b, f: sub_fix(b,
        'For business founders, the parallel is clear, just as every launch requires a safety review, every business needs protection against the risks that could ground your operation.',
        'That focus on risk assessment applies to every business operating in Florida today.'
    ), dry_run)
    apply_to_all_files('lesson-3-2', 'callout-3-2-funfact', lambda b, f: sub_fix(b,
        'For business founders, the parallel is clear: just as every launch requires a safety review, every business needs protection against the risks that could ground your operation.',
        'That focus on risk assessment applies to every business operating in Florida today.'
    ), dry_run)

    # D14: text-2-3-2 — "400 bank branches" non-sequitur breaking flow
    print('  D14: Move 400 bank branches out of credit-building flow')
    apply_to_all_files('lesson-2-3', 'text-2-3-2', lambda b, f: sub_fix(b,
        ' The good news is that Central Florida has over 400 bank branches and credit union locations, so once you have your documents in order, options are plentiful. Here is how to build credit:',
        ' Here is how to build credit:'
    ), dry_run)

    # D15: " . " stray space-period after bold labels — global pattern
    print('  D15: Fix stray " . " after bold labels (global)')
    _fix_stray_periods(dry_run)

    # D16: " : " stray space before colon — global pattern
    print('  D16: Fix stray " : " spacing (global)')
    _fix_stray_colons(dry_run)


def _fix_copyright_office(block):
    """Fix USPTO/Copyright Office in comparison card."""
    # Check in sections/items structure
    text = json.dumps(block)
    if 'USPTO/Copyright Office' in text:
        new_text = text.replace('USPTO/Copyright Office', 'U.S. Copyright Office')
        new_block = json.loads(new_text)
        block.clear()
        block.update(new_block)
        return True
    return False


def _fix_accordion_content(lesson_id, block_id, section_heading, old_text, new_text, dry_run):
    global fix_count
    files = LESSON_FILES_MAP.get(lesson_id, [])
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
        for sec in block.get('sections', []):
            if section_heading.lower() in sec.get('heading', '').lower():
                content = sec.get('content', '')
                if old_text in content:
                    sec['content'] = content.replace(old_text, new_text)
                    mark_dirty(fpath)
                    record_change(lesson_id, block_id)
                    applied = True
    if applied:
        fix_count += 1
        print(f'    Fixed {block_id}/{section_heading}: {old_text} -> {new_text}')


def _fix_stray_periods(dry_run):
    """Fix '</strong> . ' pattern globally — change to '</strong>. '"""
    global fix_count
    all_files = set()
    for files in LESSON_FILES_MAP.values():
        all_files.update(files)

    total = 0
    for fpath in sorted(all_files):
        data = load_file(fpath)
        if data is None:
            continue
        text = json.dumps(data, ensure_ascii=False)
        if '</strong> . ' in text or '</strong> .' in text:
            count = text.count('</strong> . ') + text.count('</strong> .')
            text = text.replace('</strong> . ', '</strong>. ')
            text = text.replace('</strong> .', '</strong>.')
            new_data = json.loads(text)
            _file_cache[fpath] = new_data
            mark_dirty(fpath)
            total += count

    if total > 0:
        fix_count += total
        print(f'    Fixed {total} stray periods after </strong>')


def _fix_stray_colons(dry_run):
    """Fix ' : ' (space-colon-space) pattern in content — except in URLs."""
    global fix_count
    all_files = set()
    for files in LESSON_FILES_MAP.values():
        all_files.update(files)

    total = 0
    for fpath in sorted(all_files):
        data = load_file(fpath)
        if data is None:
            continue
        text = json.dumps(data, ensure_ascii=False)
        # Only fix ' : ' that is NOT part of a URL (http: or https:)
        # Use regex to find ' : ' not preceded by http or https
        import re
        new_text = re.sub(r'(?<!http)(?<!https) : ', ': ', text)
        if new_text != text:
            count = len(text) - len(new_text)  # rough count
            count = text.count(' : ') - new_text.count(' : ')
            _file_cache[fpath] = json.loads(new_text)
            mark_dirty(fpath)
            total += count

    if total > 0:
        fix_count += total
        print(f'    Fixed {total} stray space-colon patterns')


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='UCF Business Course editorial fix v5')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--phase', type=str, help='Run single phase (A-D)')
    args = parser.parse_args()

    phases = {'A': phase_A, 'B': phase_B, 'C': phase_C, 'D': phase_D}

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
    manifest_path = os.path.join(BASE, 'changed-blocks-manifest-v5.json')
    if not args.dry_run:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f'\nManifest written to: changed-blocks-manifest-v5.json')
    else:
        print(f'\n[DRY-RUN] Would write manifest: changed-blocks-manifest-v5.json')
        print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
