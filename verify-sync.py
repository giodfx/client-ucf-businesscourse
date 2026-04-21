#!/usr/bin/env python3
"""
Post-fix verification: confirms all three file layers are in sync
and no residual metaphor language remains in body text.

Checks:
  1. Block content matches across all layers for each lesson
  2. No residual location-as-metaphor in body text (storefront, tower,
     Financial District, beach/current/riptide, City Hall, etc.)
  3. Specific editorial items are confirmed done (LLC table, KC Q3, etc.)
"""
import json, os, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

# ── Same lesson→file map as the fix script ──────────────────────────────
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
    'lesson-7-5': ['phase1-lessons/lesson-7-5.json', 'generated/content-phase1-module7.json'],
    'lesson-8-1': ['phase1-lessons/lesson-8-1.json', 'generated/content-phase1-module8.json'],
    'lesson-8-2': ['phase1-lessons/lesson-8-2.json', 'generated/content-phase1-module8.json'],
    'lesson-8-3': ['phase1-lessons/lesson-8-3.json', 'generated/content-phase1-module8.json'],
}

# ── Metaphor patterns to flag (case-insensitive) ────────────────────────
# Only flag in body text blocks, NOT in fun-fact callouts
METAPHOR_PATTERNS = [
    # Storefront/tower location-as-metaphor (not simple similes like "address on your storefront")
    'flexible storefront',
    'set up in the storefront',
    'the storefront and the tower',
    'the tower',
    # Financial District as location (not module title)
    'walk into the Financial District',
    'office in the Financial District',
    'building in the Financial District',
    'leave the Financial District',
    'edge of the Financial District',
    # City Hall metaphor
    'City Hall',
    'city hall',
    # Beach/ocean metaphor
    'the beach has',
    'beach currents',
    'riptide',
    'pulled under',
    'beachfront property',
    'sandbars',
    'shoreline where',
    # Theme park/attraction metaphor
    'attraction district',
    'every attraction has',
    'sticker price',
    'every ride has',
    # Launch/space metaphor
    'launch facility',
    # Building/district metaphor
    'building in the city',
    'the big buildings',
    'walk from City Hall',
    'walked past the tax',
    'service counter near the exit',
    'investor tower',
    # River journey
    'full length of the river',
    # Residual
    'Orlando metro area',
    'most international founders',
    'Most international founders',
]

# Blocks that are EXEMPT from metaphor checks (fun-fact callouts)
EXEMPT_BLOCK_PREFIXES = ['callout-', 'fun-fact-']
EXEMPT_BLOCK_IDS = set()  # specific IDs to exempt if needed


def load_json(rel_path):
    full = os.path.join(BASE, rel_path)
    if not os.path.exists(full):
        return None
    with open(full, encoding='utf-8') as f:
        return json.load(f)


def find_lesson_in_data(data, lesson_id):
    if 'lessonId' in data and data['lessonId'] == lesson_id:
        return data
    for lesson in data.get('lessons', []):
        if lesson.get('lessonId') == lesson_id:
            return lesson
    return None


def get_block_content_map(lesson_data):
    """Return {blockId: content_string} for all content blocks."""
    result = {}
    for block in lesson_data.get('contentBlocks', []):
        bid = block.get('id', '')
        # Serialize the whole block for comparison (catches structured fields too)
        result[bid] = json.dumps(block, sort_keys=True, ensure_ascii=False)
    return result


def check_metaphors_in_block(block, lesson_id):
    """Check a single block for residual metaphor patterns. Returns list of findings."""
    bid = block.get('id', '')
    btype = block.get('type', '')

    # Skip fun-fact callouts — metaphor is intentional there
    if any(bid.startswith(p) for p in EXEMPT_BLOCK_PREFIXES):
        if 'funfact' in bid or 'fun-fact' in bid:
            return []

    # Skip knowledge-check blocks (quiz content)
    if btype == 'knowledge-check':
        return []

    findings = []
    text_fields = []

    # Collect all text from the block
    for field in ['content', 'description', 'title']:
        val = block.get(field, '')
        if isinstance(val, str) and val:
            text_fields.append((field, val))

    # Check tab content
    for tab in block.get('tabs', []):
        tc = tab.get('content', '')
        if isinstance(tc, str) and tc:
            text_fields.append(('tab.content', tc))

    # Check scenario paths
    for path in block.get('paths', []):
        for pf in ['outcome', 'description']:
            pv = path.get(pf, '')
            if isinstance(pv, str) and pv:
                text_fields.append((f'path.{pf}', pv))

    # Check columns (comparison cards)
    for col in block.get('columns', []):
        for item in col.get('items', []):
            if isinstance(item, dict):
                iv = item.get('value', '')
                if isinstance(iv, str) and iv:
                    text_fields.append(('column.item.value', iv))
            elif isinstance(item, str) and item:
                text_fields.append(('column.item', item))

    for field_name, text in text_fields:
        text_lower = text.lower()
        for pattern in METAPHOR_PATTERNS:
            if pattern.lower() in text_lower:
                findings.append(f'  [{lesson_id}][{bid}].{field_name}: contains "{pattern}"')

    return findings


def main():
    issues = 0
    sync_errors = 0
    metaphor_findings = []

    print('=' * 70)
    print('UCF Business Course — Post-Fix Verification')
    print('=' * 70)

    # ── Check 1: Cross-layer sync ────────────────────────────────────────
    print('\n--- CHECK 1: Cross-Layer Block Sync ---\n')

    for lesson_id, files in sorted(LESSON_FILES.items()):
        if len(files) < 2:
            continue  # only one file, no sync to check

        # Get block content from first file
        data0 = load_json(files[0])
        if data0 is None:
            print(f'  WARN: {files[0]} not found')
            continue
        lesson0 = find_lesson_in_data(data0, lesson_id)
        if lesson0 is None:
            continue
        blocks0 = get_block_content_map(lesson0)

        for other_file in files[1:]:
            data_other = load_json(other_file)
            if data_other is None:
                continue
            lesson_other = find_lesson_in_data(data_other, lesson_id)
            if lesson_other is None:
                continue
            blocks_other = get_block_content_map(lesson_other)

            for bid, content0 in blocks0.items():
                content_other = blocks_other.get(bid)
                if content_other is None:
                    # Block missing in other file — could be normal (different file structures)
                    continue
                if content0 != content_other:
                    print(f'  MISMATCH [{lesson_id}][{bid}]: {files[0]} vs {other_file}')
                    sync_errors += 1

    if sync_errors == 0:
        print('  All blocks in sync across all layers.')
    else:
        print(f'\n  {sync_errors} SYNC MISMATCHES found!')
    issues += sync_errors

    # ── Check 2: Residual metaphors in body text ─────────────────────────
    print('\n--- CHECK 2: Residual Metaphors in Body Text ---\n')

    # Check all phase1-lessons files (canonical)
    for lesson_id in sorted(LESSON_FILES.keys()):
        phase1_file = f'phase1-lessons/{lesson_id}.json'
        data = load_json(phase1_file)
        if data is None:
            continue
        lesson = find_lesson_in_data(data, lesson_id)
        if lesson is None:
            continue

        for block in lesson.get('contentBlocks', []):
            findings = check_metaphors_in_block(block, lesson_id)
            metaphor_findings.extend(findings)

    if not metaphor_findings:
        print('  No residual metaphors found in body text.')
    else:
        for f in metaphor_findings:
            print(f)
        print(f'\n  {len(metaphor_findings)} residual metaphor instances found!')
    issues += len(metaphor_findings)

    # ── Check 3: Specific editorial items ────────────────────────────────
    print('\n--- CHECK 3: Specific Editorial Items ---\n')

    editorial_pass = 0
    editorial_fail = 0

    # 3a: LLC table — "any visa holder can own" should be gone
    data = load_json('phase1-lessons/lesson-1-1.json')
    if data:
        lesson = find_lesson_in_data(data, 'lesson-1-1')
        if lesson:
            for block in lesson.get('contentBlocks', []):
                if block.get('id') == 'int-1-1-1':
                    block_str = json.dumps(block, ensure_ascii=False)
                    if 'any visa holder can own' in block_str.lower():
                        print('  FAIL: int-1-1-1 still contains "any visa holder can own"')
                        editorial_fail += 1
                    else:
                        print('  PASS: int-1-1-1 LLC immigration compatibility updated')
                        editorial_pass += 1

    # 3b: KC Q3 diversification — should NOT test "best entity for investors"
    if data:
        lesson = find_lesson_in_data(data, 'lesson-1-1')
        if lesson:
            for block in lesson.get('contentBlocks', []):
                if block.get('id') == 'kc-1-1':
                    questions = block.get('questions', [])
                    if len(questions) >= 3:
                        q3 = questions[2]
                        stem = q3.get('stem', '')
                        if 'registered agent' in stem.lower():
                            print('  PASS: kc-1-1 Q3 now tests registered agent (diversified)')
                            editorial_pass += 1
                        elif 'investor' in stem.lower() or 'venture capital' in stem.lower():
                            print('  FAIL: kc-1-1 Q3 still tests investor-entity theme (same as Q1)')
                            editorial_fail += 1
                        else:
                            print(f'  INFO: kc-1-1 Q3 stem: "{stem[:80]}..."')
                            editorial_pass += 1

    # 3c: callout-0-1-cm — should be trimmed (not 7 examples)
    data = load_json('phase1-lessons/lesson-0-1.json')
    if data:
        lesson = find_lesson_in_data(data, 'lesson-0-1')
        if lesson:
            for block in lesson.get('contentBlocks', []):
                if block.get('id') == 'callout-0-1-cm':
                    content = block.get('content', '')
                    if 'Look for this callout in every module' in content:
                        print('  PASS: callout-0-1-cm trimmed with "Look for this callout" CTA')
                        editorial_pass += 1
                    else:
                        print('  FAIL: callout-0-1-cm not properly trimmed')
                        editorial_fail += 1

    # 3d: text-0-1-1 — "eight modules" not "seven modules"
    if data:
        lesson = find_lesson_in_data(data, 'lesson-0-1')
        if lesson:
            for block in lesson.get('contentBlocks', []):
                if block.get('id') == 'text-0-1-1':
                    content = block.get('content', '')
                    if 'seven modules' in content.lower():
                        print('  FAIL: text-0-1-1 still says "seven modules"')
                        editorial_fail += 1
                    elif 'eight modules' in content.lower():
                        print('  PASS: text-0-1-1 now says "eight modules"')
                        editorial_pass += 1

    # 3e: "Most founders" should be "Many founders" in text-0-1-0
    if data:
        lesson = find_lesson_in_data(data, 'lesson-0-1')
        if lesson:
            for block in lesson.get('contentBlocks', []):
                if block.get('id') == 'text-0-1-0':
                    content = block.get('content', '')
                    if 'Most founders' in content:
                        print('  FAIL: text-0-1-0 still says "Most founders"')
                        editorial_fail += 1
                    elif 'Many founders' in content:
                        print('  PASS: text-0-1-0 says "Many founders"')
                        editorial_pass += 1

    # 3f: text-2-2-vat — should NOT contain "Financial District" / "building" analogy
    data = load_json('phase1-lessons/lesson-2-2.json')
    if data:
        lesson = find_lesson_in_data(data, 'lesson-2-2')
        if lesson:
            for block in lesson.get('contentBlocks', []):
                if block.get('id') == 'text-2-2-vat':
                    content = block.get('content', '')
                    if 'Financial District' in content or 'central building' in content:
                        print('  FAIL: text-2-2-vat still has Financial District / building analogy')
                        editorial_fail += 1
                    else:
                        print('  PASS: text-2-2-vat clean of Financial District metaphor')
                        editorial_pass += 1

    print(f'\n  Editorial checks: {editorial_pass} PASS, {editorial_fail} FAIL')
    issues += editorial_fail

    # ── Summary ──────────────────────────────────────────────────────────
    print('\n' + '=' * 70)
    if issues == 0:
        print('VERIFICATION PASSED — all checks clean')
    else:
        print(f'VERIFICATION FOUND {issues} ISSUE(S)')
    print('=' * 70)

    return 0 if issues == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
