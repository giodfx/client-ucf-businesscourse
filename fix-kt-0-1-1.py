#!/usr/bin/env python3
"""Fix kt-0-1-1 key-takeaway block: remove road trip closing paragraph."""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

OLD_PARA = (
    "<p>Think of this module as the first stop on your road trip, the dashboard view "
    "before you start driving. It will not do the work for you, but it shows you the "
    "destinations ahead, the roads to take, and the detours to avoid. Now you know the "
    "territory. Time to explore.</p>"
)

NEW_PARA = (
    "<p>This is your starting point. You have not entered the U.S. market yet \u2014 "
    "you have mapped it. Now you know the territory. Time to explore.</p>"
)

for fpath in ['generated/content-phase1-module0.json', 'phase1-lessons/lesson-0-1.json']:
    full = os.path.join(BASE, fpath)
    data = json.load(open(full, encoding='utf-8'))
    lessons = data.get('lessons', [data])
    changed = False
    for lesson in lessons:
        if lesson.get('lessonId') == 'lesson-0-1':
            for b in lesson.get('contentBlocks', []):
                if b.get('id') == 'kt-0-1-1':
                    old = b['content']
                    new = old.replace(OLD_PARA, NEW_PARA)
                    if new != old:
                        b['content'] = new
                        changed = True
                        print(f'  FIXED kt-0-1-1 in {fpath}')
                    else:
                        print(f'  NO MATCH in {fpath} — checking raw...')
                        if 'road trip' in old:
                            print(f'  WARNING: road trip still present but pattern did not match')
    if changed:
        with open(full, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  SAVED {fpath}')

print('\n=== DONE ===')
