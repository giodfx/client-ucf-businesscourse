#!/usr/bin/env python3
"""Add scenario block to lesson-7-3 between dataviz-7-3b and kc-7-3."""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

SCENARIO = {
    "type": "scenario",
    "id": "scenario-7-3-market-entry",
    "title": "Reading the Numbers — Applying the Data",
    "description": (
        "Elena is a founder from Brazil evaluating U.S. market entry. She has $180,000 in capital, "
        "needs to hire one developer and one office coordinator, and is comparing Central Florida "
        "against two other U.S. markets. Based on the economic data in this lesson, which conclusion "
        "is best supported?"
    ),
    "paths": [
        {
            "label": "Central Florida gives Elena the longest operational runway",
            "outcome": (
                "Correct. Developer salaries in Central Florida run $85K\u2013$100K versus $130K\u2013$160K "
                "in Silicon Valley. The cost of living index is 98 \u2014 nearly half of New York (187). "
                "Florida charges $125 to form an LLC and zero state income tax. For a founder with "
                "$180,000, these differences are not marginal \u2014 they determine whether she reaches "
                "her next milestone or runs out of capital trying. Runway is the first filter at seed stage."
            ),
            "isRecommended": True
        },
        {
            "label": "Silicon Valley is better because the tech talent pool is deeper",
            "outcome": (
                "This ignores what the data actually shows. A $40\u2013$75K annual salary difference per "
                "developer is not a rounding error on a $180K budget \u2014 it is the difference between "
                "18 months of runway and 10. A deeper talent pool does not help a founder who burns "
                "through capital before reaching traction. Central Florida has real tech, defense, and "
                "simulation clusters. For early-stage hiring, depth of pool is less important than "
                "cost-to-hire."
            ),
            "isRecommended": False
        },
        {
            "label": "Industry cluster fit matters more than cost differences at this stage",
            "outcome": (
                "This reverses the correct priority order. Cluster fit matters \u2014 but it is a second-order "
                "filter, not the first. A founder who chooses a market based on cluster alignment but runs "
                "out of capital before traction gains nothing from that alignment. Central Florida has its "
                "own industry clusters (tech, simulation, defense, healthcare, logistics). Choosing it "
                "does not require a trade-off between cost and fit."
            ),
            "isRecommended": False
        },
        {
            "label": "300,000+ annual business filings means the market is too competitive",
            "outcome": (
                "This misreads the data. High filing volume reflects economic activity and opportunity, "
                "not saturation. A market where 300,000+ businesses are forming each year is a market "
                "with active demand, supplier networks, and customer bases worth targeting. Saturation "
                "is sector-specific \u2014 not something you can read from total filing volume. The data "
                "point is an indicator of ecosystem health, not a warning sign."
            ),
            "isRecommended": False
        }
    ]
}


def add_scenario(fpath, lesson_id):
    full = os.path.join(BASE, fpath)
    if not os.path.exists(full):
        print(f'  SKIP: {fpath}')
        return
    data = json.load(open(full, encoding='utf-8'))
    lessons = data.get('lessons', [data])
    changed = False
    for lesson in lessons:
        if lesson.get('lessonId') == lesson_id:
            blocks = lesson.get('contentBlocks', [])
            # Find insertion index: after dataviz-7-3b, before kc-7-3
            insert_at = None
            for i, b in enumerate(blocks):
                if b.get('id') == 'dataviz-7-3b':
                    insert_at = i + 1
                    break
            if insert_at is None:
                print(f'  WARNING: dataviz-7-3b not found in {fpath}')
                return
            # Check not already inserted
            if any(b.get('id') == 'scenario-7-3-market-entry' for b in blocks):
                print(f'  ALREADY EXISTS in {fpath}')
                return
            blocks.insert(insert_at, SCENARIO)
            changed = True
            print(f'  INSERTED scenario-7-3-market-entry at position {insert_at} in {fpath}')
    if changed:
        with open(full, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  SAVED {fpath}')


add_scenario('phase1-lessons/lesson-7-3.json', 'lesson-7-3')
add_scenario('generated/content-phase1-module7.json', 'lesson-7-3')

print('\n=== DONE ===')
