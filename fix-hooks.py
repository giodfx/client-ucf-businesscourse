#!/usr/bin/env python3
"""
Fix opening hooks lost after analogy removal:
1. lesson-7-4 text-7-4-1: add engaging opening paragraph before the data headers
2. lesson-8-1 text-8-1-1: strengthen the dry opening into a proper hook
"""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))


# ─── lesson-7-4: Add opening hook before the data headers ───
HOOK_7_4 = (
    "<p>Most international founders in Central Florida are sitting on a trade advantage "
    "they haven\u2019t fully mapped yet. Florida is the number one U.S. state for Latin American "
    "and Caribbean trade by value. Orlando sits at the center of that network \u2014 not Miami, "
    "not Tampa. Understanding these trade corridors is not geography trivia: it is a sourcing, "
    "distribution, and partnership shortcut that most founders discover too late.</p>\n\n"
)

# ─── lesson-8-1: Strengthen the dry opening ───
NEW_OPENING_8_1 = (
    "<p>Here is a question most founders don\u2019t ask themselves until after they\u2019ve already "
    "spent money: <em>which parts of this system do I actually understand well enough to act on "
    "right now, and which parts are still unclear?</em> Having information is not the same as "
    "being ready. This module is a structured self-assessment \u2014 not a test, but a tool to "
    "identify your strongest areas and the gaps you still need to fill before committing "
    "time or money.</p>"
)


def fix_file(fpath, lesson_id, block_id, transform_fn):
    full = os.path.join(BASE, fpath)
    if not os.path.exists(full):
        print(f"  SKIP: {fpath}")
        return
    data = json.load(open(full, encoding='utf-8'))
    lessons = data.get('lessons', [data])
    changed = False
    for lesson in lessons:
        if lesson.get('lessonId') == lesson_id:
            for b in lesson.get('contentBlocks', []):
                if b.get('id') == block_id:
                    old = b['content']
                    new = transform_fn(old)
                    if new != old:
                        b['content'] = new
                        changed = True
                        print(f"  FIXED {lesson_id}[{block_id}] in {fpath}")
    if changed:
        with open(full, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  SAVED {fpath}")
    else:
        print(f"  NO CHANGE: {fpath}")


print("=== Fix Opening Hooks ===\n")

# Fix lesson-7-4
for fpath in ['generated/content-phase1-module7.json', 'phase1-lessons/lesson-7-4.json']:
    fix_file(fpath, 'lesson-7-4', 'text-7-4-1',
             lambda c: HOOK_7_4 + c)

# Fix lesson-8-1
for fpath in ['generated/content-phase1-module8.json', 'phase1-lessons/lesson-8-1.json']:
    fix_file(fpath, 'lesson-8-1', 'text-8-1-1',
             lambda c: c.replace(
                 '<p>You have completed seven modules. Now is the time to take an honest look at where you stand. Having information is not the same as being ready. The goal of this module is to identify your gaps and clarify what help you need before committing time or money.</p>',
                 NEW_OPENING_8_1
             ))

print("\n=== DONE ===")
