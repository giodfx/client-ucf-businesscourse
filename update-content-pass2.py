#!/usr/bin/env python3
"""
UCF Business Course - Content Update Pass 2
Fixes not caught in Pass 1:
1. lesson-0-1 text-0-1-3: remove journey paragraph (encoding-aware regex)
2. lesson-7-4 text-7-4-1: remove springs analogy from body text
"""
import json, sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.abspath(__file__))


def process_file(fpath, lesson_id, block_id, transform_fn):
    full = os.path.join(BASE, fpath)
    if not os.path.exists(full):
        print(f"  SKIP (not found): {fpath}")
        return
    data = json.load(open(full, encoding='utf-8'))
    lessons = data.get('lessons', [data]) if 'lessons' in data else [data]
    changed = False
    for lesson in lessons:
        if lesson.get('lessonId') == lesson_id:
            for b in lesson.get('contentBlocks', []):
                if b.get('id') == block_id:
                    old = b.get('content', '')
                    new = transform_fn(old)
                    if new != old:
                        b['content'] = new
                        changed = True
                        print(f"  FIXED {lesson_id}[{block_id}] in {fpath}")
                    else:
                        print(f"  NO CHANGE (already clean or no match): {lesson_id}[{block_id}] in {fpath}")
    if changed:
        with open(full, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  SAVED {fpath}")


# ─── Fix 1: lesson-0-1 text-0-1-3 — remove opening journey/destination paragraphs ───
def fix_0_1_3(content):
    # Remove the "Think of this program as a journey..." paragraph (first <p>...</p>)
    # Use regex to match it regardless of quote style
    c = content
    # Remove journey intro paragraph
    c = re.sub(
        r'<p>\s*Think of this program as a journey.*?</p>\s*',
        '',
        c,
        flags=re.DOTALL
    )
    # Remove "You are in control of the route" paragraph if still present
    c = re.sub(
        r'<p>\s*You are in control of the route.*?</p>\s*',
        '',
        c,
        flags=re.DOTALL
    )
    c = c.strip()
    # If content now starts with <ul> or empty <p>, add a clean intro
    if c.startswith('<ul>') or c.startswith('<p><ul>') or c.startswith('<p></p>'):
        c = c.lstrip('<p></p>').strip()
        c = '<p>This program is structured as a set of standalone modules. Here is how to navigate it effectively:</p>\n\n' + c
    return c


# ─── Fix 2: lesson-7-4 text-7-4-1 — remove springs analogy from opening ───
def fix_7_4_1(content):
    c = content
    # Remove "Now, here is where it gets interesting for LATAM founders. Just as Florida's spring-fed rivers..."
    # Everything up to the first <h4>
    # Pattern: opening paragraph that contains analogy
    c = re.sub(
        r'^<p>\s*Now,?\s*here is where it gets interesting.*?</p>\s*',
        '',
        c,
        flags=re.DOTALL
    )
    c = c.strip()
    return c


# ─── Files to process ───
print("=== UCF Business Course - Content Update Pass 2 ===\n")

# All files containing lesson-0-1
for fpath in [
    'generated/content-phase1-module-0.json',
    'generated/content-phase1-module0.json',
    'phase1-lessons/lesson-0-1.json',
]:
    process_file(fpath, 'lesson-0-1', 'text-0-1-3', fix_0_1_3)

# All files containing lesson-7-4
for fpath in [
    'generated/content-phase1-module7.json',
    'phase1-lessons/lesson-7-4.json',
]:
    process_file(fpath, 'lesson-7-4', 'text-7-4-1', fix_7_4_1)

print("\n=== DONE ===")
