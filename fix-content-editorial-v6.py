#!/usr/bin/env python3
"""
Editorial fix script V6 for UCF Business Course.
Final humanization pass — mechanical artifacts from v1-v5 find-and-replace.

Phases:
  A: Lowercase sentence starts after <p> (10 blocks)
  B: Empty <p></p> tags and whitespace artifacts (4 blocks)
  C: Comma splice + surviving fillers (8 blocks)

Usage:
  python fix-content-editorial-v6.py              # apply all
  python fix-content-editorial-v6.py --dry-run    # preview only
  python fix-content-editorial-v6.py --phase A    # single phase
"""
import json, sys, io, os, argparse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

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


def apply_to_all_files(lesson_id, block_id, apply_fn):
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
# PHASE A: LOWERCASE SENTENCE STARTS AFTER <p>
# Artifacts from v1-v5 filler phrase removal left sentences starting
# with lowercase after <p> tags.
# ═══════════════════════════════════════════════════════════════════════════

PHASE_A_FIXES = [
    # (lesson_id, block_id, old_substr, new_substr)
    ('lesson-1-3', 'text-1-3-2', '<p>walking into a bank', '<p>Walking into a bank'),
    ('lesson-1-3', 'text-1-3-3', '<p>some banks will not', '<p>Some banks will not'),
    ('lesson-2-1', 'callout-2-1-2', '<p>your home country may', '<p>Your home country may'),
    ('lesson-2-2', 'callout-2-2-2', '<p>not all CPAs are', '<p>Not all CPAs are'),
    ('lesson-3-1', 'callout-3-1-wm', '<p>plan your IP budget', '<p>Plan your IP budget'),
    ('lesson-5-2', 'text-5-2-3', '<p>offer a free trial', '<p>Offer a free trial'),
    ('lesson-7-2', 'text-7-2-4', '<p>international founders relocate', '<p>International founders relocate'),
    ('lesson-8-1', 'text-8-1-1', '<p>before you sign anything', '<p>Before you sign anything'),
    ('lesson-8-1', 'callout-8-1-1', '<p>you now know more', '<p>You now know more'),
    ('lesson-8-2', 'kt-8-2-1', '<p>download these resources', '<p>Download these resources'),
]


def run_phase_a(dry_run):
    print('\n══ PHASE A: Lowercase sentence starts ══')
    for lesson_id, block_id, old, new in PHASE_A_FIXES:
        label = f'  [{lesson_id}/{block_id}] "{old[:30]}..." → "{new[:30]}..."'
        ok = apply_to_all_files(lesson_id, block_id,
                                lambda b, f: sub_fix(b, old, new))
        print(f'{label} {"✓" if ok else "⚠ NOT FOUND"}')


# ═══════════════════════════════════════════════════════════════════════════
# PHASE B: EMPTY TAGS AND WHITESPACE ARTIFACTS
# ═══════════════════════════════════════════════════════════════════════════

def run_phase_b(dry_run):
    print('\n══ PHASE B: Empty tags + whitespace artifacts ══')

    # B1: callout-1-1-cm — empty <p></p> at start
    ok = apply_to_all_files('lesson-1-1', 'callout-1-1-cm',
        lambda b, f: sub_fix(b, '<p></p>\n\n<ul>', '<ul>'))
    # If newlines are different, try without
    if not ok:
        ok = apply_to_all_files('lesson-1-1', 'callout-1-1-cm',
            lambda b, f: sub_fix(b, '<p></p><ul>', '<ul>'))
    print(f'  [lesson-1-1/callout-1-1-cm] Remove empty <p></p> {"✓" if ok else "⚠ NOT FOUND"}')

    # B2: text-8-1-3 — empty <p></p> before <h4>
    ok = apply_to_all_files('lesson-8-1', 'text-8-1-3',
        lambda b, f: sub_fix(b, '<p></p><h4>', '<h4>'))
    print(f'  [lesson-8-1/text-8-1-3] Remove empty <p></p> {"✓" if ok else "⚠ NOT FOUND"}')

    # B3: text-2-3-fund — extra space after <p>
    ok = apply_to_all_files('lesson-2-3', 'text-2-3-fund',
        lambda b, f: sub_fix(b, '<p> Most early-stage', '<p>Most early-stage'))
    print(f'  [lesson-2-3/text-2-3-fund] Remove extra space {"✓" if ok else "⚠ NOT FOUND"}')

    # B4: text-3-2-1 — trailing whitespace/newlines at end of content
    def fix_trailing(block, fpath):
        val = block.get('content', '')
        stripped = val.rstrip()
        if stripped != val:
            block['content'] = stripped
            return True
        return False
    ok = apply_to_all_files('lesson-3-2', 'text-3-2-1', fix_trailing)
    print(f'  [lesson-3-2/text-3-2-1] Strip trailing whitespace {"✓" if ok else "⚠ NOT FOUND"}')


# ═══════════════════════════════════════════════════════════════════════════
# PHASE C: COMMA SPLICE + SURVIVING FILLERS
# ═══════════════════════════════════════════════════════════════════════════

PHASE_C_FILLERS = [
    # (lesson_id, block_id, old_substr, new_substr, label)
    ('lesson-1-3', 'callout-1-3-funfact',
     'international founders, the banking infrastructure here is',
     'international founders. The banking infrastructure here is',
     'Comma splice → period'),

    ('lesson-4-1', 'callout-4-1-cm',
     '<p>Notice how these mistakes connect:</p>',
     '',
     'Remove orphaned filler sentence'),

    ('lesson-1-2', 'callout-1-2-wm',
     'Notice how registration-related costs can add up faster than expected.',
     'Registration-related costs can add up faster than expected.',
     'Remove "Notice how" filler'),

    ('lesson-2-3', 'callout-2-3-1',
     "Here\u2019s the thing. <strong>",
     '<strong>',
     'Remove "Here\'s the thing." filler'),

    # Try straight quote variant too
    ('lesson-2-3', 'callout-2-3-1',
     "Here's the thing. <strong>",
     '<strong>',
     'Remove "Here\'s the thing." filler (alt quote)'),

    ('lesson-7-3', 'text-7-3-1',
     "Let\u2019s break this down. Orlando-Kissimmee-Sanford",
     'Orlando-Kissimmee-Sanford',
     'Remove "Let\'s break this down." filler'),

    ('lesson-7-3', 'text-7-3-1',
     "Let's break this down. Orlando-Kissimmee-Sanford",
     'Orlando-Kissimmee-Sanford',
     'Remove "Let\'s break this down." filler (alt quote)'),

    ('lesson-7-2', 'text-7-2-2',
     'Now, consider the institutional backbone. Every strong startup',
     'Every strong startup',
     'Remove "Now, consider" filler sentence'),

    ('lesson-6-3', 'callout-6-3-wm',
     'Now, consider these real dollar figures from',
     'These are real dollar figures from',
     'Rewrite "Now, consider" opening'),

    ('lesson-6-2', 'text-6-2-1',
     'The short version: start with 30 minutes.',
     'Start with 30 minutes.',
     'Remove "The short version:" filler'),

    ('lesson-7-2', 'text-7-2-3',
     'Here is where Central Florida stands out. The startup culture',
     'Central Florida stands out for its startup culture. The',
     'Remove "Here is where" filler'),
]


def run_phase_c(dry_run):
    print('\n══ PHASE C: Comma splice + surviving fillers ══')
    for lesson_id, block_id, old, new, label in PHASE_C_FILLERS:
        ok = apply_to_all_files(lesson_id, block_id,
                                lambda b, f, o=old, n=new: sub_fix(b, o, n))
        print(f'  [{lesson_id}/{block_id}] {label} {"✓" if ok else "⚠ NOT FOUND"}')


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--phase', type=str, default=None,
                        help='Run only this phase (A, B, C)')
    args = parser.parse_args()

    print('═══ UCF Business Course — Editorial Fix V6 ═══')
    print(f'Mode: {"DRY-RUN" if args.dry_run else "APPLY"}')

    phases = {
        'A': run_phase_a,
        'B': run_phase_b,
        'C': run_phase_c,
    }

    if args.phase:
        p = args.phase.upper()
        if p in phases:
            phases[p](args.dry_run)
        else:
            print(f'Unknown phase: {p}')
            sys.exit(1)
    else:
        for p in ['A', 'B', 'C']:
            phases[p](args.dry_run)

    # Save
    print(f'\n── Summary ──')
    print(f'  Fixes applied: {fix_count}')
    file_count = save_all(args.dry_run)
    print(f'  Files {"would save" if args.dry_run else "saved"}: {file_count}')

    # Manifest
    manifest = {}
    for lid, bids in sorted(changed_blocks.items()):
        manifest[lid] = sorted(bids)
    print(f'  Blocks changed: {sum(len(v) for v in manifest.values())} across {len(manifest)} lessons')

    mpath = os.path.join(BASE, 'changed-blocks-manifest-v6.json')
    if not args.dry_run:
        with open(mpath, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print(f'  Manifest: changed-blocks-manifest-v6.json')


if __name__ == '__main__':
    main()
