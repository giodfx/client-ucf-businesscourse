#!/usr/bin/env python3
"""
UCF Business Course - Content Update Pass 1
- Fix lesson-0-1: update fun-fact (remove I-4 ref), clean road-trip analogy
- Add missing fun-fact callouts (2-1, 2-3, 3-1, 3-3, 7-4)
- Clean analogy language from lesson-8-1 and lesson-8-3
- Update lesson-3-1 title (Launch Facility → Space Center)
- Apply to both generated/ and phase1-lessons/ files
"""
import json, sys, io, os, copy
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.abspath(__file__))

# ───────────────────────────────────────────────
# FUN-FACT CALLOUT DEFINITIONS
# ───────────────────────────────────────────────

FUN_FACTS = {
    # Updated fun-fact for lesson-0-1 (replace I-4 reference)
    "lesson-0-1": {
        "id": "callout-0-1-funfact",
        "type": "callout",
        "variant": "fun-fact",
        "title": "Did You Know?",
        "content": "<p>Florida has more foreign-born business owners per capita than almost any other U.S. state. The greater Orlando area alone is home to entrepreneurs from over 70 countries, and the state's bilingual business community means international founders can find advisors, mentors, and early customers who already understand the challenges of cross-border expansion — professionally and culturally.</p>"
    },
    "lesson-2-1": {
        "id": "callout-2-1-funfact",
        "type": "callout",
        "variant": "fun-fact",
        "title": "Did You Know?",
        "content": "<p>Florida is one of only nine U.S. states with no state personal income tax, and it has no corporate income tax for LLCs or S-corporations taxed as pass-throughs. That structure attracts thousands of international founders who establish their U.S. operations here specifically to reduce the overall tax burden on their business — but the federal tax system still applies in full, and understanding it is what this lesson is about.</p>"
    },
    "lesson-2-3": {
        "id": "callout-2-3-funfact",
        "type": "callout",
        "variant": "fun-fact",
        "title": "Did You Know?",
        "content": "<p>Florida has more international bank branches than any U.S. state except New York, and several Latin American banks have established their first U.S. presence in the Miami and Orlando corridors. For an international founder, this matters: there are institutions in Florida that already understand cross-border finance, foreign income documentation, and the compliance requirements of founders who arrive without a U.S. credit history.</p>"
    },
    "lesson-3-1": {
        "id": "callout-3-1-funfact",
        "type": "callout",
        "variant": "fun-fact",
        "title": "Did You Know?",
        "content": "<p>Kennedy Space Center at Cape Canaveral has generated more than 1,800 patent citations since the 1960s — including technologies that became the basis for scratch-resistant lenses, memory foam, and wireless headsets. The region's aerospace ecosystem created a culture of protecting ideas early. That same infrastructure of IP attorneys and technology licensing offices is now available to commercial founders building businesses across Central Florida.</p>"
    },
    "lesson-3-3": {
        "id": "callout-3-3-funfact",
        "type": "callout",
        "variant": "fun-fact",
        "title": "Did You Know?",
        "content": "<p>Florida's Space Coast region hosts over 550 aerospace and defense companies, many of which operate almost entirely on contracts — with government agencies, prime contractors, and each other. The region built one of the most contract-intensive business cultures in the United States. That discipline around written agreements applies to every business operating in Florida today, not just aerospace.</p>"
    },
    "lesson-7-4": {
        "id": "callout-7-4-funfact",
        "type": "callout",
        "variant": "fun-fact",
        "title": "Did You Know?",
        "content": "<p>Central Florida's spring-fed rivers — including the St. Johns and the Econlockhatchee — flow eastward and eventually reach the Atlantic Coast, connecting the region's inland springs to open water. The region's trade infrastructure works the same way: goods, capital, and business relationships from Central Florida's inland business parks and incubators flow outward through Port Canaveral, Port Tampa Bay, and Miami International Airport to markets across Latin America, the Caribbean, and beyond.</p>"
    },
}

# ───────────────────────────────────────────────
# ANALOGY TEXT CLEANERS
# ───────────────────────────────────────────────

def clean_lesson_0_1(blocks):
    """Fix lesson-0-1 analogy blocks"""
    for b in blocks:
        # text-0-1-0: remove last paragraph (road trip GPS metaphor)
        if b.get('id') == 'text-0-1-0' and 'road trip' in b.get('content',''):
            old = b['content']
            # Remove the road trip paragraph
            para = '<p>Think of this as the start of a road trip through Central Florida\'s business landscape. Your GPS is loaded, your dashboard is lit, and seven destinations stretch out ahead of you. By the time you return, you will know the territory, even if you decide not to move there yet.</p>'
            b['content'] = old.replace(para, '').strip()
            print(f"  CLEANED analogy from text-0-1-0")

        # callout-0-1-funfact: replace content
        if b.get('id') == 'callout-0-1-funfact':
            b['content'] = FUN_FACTS['lesson-0-1']['content']
            b['title'] = 'Did You Know?'
            print(f"  UPDATED fun-fact content in callout-0-1-funfact")

        # text-0-1-3: remove opening journey/destination paragraphs
        if b.get('id') == 'text-0-1-3':
            c = b.get('content', '')
            if 'journey' in c or 'destination' in c:
                # Remove first two paragraphs (journey + route)
                journey_para = '<p>Think of this program as a journey through Central Florida\'s business ecosystem. Each module is a destination in that system\u2014from the city center where businesses are formed, to the financial district where money flows, to the protection zone where ideas are secured.</p>'
                route_para = '<p>You are in control of the route. You can explore the system in any order based on your priorities.</p>'
                c = c.replace(journey_para, '').replace(route_para, '').strip()
                # Add a clean intro sentence if block now starts with <ul>
                if c.startswith('<ul>') or c.startswith('<p><ul>'):
                    c = '<p>This program is structured as a set of standalone modules. Here is how to navigate it effectively:</p>\n\n' + c
                b['content'] = c
                print(f"  CLEANED analogy from text-0-1-3")
    return blocks


def clean_lesson_8_1(blocks):
    """Fix lesson-8-1: remove road trip opening from text-8-1-1"""
    for b in blocks:
        if b.get('id') == 'text-8-1-1' and 'road trip' in b.get('content',''):
            old = b['content']
            # Replace first two paragraphs with clean version
            new_opening = '<p>You have completed seven modules. Now is the time to take an honest look at where you stand. Having information is not the same as being ready. The goal of this module is to identify your gaps and clarify what help you need before committing time or money.</p>'
            # Find end of second </p> and replace everything before it
            # The old starts with <p>After seven... </p>\n\n<p>Standing here...  </p>\n\n<h4>
            import re
            pattern = r'^<p>After seven.*?</p>\s*<p>Standing here.*?</p>'
            replaced = re.sub(pattern, new_opening, old, flags=re.DOTALL)
            if replaced != old:
                b['content'] = replaced
                print(f"  CLEANED road trip opening from text-8-1-1")
            else:
                # Try simpler replacement
                parts = old.split('<h4>')
                if len(parts) > 1:
                    b['content'] = new_opening + '\n\n<h4>' + '<h4>'.join(parts[1:])
                    print(f"  CLEANED road trip opening from text-8-1-1 (fallback)")
    return blocks


def clean_lesson_8_3(blocks):
    """Fix lesson-8-3: remove map/journey metaphor from text-8-3-2"""
    for b in blocks:
        if b.get('id') == 'text-8-3-2':
            c = b.get('content','')
            if 'journey' in c or 'gave you the map' in c:
                # Replace "Phase 1 gave you the map. Your continued journey with UCF BIP puts you on the road."
                old_intro = 'Phase 1 gave you the map. Your continued journey with UCF BIP puts you on the road. This program is Phase 1: the foundation before spending money in the U.S. market.'
                new_intro = 'This program is Phase 1: the foundation before spending money in the U.S. market. Now it is time to decide what comes next.'
                b['content'] = c.replace(old_intro, new_intro)
                print(f"  CLEANED journey metaphor from text-8-3-2")
    return blocks


def fix_lesson_3_1_title(blocks):
    """Update lesson-3-1 first block title: Launch Facility → Space Center"""
    for b in blocks:
        if b.get('id') == 'text-3-1-1' and 'Launch Facility' in b.get('title',''):
            b['title'] = b['title'].replace('Launch Facility', 'Space Center')
            print(f"  UPDATED title: Launch Facility → Space Center in text-3-1-1")
    return blocks


def insert_fun_fact(blocks, lesson_id, after_index=0):
    """Insert fun-fact callout after specified index"""
    ff = FUN_FACTS.get(lesson_id)
    if not ff:
        print(f"  WARNING: No fun-fact defined for {lesson_id}")
        return blocks
    # Check if already exists
    existing = [b for b in blocks if b.get('id') == ff['id'] or b.get('variant') == 'fun-fact']
    if existing:
        print(f"  SKIP: fun-fact already exists in {lesson_id}")
        return blocks
    new_block = {
        "type": ff["type"],
        "id": ff["id"],
        "variant": ff["variant"],
        "title": ff["title"],
        "content": ff["content"]
    }
    blocks.insert(after_index + 1, new_block)
    print(f"  ADDED fun-fact callout to {lesson_id} at position {after_index+1}")
    return blocks


# ───────────────────────────────────────────────
# PROCESS A LESSON'S CONTENT BLOCKS
# ───────────────────────────────────────────────

def process_lesson(lesson):
    lid = lesson.get('lessonId','')
    blocks = lesson.get('contentBlocks', [])

    if lid == 'lesson-0-1':
        blocks = clean_lesson_0_1(blocks)

    elif lid == 'lesson-2-1':
        blocks = insert_fun_fact(blocks, lid, after_index=0)

    elif lid == 'lesson-2-3':
        blocks = insert_fun_fact(blocks, lid, after_index=0)

    elif lid == 'lesson-3-1':
        blocks = fix_lesson_3_1_title(blocks)
        blocks = insert_fun_fact(blocks, lid, after_index=0)

    elif lid == 'lesson-3-3':
        blocks = insert_fun_fact(blocks, lid, after_index=0)

    elif lid == 'lesson-7-4':
        blocks = insert_fun_fact(blocks, lid, after_index=0)

    elif lid == 'lesson-8-1':
        blocks = clean_lesson_8_1(blocks)

    elif lid == 'lesson-8-3':
        blocks = clean_lesson_8_3(blocks)

    lesson['contentBlocks'] = blocks
    return lesson


# ───────────────────────────────────────────────
# PROCESS GENERATED/ FILES
# ───────────────────────────────────────────────

def process_generated_file(fpath):
    full = os.path.join(BASE, fpath)
    if not os.path.exists(full):
        print(f"  SKIP (not found): {fpath}")
        return
    print(f"\n--- Processing {fpath} ---")
    data = json.load(open(full, encoding='utf-8'))

    # Generated files have { lessons: [...] } or single lesson
    if 'lessons' in data:
        for i, lesson in enumerate(data['lessons']):
            lid = lesson.get('lessonId','')
            print(f"  Lesson: {lid}")
            data['lessons'][i] = process_lesson(lesson)
    else:
        # Single lesson format
        lid = data.get('lessonId','')
        print(f"  Lesson: {lid}")
        data = process_lesson(data)

    with open(full, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  SAVED {fpath}")


# ───────────────────────────────────────────────
# PROCESS PHASE1-LESSONS/ FILES
# ───────────────────────────────────────────────

def process_phase1_lesson_file(lid):
    fpath = os.path.join(BASE, f'phase1-lessons/{lid}.json')
    if not os.path.exists(fpath):
        print(f"  SKIP (not found): {fpath}")
        return
    print(f"\n--- Processing phase1-lessons/{lid}.json ---")
    data = json.load(open(fpath, encoding='utf-8'))
    data = process_lesson(data)
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  SAVED phase1-lessons/{lid}.json")


# ───────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────

print("=== UCF Business Course - Content Update Pass 1 ===\n")

# Generated files (both hyphen and non-hyphen variants)
generated_files = [
    'generated/content-phase1-module-0.json',
    'generated/content-phase1-module0.json',
    'generated/content-phase1-module2.json',
    'generated/content-phase1-module-2.json',
    'generated/content-phase1-module3.json',
    'generated/content-phase1-module7.json',
    'generated/content-phase1-module8.json',
]
for f in generated_files:
    process_generated_file(f)

# Phase1-lessons files
phase1_lessons = [
    'lesson-0-1',
    'lesson-2-1',
    'lesson-2-3',
    'lesson-3-1',
    'lesson-3-3',
    'lesson-7-4',
    'lesson-8-1',
    'lesson-8-3',
]
for lid in phase1_lessons:
    process_phase1_lesson_file(lid)

print("\n=== DONE ===")
