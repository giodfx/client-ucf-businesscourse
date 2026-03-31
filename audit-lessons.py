#!/usr/bin/env python3
"""Post-implementation audit — verify all Phase A changes applied correctly."""
import json, glob, sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

issues = []
for f in sorted(glob.glob('phase1-lessons/lesson-*.json')):
    with open(f, encoding='utf-8') as fh:
        d = json.load(fh)
    lid = d.get('lessonId', '?')
    blocks = d.get('contentBlocks', [])
    kc = [b for b in blocks if b.get('type') == 'knowledge-check']
    ex = [b for b in blocks if b.get('type') == 'exercise']
    ref = [b for b in blocks if b.get('type') == 'reflection']
    kt = [b for b in blocks if b.get('type') == 'key-takeaway']

    # KC checks
    if len(kc) != 1:
        issues.append(f'{lid}: {len(kc)} KC blocks (expected 1)')
    else:
        if kc[0].get('title') != 'What Would You Do?':
            issues.append(f'{lid}: KC title = "{kc[0].get("title")}"')
        qcount = len(kc[0].get('questions', []))
        if qcount != 3:
            issues.append(f'{lid}: KC has {qcount} questions (expected 3)')

    # Key takeaway
    if len(kt) != 1:
        issues.append(f'{lid}: {len(kt)} key-takeaway blocks')

    # Empty text blocks
    for b in blocks:
        if b.get('type') == 'text' and not b.get('content', '').strip():
            issues.append(f'{lid}: Empty text block "{b.get("title","?")}"')

    # Check no "Handshake" callout in 3-2
    if lid == 'lesson-3-2':
        for b in blocks:
            if 'Handshake' in b.get('title', ''):
                issues.append(f'{lid}: Handshake callout still present (should have moved to 6-2)')

    # Check "Handshake" callout IS in 6-2
    if lid == 'lesson-6-2':
        found = any('Handshake' in b.get('title', '') for b in blocks)
        if not found:
            issues.append(f'{lid}: Handshake callout NOT found (should have been moved here)')

    print(f'{lid}: {len(blocks):2d} blocks | KC:{len(kc)} Ex:{len(ex)} Ref:{len(ref)} KT:{len(kt)}')

print()
if issues:
    print(f'ISSUES ({len(issues)}):')
    for i in issues:
        print(f'  ! {i}')
else:
    print('ALL CHECKS PASSED - 26 lessons verified')
