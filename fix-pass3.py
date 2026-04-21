#!/usr/bin/env python3
import json, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def fix_block(content):
    c = content
    c = re.sub(r'<p>\s*Think of this program as (a journey|a road trip).*?</p>\s*', '', c, flags=re.DOTALL)
    c = re.sub(r'<p>\s*You are (in control of the route|behind the wheel).*?</p>\s*', '', c, flags=re.DOTALL)
    c = c.lstrip('<p></p>').strip()
    if c.startswith('<ul>') or (c and not c.startswith('<p>')):
        c = '<p>This program is structured as a set of standalone modules. Here is how to navigate it effectively:</p>\n\n' + c
    return c

for fpath in ['generated/content-phase1-module0.json', 'phase1-lessons/lesson-0-1.json']:
    data = json.load(open(fpath, encoding='utf-8'))
    lessons = data.get('lessons', [data])
    for lesson in lessons:
        if lesson.get('lessonId') == 'lesson-0-1':
            for b in lesson.get('contentBlocks', []):
                if b.get('id') == 'text-0-1-3':
                    old = b['content']
                    new = fix_block(old)
                    b['content'] = new
                    if new != old:
                        print(f'FIXED in {fpath}')
                        print('NEW START:', repr(new[:200]))
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'SAVED {fpath}')

print('DONE')
