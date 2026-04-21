#!/usr/bin/env python3
"""
Apply Brian Bedrick's reviewer feedback to Module 0 and Module 1 content.
Fixes found during audit of Mar 18/19 feedback docs against current JSON content.
"""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

fixes_by_lesson = {

    # ── lesson-0-1 ───────────────────────────────────────────────────────
    'lesson-0-1': [
        {
            'block': 'callout-0-1-funfact',
            'field': 'content',
            'old': 'The greater Orlando area alone is home to entrepreneurs from over 70 countries',
            'new': 'Central Florida alone is home to entrepreneurs from over 70 countries',
            'note': 'Orlando area → Central Florida (Brian: stick with Central Florida not Orlando)',
        },
        {
            'block': 'text-0-1-0',
            'field': 'content',
            'old': 'Most founders assume the hard part is paperwork.',
            'new': 'Many founders assume the hard part is paperwork.',
            'note': 'most → many (Brian: be careful with absolute language)',
        },
    ],

    # ── lesson-1-1 ───────────────────────────────────────────────────────
    'lesson-1-1': [
        {
            'block': 'callout-1-1-cm',
            'field': 'content',
            'old': 'Choosing the wrong entity type for their visa or tax situation.',
            'new': 'Choosing the wrong entity type for your visa or tax situation.',
            'note': 'their → your (Brian: address user directly)',
        },
        {
            'block': 'text-1-1-entity-intro',
            'field': 'content',
            'old': 'which rules out most international founders.',
            'new': 'which rules out many international founders.',
            'note': 'most → many',
        },
        {
            'block': 'kt-1-1-1',
            'field': 'content',
            'old': 'For most international founders, the real choice is between an LLC',
            'new': 'For many international founders, the real choice is between an LLC',
            'note': 'most → many',
        },
        {
            # Soften the conversion story: remove specific dollar/time/quote
            'block': 'text-1-1-4',
            'field': 'content',
            'old': (
                'The switch took three months, cost over three thousand dollars in legal fees, '
                'and nearly killed the deal. She later said: \u201cIf someone had told me to start '
                'with a C-Corp, I would have saved a quarter of my first year.\u201d'
            ),
            'new': (
                'The switch took several months and significant legal fees, '
                'and nearly derailed the deal.'
            ),
            'note': 'Soften specific dollar/time ranges (Brian feedback). Remove attributed quote.',
        },
    ],

    # ── lesson-1-2 ───────────────────────────────────────────────────────
    'lesson-1-2': [
        {
            'block': 'text-1-2-0',
            'field': 'content',
            'old': 'Florida is where most international founders in this program will register',
            'new': 'Florida is where many international founders in this program will register',
            'note': 'most → many',
        },
        {
            'block': 'text-1-2-3',
            'field': 'content',
            'old': 'founders can use as their business address.',
            'new': 'founders can use as your business address.',
            'note': 'their → your (Brian: address user directly)',
        },
    ],

    # ── lesson-1-3 ───────────────────────────────────────────────────────
    'lesson-1-3': [
        {
            'block': 'callout-1-3-funfact',
            'field': 'content',
            'old': 'the Orlando\u2013Miami corridor has become a hub for international founders',
            'new': 'Central Florida has become a hub for international founders',
            'note': 'Orlando-Miami corridor → Central Florida (Brian: avoid corridor ref, keep focus on CFL)',
        },
    ],
}

# Map lessons to their generated module files
LESSON_MODULE_MAP = {
    'lesson-0-1': ['generated/content-phase1-module0.json', 'generated/content-phase1-module-0.json'],
    'lesson-1-1': ['generated/content-phase1-module1.json'],
    'lesson-1-2': ['generated/content-phase1-module1.json'],
    'lesson-1-3': ['generated/content-phase1-module1.json'],
}


def apply_fixes(fpath, lesson_id, lesson_fixes):
    full = os.path.join(BASE, fpath)
    if not os.path.exists(full):
        return False
    data = json.load(open(full, encoding='utf-8'))
    lessons = data.get('lessons', [data])
    changed = False
    for lesson in lessons:
        if lesson.get('lessonId') == lesson_id:
            for fix in lesson_fixes:
                for b in lesson.get('contentBlocks', []):
                    if b.get('id') == fix['block']:
                        field = fix['field']
                        val = b.get(field, '')
                        if isinstance(val, str) and fix['old'] in val:
                            b[field] = val.replace(fix['old'], fix['new'])
                            changed = True
                            print(f'  FIXED [{lesson_id}][{fix["block"]}] — {fix["note"]}')
                        elif isinstance(val, str) and fix['old'] not in val:
                            # Try without unicode escapes (in case entities differ)
                            pass
    if changed:
        with open(full, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  SAVED {fpath}')
    return changed


print('=== Applying Brian Feedback Fixes — Modules 0 & 1 ===\n')

for lesson_id, lesson_fixes in fixes_by_lesson.items():
    print(f'--- {lesson_id} ---')

    # 1. Fix phase1-lessons file
    phase_path = f'phase1-lessons/{lesson_id}.json'
    apply_fixes(phase_path, lesson_id, lesson_fixes)

    # 2. Fix generated module files
    for gen_path in LESSON_MODULE_MAP.get(lesson_id, []):
        apply_fixes(gen_path, lesson_id, lesson_fixes)

    print()

print('=== DONE ===')
