#!/usr/bin/env python3
"""
Phase F fixup: apply "most"→"many" and "Orlando metro"→"Central Florida"
to phase1-lessons/ files (Phase F of the main script only scanned generated/).
"""
import json, os, sys, io, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

changes = 0

for fpath in sorted(glob.glob(os.path.join(BASE, 'phase1-lessons', 'lesson-*.json'))):
    rel = os.path.relpath(fpath, BASE).replace('\\', '/')
    with open(fpath, encoding='utf-8') as f:
        data = json.load(f)

    file_changed = False
    lesson_id = data.get('lessonId', '')

    for block in data.get('contentBlocks', []):
        bid = block.get('id', '')
        btype = block.get('type', '')

        # Skip quiz explanations — "most" is factually correct for S-Corp
        if btype == 'knowledge-check':
            continue

        for field in ['content', 'description']:
            val = block.get(field, '')
            if not isinstance(val, str):
                continue

            changed = False
            if 'most international founders' in val:
                val = val.replace('most international founders', 'many international founders')
                changed = True
            if 'most participants' in val:
                val = val.replace('most participants', 'many participants')
                changed = True
            if 'Most international founders' in val:
                val = val.replace('Most international founders', 'Many international founders')
                changed = True
            if 'Orlando metro area' in val:
                val = val.replace('Orlando metro area', 'Central Florida')
                changed = True

            if changed:
                block[field] = val
                file_changed = True
                changes += 1
                print(f'  FIXED [{lesson_id}][{bid}].{field} in {rel}')

        # Also check scenario paths
        for path in block.get('paths', []):
            outcome = path.get('outcome', '')
            if isinstance(outcome, str) and 'most participants' in outcome:
                path['outcome'] = outcome.replace('most participants', 'many participants')
                file_changed = True
                changes += 1
                print(f'  FIXED [{lesson_id}][{bid}] scenario outcome in {rel}')
            if isinstance(outcome, str) and 'most international founders' in outcome:
                path['outcome'] = outcome.replace('most international founders', 'many international founders')
                file_changed = True
                changes += 1
                print(f'  FIXED [{lesson_id}][{bid}] scenario outcome in {rel}')

        # Check tab content
        for tab in block.get('tabs', []):
            tc = tab.get('content', '')
            if isinstance(tc, str) and 'most international founders' in tc:
                tab['content'] = tc.replace('most international founders', 'many international founders')
                file_changed = True
                changes += 1
                print(f'  FIXED [{lesson_id}][{bid}] tab content in {rel}')

    if file_changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  SAVED: {rel}')

print(f'\nTotal fixes: {changes}')
