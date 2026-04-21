#!/usr/bin/env python3
"""Fix HTML issues in text-0-1-3 after analogy removal"""
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

fixes = {
    'generated/content-phase1-module-0.json': {
        # "<p>intro</p>\n\nul><li>..." -> fix missing < before ul
        'old': '\n\nul><li>',
        'new': '\n\n<ul><li>'
    },
    'generated/content-phase1-module0.json': {
        # Missing <p> tag around middle sentence
        'old': '\n\nThis self-paced program is designed for flexibility.',
        'new': '\n\n<p>This self-paced program is designed for flexibility.'
    },
    'phase1-lessons/lesson-0-1.json': {
        'old': '\n\nThis self-paced program is designed for flexibility.',
        'new': '\n\n<p>This self-paced program is designed for flexibility.'
    },
}

for fpath, fix in fixes.items():
    data = json.load(open(fpath, encoding='utf-8'))
    lessons = data.get('lessons', [data])
    for lesson in lessons:
        if lesson.get('lessonId') == 'lesson-0-1':
            for b in lesson.get('contentBlocks', []):
                if b.get('id') == 'text-0-1-3':
                    old = b['content']
                    new = old.replace(fix['old'], fix['new'])
                    b['content'] = new
                    if new != old:
                        print(f'FIXED HTML in {fpath}')
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'SAVED {fpath}')

print('DONE')
