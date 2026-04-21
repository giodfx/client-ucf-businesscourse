#!/usr/bin/env python3
"""
Comprehensive editorial fix script for UCF Business Course.
Phases A-F: Sync resolution, structural fixes, metaphor cleanup.

Updates ALL THREE file layers:
  1. phase1-lessons/{lessonId}.json
  2. generated/content-phase1-module{N}.json  (no hyphen — HTML generator)
  3. generated/content-phase1-module-{N}.json (hyphen — Visualizer, modules 0 & 2)

Usage:
  python fix-content-editorial.py              # apply all phases
  python fix-content-editorial.py --dry-run    # preview changes only
  python fix-content-editorial.py --phase A    # run single phase
"""
import json, sys, io, os, argparse, copy

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
BASE = os.path.dirname(os.path.abspath(__file__))

# ── FILE LAYER MAP ─────────────────────────────────────────────────────────
# Every lesson → all files it appears in (relative to BASE)
LESSON_FILES = {
    'lesson-0-1': [
        'phase1-lessons/lesson-0-1.json',
        'generated/content-phase1-module0.json',
        'generated/content-phase1-module-0.json',
    ],
    'lesson-1-1': ['phase1-lessons/lesson-1-1.json', 'generated/content-phase1-module1.json'],
    'lesson-1-2': ['phase1-lessons/lesson-1-2.json', 'generated/content-phase1-module1.json'],
    'lesson-1-3': ['phase1-lessons/lesson-1-3.json', 'generated/content-phase1-module1.json'],
    'lesson-2-1': [
        'phase1-lessons/lesson-2-1.json',
        'generated/content-phase1-module2.json',
        'generated/content-phase1-module-2.json',
    ],
    'lesson-2-2': [
        'phase1-lessons/lesson-2-2.json',
        'generated/content-phase1-module2.json',
        'generated/content-phase1-module-2.json',
    ],
    'lesson-2-3': [
        'phase1-lessons/lesson-2-3.json',
        'generated/content-phase1-module2.json',
        'generated/content-phase1-module-2.json',
    ],
    'lesson-3-1': ['phase1-lessons/lesson-3-1.json', 'generated/content-phase1-module3.json'],
    'lesson-3-2': ['phase1-lessons/lesson-3-2.json', 'generated/content-phase1-module3.json'],
    'lesson-3-3': ['phase1-lessons/lesson-3-3.json', 'generated/content-phase1-module3.json'],
    'lesson-4-1': ['phase1-lessons/lesson-4-1.json', 'generated/content-phase1-module4.json'],
    'lesson-4-2': ['phase1-lessons/lesson-4-2.json', 'generated/content-phase1-module4.json'],
    'lesson-4-3': ['phase1-lessons/lesson-4-3.json', 'generated/content-phase1-module4.json'],
    'lesson-5-1': ['phase1-lessons/lesson-5-1.json', 'generated/content-phase1-module5.json'],
    'lesson-5-2': ['phase1-lessons/lesson-5-2.json', 'generated/content-phase1-module5.json'],
    'lesson-6-1': ['phase1-lessons/lesson-6-1.json', 'generated/content-phase1-module6.json'],
    'lesson-6-2': ['phase1-lessons/lesson-6-2.json', 'generated/content-phase1-module6.json'],
    'lesson-6-3': ['phase1-lessons/lesson-6-3.json', 'generated/content-phase1-module6.json'],
    'lesson-7-1': ['phase1-lessons/lesson-7-1.json', 'generated/content-phase1-module7.json'],
    'lesson-7-2': ['phase1-lessons/lesson-7-2.json', 'generated/content-phase1-module7.json'],
    'lesson-7-3': ['phase1-lessons/lesson-7-3.json', 'generated/content-phase1-module7.json'],
    'lesson-7-4': ['phase1-lessons/lesson-7-4.json', 'generated/content-phase1-module7.json'],
    'lesson-7-5': ['phase1-lessons/lesson-7-5.json'],  # no generated module file
    'lesson-8-1': ['phase1-lessons/lesson-8-1.json', 'generated/content-phase1-module8.json'],
    'lesson-8-2': ['phase1-lessons/lesson-8-2.json', 'generated/content-phase1-module8.json'],
    'lesson-8-3': ['phase1-lessons/lesson-8-3.json', 'generated/content-phase1-module8.json'],
}

# ── UTILITIES ──────────────────────────────────────────────────────────────

_file_cache = {}
_dirty_files = set()
changed_blocks = {}  # {lessonId: [blockId, ...]}


def load_file(rel_path):
    full = os.path.join(BASE, rel_path)
    if rel_path not in _file_cache:
        if not os.path.exists(full):
            return None
        _file_cache[rel_path] = json.load(open(full, encoding='utf-8'))
    return _file_cache[rel_path]


def mark_dirty(rel_path):
    _dirty_files.add(rel_path)


def save_all(dry_run=False):
    for rel_path in sorted(_dirty_files):
        full = os.path.join(BASE, rel_path)
        if dry_run:
            print(f'  [DRY-RUN] Would save: {rel_path}')
        else:
            with open(full, 'w', encoding='utf-8') as f:
                json.dump(_file_cache[rel_path], f, ensure_ascii=False, indent=2)
            print(f'  SAVED: {rel_path}')


def find_lesson(data, lesson_id):
    """Find lesson dict inside a module file or standalone lesson file."""
    lessons = data.get('lessons', [data])
    for lesson in lessons:
        if lesson.get('lessonId') == lesson_id:
            return lesson
    return None


def find_block(lesson, block_id):
    for b in lesson.get('contentBlocks', []):
        if b.get('id') == block_id:
            return b
    return None


def record_change(lesson_id, block_id):
    changed_blocks.setdefault(lesson_id, set()).add(block_id)


def apply_to_all_files(lesson_id, block_id, apply_fn, dry_run=False):
    """Apply a function to a specific block across all file layers."""
    files = LESSON_FILES.get(lesson_id, [])
    for fpath in files:
        data = load_file(fpath)
        if data is None:
            continue
        lesson = find_lesson(data, lesson_id)
        if lesson is None:
            continue
        block = find_block(lesson, block_id)
        if block is None:
            continue
        if apply_fn(block, fpath):
            mark_dirty(fpath)
            record_change(lesson_id, block_id)


# ── PHASE A: SYNC RESOLUTION ──────────────────────────────────────────────

def run_phase_a(dry_run=False):
    print('\n' + '='*70)
    print('PHASE A: Sync Resolution — copy authoritative content from hyphen files')
    print('='*70)

    sync_specs = [
        {
            'lesson_id': 'lesson-0-1',
            'source_file': 'generated/content-phase1-module-0.json',
            'blocks': ['text-0-1-0', 'text-0-1-1', 'text-0-1-learn-first', 'text-0-1-3', 'kt-0-1-1'],
            'targets': ['phase1-lessons/lesson-0-1.json', 'generated/content-phase1-module0.json'],
        },
        {
            'lesson_id': 'lesson-2-2',
            'source_file': 'generated/content-phase1-module-2.json',
            'blocks': ['text-2-2-vat'],
            'targets': ['phase1-lessons/lesson-2-2.json', 'generated/content-phase1-module2.json'],
        },
    ]

    for spec in sync_specs:
        src_data = load_file(spec['source_file'])
        if src_data is None:
            print(f'  SKIP: {spec["source_file"]} not found')
            continue
        src_lesson = find_lesson(src_data, spec['lesson_id'])
        if src_lesson is None:
            print(f'  SKIP: {spec["lesson_id"]} not found in {spec["source_file"]}')
            continue

        for block_id in spec['blocks']:
            src_block = find_block(src_lesson, block_id)
            if src_block is None:
                print(f'  SKIP: {block_id} not found in source')
                continue

            src_content = src_block.get('content', '')
            src_title = src_block.get('title', '')

            for tgt_path in spec['targets']:
                tgt_data = load_file(tgt_path)
                if tgt_data is None:
                    continue
                tgt_lesson = find_lesson(tgt_data, spec['lesson_id'])
                if tgt_lesson is None:
                    continue
                tgt_block = find_block(tgt_lesson, block_id)
                if tgt_block is None:
                    continue

                if tgt_block.get('content', '') != src_content:
                    print(f'  SYNC [{spec["lesson_id"]}][{block_id}] → {tgt_path}')
                    if not dry_run:
                        tgt_block['content'] = src_content
                        if src_title and tgt_block.get('title', '') != src_title:
                            tgt_block['title'] = src_title
                    mark_dirty(tgt_path)
                    record_change(spec['lesson_id'], block_id)

    # Post-sync fix: "Most founders" → "Many founders" in text-0-1-0 across ALL files
    print('\n  Post-sync: "Most founders" → "Many founders" in text-0-1-0')

    def fix_most(block, fpath):
        old = block.get('content', '')
        if 'Most founders' in old:
            block['content'] = old.replace('Most founders', 'Many founders')
            print(f'    FIXED Most→Many in {fpath}')
            return True
        return False

    apply_to_all_files('lesson-0-1', 'text-0-1-0', fix_most, dry_run)


# ── PHASE B: MODULE 0 STRUCTURAL FIXES ─────────────────────────────────────

NEW_CALLOUT_CM = (
    '<p>Each module includes a "Common Mistakes" callout showing the errors '
    'that cost founders the most at that stage. Here are two examples:</p>\n\n'
    '<ul><li><strong>Wrong entity type:</strong> Choosing an LLC when your visa '
    'or investor plans require a C-Corp can cost thousands of dollars and months '
    'of delays to fix.</li>'
    '<li><strong>Ignoring sales tax:</strong> Unlike the VAT systems most '
    'international founders know, U.S. sales tax varies by state and even by '
    'city. Missing registration deadlines can trigger penalties before you '
    'make your first sale.</li></ul>\n\n'
    '<p><strong>Look for this callout in every module</strong> to spot the '
    'mistakes that matter most at each stage.</p>'
)

NEW_HOW_TO_USE = (
    '<p>This program is a set of standalone modules — you can start with '
    'whichever topic matters most to you and come back to the rest later. '
    'There are no deadlines, no exams, and no required order.</p>\n\n'
    '<p>Inside each module, short knowledge checks help you confirm key '
    'concepts as you go. They are ungraded and you can retake them as many '
    'times as you want. Look for the recurring "Common Mistakes" and '
    '"Watch Your Money" callouts — they flag the practical tips that save '
    'founders the most time and money.</p>\n\n'
    '<p>Module 7 includes a Market Entry Checklist, Florida Setup Roadmap, '
    'Central Florida Resource Guide, and Expansion Decision Worksheet. '
    'If you want to continue beyond this program, Phases 2 and 3 of UCF BIP '
    'are selective and based on readiness, business stage, and program criteria.</p>\n\n'
    '<p>One piece of advice before you start: read the content first, verify '
    'details with qualified professionals, and plan carefully before committing '
    'time or money.</p>\n\n'
    '<h4>Typical Timeline</h4>\n'
    '<p>Founders often ask: "How long does it take to get set up in the U.S.?" '
    'There is no single answer — every situation is different. Based on common '
    'experiences:</p>\n\n'
    '<ul><li><strong>Entity formation:</strong> Often completed in a few days '
    'online, but may take longer if additional documentation is required.</li>'
    '<li><strong>EIN application:</strong> Can be instant with a U.S. address; '
    'international submissions may take several weeks.</li>'
    '<li><strong>Bank account setup:</strong> Timelines vary widely depending '
    'on the bank, documents, and founder circumstances.</li>'
    '<li><strong>First customers / market entry:</strong> Building trust, '
    'completing vendor onboarding, and meeting insurance or procurement '
    'requirements can take several weeks to months.</li></ul>\n\n'
    '<p>Plan with realistic goals, confirm details with service providers, '
    'and stay flexible. Focus on knowing the process, not hitting a fixed date.</p>'
)


def run_phase_b(dry_run=False):
    print('\n' + '='*70)
    print('PHASE B: Module 0 Structural Fixes')
    print('='*70)

    # B1: Trim Common Mistakes callout
    def fix_cm(block, fpath):
        block['content'] = NEW_CALLOUT_CM
        print(f'  REPLACED callout-0-1-cm in {fpath}')
        return True
    apply_to_all_files('lesson-0-1', 'callout-0-1-cm', fix_cm, dry_run)

    # B2: Rewrite "How to Use" as narrative
    def fix_howto(block, fpath):
        block['content'] = NEW_HOW_TO_USE
        print(f'  REPLACED text-0-1-3 (How to Use) in {fpath}')
        return True
    apply_to_all_files('lesson-0-1', 'text-0-1-3', fix_howto, dry_run)

    # B3: "seven modules ahead" → "eight modules ahead"
    def fix_seven(block, fpath):
        old = block.get('content', '')
        if 'seven modules ahead' in old:
            block['content'] = old.replace('seven modules ahead', 'eight modules ahead')
            print(f'  FIXED seven→eight in text-0-1-1 ({fpath})')
            return True
        elif 'The seven modules ahead' in old:
            block['content'] = old.replace('The seven modules ahead', 'The eight modules ahead')
            print(f'  FIXED seven→eight in text-0-1-1 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-0-1', 'text-0-1-1', fix_seven, dry_run)


# ── PHASE C: MODULE 1 EDITORIAL FIXES ──────────────────────────────────────

NEW_TEXT_1_1_0 = (
    '<p>Before you file anything in Florida, you need to make one key '
    'decision: what kind of business entity to form. In Central Florida, '
    'the process starts online through a portal called '
    '<a href="https://sunbiz.org">SunBiz</a>.</p>\n\n'
    '<p>An LLC gives you flexibility and low overhead. A C-Corp gives you '
    'the structure investors expect. Both protect you from personal liability. '
    'But they work very differently when it comes to taxes, visas, and '
    'raising money.</p>\n\n'
    '<p>This lesson walks you through the two main options that work for '
    'international founders, and one that usually does not.</p>'
)

NEW_TEXT_1_1_ENTITY_INTRO = (
    '<p>An LLC is simple to set up, easy to run, and it keeps your personal '
    'assets separate from the business. A C-Corp requires more paperwork and '
    'formality, but it is the structure investors expect if you plan to raise '
    'venture capital. An S-Corp exists too, but it requires all shareholders '
    'to be U.S. citizens or residents, which rules out many international '
    'founders.</p>\n\n'
    '<p>The comparison below breaks down the key differences to help you '
    'decide which structure fits your situation.</p>'
)

NEW_TEXT_1_3_0 = (
    '<p>Your entity is registered and your EIN is on the way. Now you need '
    'a U.S. bank account — and for international founders, this is one of '
    'the most frustrating steps in the process.</p>\n\n'
    '<p>You filed your LLC, you have your EIN, and now a bank is asking for '
    'papers you have never heard of, or telling you they cannot work with '
    'foreign-owned entities.</p>\n\n'
    '<p>This is normal. And it is manageable if you know what to expect.</p>'
)

# New Q3 for kc-1-1: test registered agent / compliance concept instead of duplicating investor theme
NEW_KC_1_1_Q3 = {
    "stem": "You are forming a Florida LLC as an international founder. You do not live in the United States and have no physical U.S. address. Which of the following is required by Florida law?",
    "options": [
        "You must open a Florida bank account before filing with SunBiz",
        "You need a registered agent with a physical Florida address",
        "You must have a U.S. Social Security Number to form an LLC",
        "You need to hire a Florida-based attorney to file on your behalf"
    ],
    "correctAnswer": 1,
    "explanation": "Florida law requires every business entity to have a registered agent with a physical Florida address. This is not optional — if your registered agent lapses, the state can dissolve your entity. You do not need a bank account, SSN, or attorney to file with SunBiz, though all can be helpful. Commercial registered agent services are available for $50 to $200 per year."
}


def run_phase_c(dry_run=False):
    print('\n' + '='*70)
    print('PHASE C: Module 1 Editorial Fixes (lessons 1-1, 1-2, 1-3)')
    print('='*70)

    # ── lesson-1-1 ──

    # C1: Full replace text-1-1-0
    def fix_1_1_0(block, fpath):
        block['content'] = NEW_TEXT_1_1_0
        block['title'] = 'Choosing Your Entity — The First Decision'
        print(f'  REPLACED text-1-1-0 in {fpath}')
        return True
    apply_to_all_files('lesson-1-1', 'text-1-1-0', fix_1_1_0, dry_run)

    # C2: Full replace text-1-1-entity-intro
    def fix_entity_intro(block, fpath):
        block['content'] = NEW_TEXT_1_1_ENTITY_INTRO
        block['title'] = 'Three Structures, Three Different Paths'
        print(f'  REPLACED text-1-1-entity-intro in {fpath}')
        return True
    apply_to_all_files('lesson-1-1', 'text-1-1-entity-intro', fix_entity_intro, dry_run)

    # C3: text-1-1-4 substring fixes
    SUBS_1_1_4 = [
        (
            'The building you pick in the city determines which services you can access, what your operating costs look like, and who will want to do business with you. Here is how the pieces connect:',
            'Here is how the pieces connect:'
        ),
        (
            'The storefront and the tower have different paperwork at the bank counter. We cover this in detail in Lesson 3 of this module.',
            'LLCs and C-Corps require different documentation at the bank. We cover this in detail in Lesson 3 of this module.'
        ),
        (
            'The storefront has different utility costs than the tower. Module 2 goes deeper.',
            'Each structure has different tax obligations. Module 2 goes deeper.'
        ),
        # Remove duplicate investor story (keep the Colombian founder story, remove the anonymous one)
        (
            ' One founder spent thousands of dollars and months switching from a Florida LLC to a Delaware C-Corp when an investor required it. Starting with the right entity avoids this.',
            ' Starting with the right entity avoids this.'
        ),
    ]
    for old, new in SUBS_1_1_4:
        def make_fix(o, n):
            def fix(block, fpath):
                c = block.get('content', '')
                if o in c:
                    block['content'] = c.replace(o, n)
                    print(f'  FIXED text-1-1-4 substring in {fpath}')
                    return True
                return False
            return fix
        apply_to_all_files('lesson-1-1', 'text-1-1-4', make_fix(old, new), dry_run)

    # C4: kt-1-1-1 storefront/tower → LLC/C-Corp
    def fix_kt_1_1(block, fpath):
        c = block.get('content', '')
        if 'storefront or the tower' in c:
            block['content'] = c.replace(
                'Whether you set up in the storefront or the tower, that choice',
                'Whether you choose an LLC or a C-Corp, that choice'
            )
            print(f'  FIXED kt-1-1-1 storefront→LLC in {fpath}')
            return True
        return False
    apply_to_all_files('lesson-1-1', 'kt-1-1-1', fix_kt_1_1, dry_run)

    # C5: LLC Immigration Compatibility in comparison card
    def fix_llc_imm(block, fpath):
        cols = block.get('columns', [])
        for col in cols:
            if col.get('heading') == 'LLC':
                for item in col.get('items', []):
                    if item.get('label') == 'Immigration Compatibility':
                        old_val = item.get('value', '')
                        if 'any visa holder can own' in old_val:
                            item['value'] = 'Ownership is generally allowed, but your visa determines whether you can actively work in the business.'
                            print(f'  FIXED LLC Immigration Compatibility in {fpath}')
                            return True
        return False
    apply_to_all_files('lesson-1-1', 'int-1-1-1', fix_llc_imm, dry_run)

    # C6: callout-1-1-funfact "Orlando metro area" → "Central Florida"
    def fix_orlando(block, fpath):
        c = block.get('content', '')
        if 'Orlando metro area' in c:
            block['content'] = c.replace('Orlando metro area', 'Central Florida')
            print(f'  FIXED Orlando metro→Central FL in callout-1-1-funfact ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-1', 'callout-1-1-funfact', fix_orlando, dry_run)

    # C7: Diversify kc-1-1 Q3
    def fix_kc(block, fpath):
        qs = block.get('questions', [])
        if len(qs) >= 3:
            old_stem = qs[2].get('stem', '')
            if 'formed a Florida LLC eight months ago' in old_stem:
                qs[2] = NEW_KC_1_1_Q3
                print(f'  REPLACED kc-1-1 Q3 in {fpath}')
                return True
        return False
    apply_to_all_files('lesson-1-1', 'kc-1-1', fix_kc, dry_run)

    # ── lesson-1-2 ──

    # C8: SunBiz City Hall metaphor
    def fix_sunbiz(block, fpath):
        c = block.get('content', '')
        old = "Think of sunbiz.org as City Hall\u2019s online counter \u2014 you walk in, file your papers, and walk out with your business on the city registry."
        new = "Sunbiz.org is Florida\u2019s online business registration portal. File your information and your business is officially on record."
        if old in c:
            block['content'] = c.replace(old, new)
            print(f'  FIXED City Hall metaphor in text-1-2-1 ({fpath})')
            return True
        # Try without smart quotes
        old2 = "Think of sunbiz.org as City Hall's online counter — you walk in, file your papers, and walk out with your business on the city registry."
        if old2 in c:
            block['content'] = c.replace(old2, new.replace('\u2019', "'").replace('\u2014', '—'))
            print(f'  FIXED City Hall metaphor (alt) in text-1-2-1 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-2', 'text-1-2-1', fix_sunbiz, dry_run)

    # C9: Registered agent doorman metaphor
    def fix_doorman(block, fpath):
        c = block.get('content', '')
        old = 'Think of the registered agent as the doorman at your building address — someone who is there to receive official notices when you are not.'
        new = 'A registered agent is a person or service at a physical Florida address who receives official legal and government notices on your behalf.'
        if old in c:
            block['content'] = c.replace(old, new)
            print(f'  FIXED doorman metaphor in text-1-2-3 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-2', 'text-1-2-3', fix_doorman, dry_run)

    # C10: kt-1-2-1 City Hall metaphor
    def fix_kt_12(block, fpath):
        c = block.get('content', '')
        if 'trip to City Hall' in c:
            block['content'] = c.replace(
                'your trip to City Hall is one of the simplest stops in the city',
                'filing with SunBiz is one of the simplest steps in the process'
            )
            print(f'  FIXED City Hall in kt-1-2-1 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-2', 'kt-1-2-1', fix_kt_12, dry_run)

    # ── lesson-1-3 ──

    # C11: Full replace text-1-3-0
    def fix_1_3_0(block, fpath):
        block['content'] = NEW_TEXT_1_3_0
        block['title'] = 'Banking for International Founders — What to Expect'
        print(f'  REPLACED text-1-3-0 in {fpath}')
        return True
    apply_to_all_files('lesson-1-3', 'text-1-3-0', fix_1_3_0, dry_run)

    # C12: text-1-3-1 building security metaphor
    def fix_1_3_1(block, fpath):
        c = block.get('content', '')
        old = 'Think of each bank as a building with its own security protocol — some let you in with a passport and EIN, others want a full background check before they will buzz you through.'
        new = 'Each bank has its own verification requirements. Some approve accounts with a passport and EIN letter; others require additional documentation or in-person visits.'
        if old in c:
            block['content'] = c.replace(old, new)
            print(f'  FIXED building metaphor in text-1-3-1 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-3', 'text-1-3-1', fix_1_3_1, dry_run)

    # C13: text-1-3-3 doors in district
    def fix_1_3_3(block, fpath):
        c = block.get('content', '')
        old = 'some doors in this district are simply locked to founders who do not have the right credentials yet'
        new = 'some banks will not work with founders who do not have the right credentials yet'
        if old in c:
            block['content'] = c.replace(old, new)
            print(f'  FIXED doors metaphor in text-1-3-3 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-3', 'text-1-3-3', fix_1_3_3, dry_run)

    # C14: text-1-3-4 big buildings / smaller offices
    def fix_1_3_4(block, fpath):
        c = block.get('content', '')
        old = 'While you are working on getting into the big buildings, there are smaller offices on the same street that can handle your transactions.'
        new = 'While you are pursuing a traditional bank account, payment processors offer an alternative for accepting payments.'
        if old in c:
            block['content'] = c.replace(old, new)
            print(f'  FIXED big buildings metaphor in text-1-3-4 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-3', 'text-1-3-4', fix_1_3_4, dry_run)

    # C15: kt-1-3-1 financial district / doors
    def fix_kt_13(block, fpath):
        c = block.get('content', '')
        old = 'The financial district has its own rules, and not every door will open on the first try.'
        new = 'Banks have their own policies, and not every application will be approved on the first try.'
        if old in c:
            block['content'] = c.replace(old, new)
            print(f'  FIXED financial district in kt-1-3-1 ({fpath})')
            return True
        return False
    apply_to_all_files('lesson-1-3', 'kt-1-3-1', fix_kt_13, dry_run)


# ── PHASE D: MODULE 2 EDITORIAL FIXES ──────────────────────────────────────

def run_phase_d(dry_run=False):
    print('\n' + '='*70)
    print('PHASE D: Module 2 Editorial Fixes (lessons 2-1, 2-2, 2-3)')
    print('='*70)

    # Helper for simple substring fixes
    def sub_fix(lesson_id, block_id, old, new, note=''):
        def fix(block, fpath):
            c = block.get('content', '')
            if old in c:
                block['content'] = c.replace(old, new)
                print(f'  FIXED {block_id} in {fpath} — {note}')
                return True
            return False
        apply_to_all_files(lesson_id, block_id, fix, dry_run)

    def title_fix(lesson_id, block_id, old_title, new_title):
        def fix(block, fpath):
            if block.get('title', '') == old_title:
                block['title'] = new_title
                print(f'  FIXED title of {block_id} in {fpath}')
                return True
            return False
        apply_to_all_files(lesson_id, block_id, fix, dry_run)

    # ── lesson-2-1 ──
    sub_fix('lesson-2-1', 'text-2-1-1',
        'You have set up your entity and picked your business structure back in the city. Now the road leads into the Financial District, a corridor of accounting firms, tax offices, and bank branches where the real money questions get answered.',
        'You have set up your entity and picked your business structure. Now it is time to deal with the financial side: taxes, accounting, and the money questions that catch founders off guard.',
        'road → Financial District')

    sub_fix('lesson-2-1', 'text-2-1-2',
        'Think of your tax ID as the key to every building in the Financial District. Before you can file anything with the IRS, you need a tax identification number.',
        'Before you can file anything with the IRS, you need a tax identification number.',
        'key to every building')

    sub_fix('lesson-2-1', 'text-2-1-3',
        'Now that you know the lay of the Financial District, step inside the tax office. Your entity type decides how the IRS treats your income',
        'Your entity type decides how the IRS treats your income',
        'lay of the Financial District')

    sub_fix('lesson-2-1', 'kt-2-1-1',
        'The Financial District has its own rules \u2014 learn them before you walk in, and they work in your favor.',
        'Federal tax rules are straightforward once you know them \u2014 learn them before you file, and they work in your favor.',
        'Financial District rules')
    # Also try with plain dash
    sub_fix('lesson-2-1', 'kt-2-1-1',
        'The Financial District has its own rules — learn them before you walk in, and they work in your favor.',
        'Federal tax rules are straightforward once you know them — learn them before you file, and they work in your favor.',
        'Financial District rules (alt)')

    # ── lesson-2-2 ──
    title_fix('lesson-2-2', 'text-2-2-1',
        'Sales Tax and Bookkeeping, the Next Stop in the Financial District',
        'Sales Tax and Bookkeeping \u2014 What You Need to Know')

    sub_fix('lesson-2-2', 'text-2-2-1',
        'You have left the tax office and walked down the block to the next building in the Financial District: the compliance bureau. Here is where sales tax and bookkeeping rules live, and where',
        'Sales tax and bookkeeping are where',
        'walked down the block')

    sub_fix('lesson-2-2', 'text-2-2-vat',
        'In the Financial District, every building has different rules for visitors. VAT is like one central building with one set of rules. U.S. sales tax is like a district where every office makes its own \u2014 and you need a separate badge for each one.',
        'VAT is one national system with one set of rules. U.S. sales tax is the opposite: every state sets its own rates and rules, and you need to register separately in each one.',
        'Financial District building analogy')
    # Alt with plain dashes
    sub_fix('lesson-2-2', 'text-2-2-vat',
        'In the Financial District, every building has different rules for visitors. VAT is like one central building with one set of rules. U.S. sales tax is like a district where every office makes its own — and you need a separate badge for each one.',
        'VAT is one national system with one set of rules. U.S. sales tax is the opposite: every state sets its own rates and rules, and you need to register separately in each one.',
        'Financial District building analogy (alt)')
    # Also try the variant from the hyphen file (Brian's version has slightly different text)
    sub_fix('lesson-2-2', 'text-2-2-vat',
        'VAT is like one central building with one set of rules. U.S. sales tax is like a district where every office makes its own rules \u2014 and you need a separate badge for each one.',
        'VAT is one national system with one set of rules. U.S. sales tax is the opposite: every state sets its own rates and rules, and you need to register separately in each one.',
        'building analogy (hyphen variant)')
    sub_fix('lesson-2-2', 'text-2-2-vat',
        'VAT is like one central building with one set of rules. U.S. sales tax is like a district where every office makes its own rules — and you need a separate badge for each one.',
        'VAT is one national system with one set of rules. U.S. sales tax is the opposite: every state sets its own rates and rules, and you need to register separately in each one.',
        'building analogy (hyphen variant alt)')

    sub_fix('lesson-2-2', 'text-2-2-vat',
        'like filing paperwork with every office in the district individually',
        'filing paperwork with every state individually',
        'office in the district')

    sub_fix('lesson-2-2', 'text-2-2-2',
        'Step across the hall from the compliance bureau to the accounting wing. This is the office in the Financial District that every other building will call \u2014 banks',
        'Bookkeeping is the foundation that every other financial process depends on \u2014 banks',
        'compliance bureau → accounting wing')
    sub_fix('lesson-2-2', 'text-2-2-2',
        'Step across the hall from the compliance bureau to the accounting wing. This is the office in the Financial District that every other building will call — banks',
        'Bookkeeping is the foundation that every other financial process depends on — banks',
        'compliance bureau (alt)')

    sub_fix('lesson-2-2', 'callout-2-2-2',
        'The Financial District has no shortage of options \u2014 Central Florida is home to',
        'Central Florida is home to',
        'Financial District options')
    sub_fix('lesson-2-2', 'callout-2-2-2',
        'The Financial District has no shortage of options — Central Florida is home to',
        'Central Florida is home to',
        'Financial District options (alt)')

    sub_fix('lesson-2-2', 'kt-2-2-1',
        'Your compliance stop in the Financial District is straightforward if you know the rules before you walk in.',
        'Sales tax and bookkeeping compliance is straightforward if you know the rules before you start.',
        'compliance stop')

    # ── lesson-2-3 ──
    sub_fix('lesson-2-3', 'text-2-3-1',
        'You have walked past the tax offices and the accounting firms. Now you are standing in front of the tallest building at the end of the Financial District: the bank.',
        'You have handled taxes and bookkeeping. Now it is time to tackle the step that frustrates international founders the most: banking.',
        'walked past → tallest building')

    sub_fix('lesson-2-3', 'text-2-3-2',
        'Building U.S. credit is like establishing your reputation in the Financial District. You start as a stranger \u2014 nobody knows you.',
        'Building U.S. credit starts from zero. You arrive as a stranger to the system \u2014 no score, no history.',
        'reputation in Financial District')
    sub_fix('lesson-2-3', 'text-2-3-2',
        'Building U.S. credit is like establishing your reputation in the Financial District. You start as a stranger — nobody knows you.',
        'Building U.S. credit starts from zero. You arrive as a stranger to the system — no score, no history.',
        'reputation (alt)')

    sub_fix('lesson-2-3', 'text-2-3-3',
        'Before you leave the Financial District, stop at the service counter near the exit. Payment processors are like the district\u2019s quick-service windows \u2014 they handle transactions while you work on getting full access to the big buildings.',
        'Payment processors handle transactions while you work on getting a full bank account.',
        'service counter near exit')
    sub_fix('lesson-2-3', 'text-2-3-3',
        "Before you leave the Financial District, stop at the service counter near the exit. Payment processors are like the district's quick-service windows — they handle transactions while you work on getting full access to the big buildings.",
        'Payment processors handle transactions while you work on getting a full bank account.',
        'service counter (alt)')

    sub_fix('lesson-2-3', 'text-2-3-fund',
        'Standing at the edge of the Financial District, you can see the investor tower in the distance.',
        '',
        'investor tower')

    sub_fix('lesson-2-3', 'kt-2-3-1',
        'The Financial District does not hand out trust freely \u2014 you earn it one transaction at a time.',
        'U.S. banks do not hand out trust freely \u2014 you earn it one transaction at a time.',
        'Financial District trust')
    sub_fix('lesson-2-3', 'kt-2-3-1',
        'The Financial District does not hand out trust freely — you earn it one transaction at a time.',
        'U.S. banks do not hand out trust freely — you earn it one transaction at a time.',
        'Financial District trust (alt)')


# ── PHASE E: MODULES 3-8 METAPHOR CLEANUP ──────────────────────────────────

def run_phase_e(dry_run=False):
    print('\n' + '='*70)
    print('PHASE E: Modules 3-8 Metaphor Cleanup')
    print('='*70)

    def sub_fix(lesson_id, block_id, old, new, note=''):
        def fix(block, fpath):
            c = block.get('content', '')
            if old in c:
                block['content'] = c.replace(old, new)
                print(f'  FIXED {block_id} in {fpath} — {note}')
                return True
            return False
        apply_to_all_files(lesson_id, block_id, fix, dry_run)

    # ── Module 3 ──
    sub_fix('lesson-3-2', 'text-3-2-1',
        'locked down your intellectual property inside the launch facility, walk over to the safety and compliance wing',
        'locked down your intellectual property, it is time to focus on safety and compliance',
        'launch facility metaphor')

    # ── Module 4 ──
    sub_fix('lesson-4-1', 'text-4-1-1',
        'Drive south on International Drive and you will pass one of the largest entertainment districts in the world. Behind every attraction is a massive workforce',
        "Central Florida's entertainment sector is one of the largest in the world. Behind every major operation is a massive workforce",
        'International Drive + attraction')

    sub_fix('lesson-4-3', 'text-4-3-1',
        'Every attraction in the entertainment district has an operating budget that goes well beyond wages. There are safety inspections, insurance premiums, maintenance crews, and regulatory compliance. Hiring in the U.S. works the same way: salary is just the ticket price.',
        'Every business has an operating budget that goes well beyond wages. There are taxes, insurance premiums, compliance costs, and benefits. Hiring in the U.S. works this way: salary is just the starting number.',
        'attraction + ticket price')

    sub_fix('lesson-4-3', 'text-4-3-1',
        'The ticket price is just the admission \u2014 behind the scenes, every ride has maintenance, safety inspections, and insurance. Every employee works the same way.',
        'The base salary is just the starting point. Every employee comes with additional costs.',
        'ticket price + ride')
    sub_fix('lesson-4-3', 'text-4-3-1',
        'The ticket price is just the admission — behind the scenes, every ride has maintenance, safety inspections, and insurance. Every employee works the same way.',
        'The base salary is just the starting point. Every employee comes with additional costs.',
        'ticket price + ride (alt)')

    sub_fix('lesson-4-3', 'kt-4-3-1',
        'just like every attraction costs more to operate than the sticker price suggests',
        'just like every business costs more to operate than the base salary suggests',
        'attraction sticker price')

    # ── Module 6 ──

    # lesson-6-1 text-6-1-1: full opening paragraph replacement
    def fix_6_1_1(block, fpath):
        c = block.get('content', '')
        old_opening = 'Picture arriving at a wide Florida beach.'
        if old_opening in c:
            # Replace the entire first paragraph
            new_opening = (
                'U.S. business culture looks informal on the surface. Meetings start '
                'with small talk, first names are the norm, and dress codes are relaxed. '
                'But underneath that casual tone, the expectations are precise and the '
                'rules are unwritten.'
            )
            # Find end of first paragraph
            old_para = c.split('</p>')[0] + '</p>'
            new_para = '<p>' + new_opening + '</p>'
            block['content'] = c.replace(old_para, new_para)
            print(f'  REPLACED opening of text-6-1-1 in {fpath}')
            return True
        return False
    apply_to_all_files('lesson-6-1', 'text-6-1-1', fix_6_1_1, dry_run)

    sub_fix('lesson-6-2', 'text-6-2-1',
        'The beach may look relaxed, but the currents keep moving. The same is true for',
        'U.S. business moves fast. That is especially true for',
        'beach currents')

    sub_fix('lesson-6-2', 'text-6-2-2',
        'Like a riptide that pulls you out before you realize it, U.S. negotiation moves fast',
        'U.S. negotiation moves fast \u2014 often faster than international founders expect',
        'riptide')
    sub_fix('lesson-6-2', 'text-6-2-2',
        'Like a riptide that pulls you out before you realize it, U.S. negotiation moves fast',
        'U.S. negotiation moves fast — often faster than international founders expect',
        'riptide (alt)')

    sub_fix('lesson-6-2', 'text-6-2-2',
        'shoreline where everyone mingles',
        'environment where everyone networks',
        'shoreline')

    sub_fix('lesson-6-2', 'text-6-2-2',
        'sandbars: gradually, through steady deposits over time',
        'gradually, through consistent engagement over time',
        'sandbars')

    sub_fix('lesson-6-3', 'text-6-3-1',
        'By now you know the beach has strong currents beneath its calm surface. This lesson is about the founders who got pulled under.',
        'U.S. business culture has hidden expectations that catch international founders off guard. This lesson is about the founders who learned the hard way.',
        'beach currents + pulled under')

    sub_fix('lesson-6-3', 'text-6-3-2',
        'You have rented the beachfront property before you know where your customers are actually swimming.',
        'You have committed resources before you know where your customers are actually buying.',
        'beachfront + swimming')

    # ── Module 7 ──
    sub_fix('lesson-7-4', 'callout-7-4-funfact',
        "The region\u2019s trade infrastructure works the same way: goods, capital, and business relationships from Central Florida\u2019s inland business parks and incubators flow outward",
        "Central Florida\u2019s trade infrastructure connects inland business parks and incubators to global markets",
        'works the same way comparison')
    sub_fix('lesson-7-4', 'callout-7-4-funfact',
        "The region's trade infrastructure works the same way: goods, capital, and business relationships from Central Florida's inland business parks and incubators flow outward",
        "Central Florida's trade infrastructure connects inland business parks and incubators to global markets",
        'works the same way (alt)')

    sub_fix('lesson-7-5', 'text-7-5-1',
        'You have traveled the full length of the river, from the first clear spring to the open water ahead.',
        'You have worked through every major topic in this program \u2014 from entity setup to market strategy.',
        'river journey')

    sub_fix('lesson-7-5', 'callout-7-5-funfact',
        'Today, Central Florida\u2019s business support organizations serve a similar role: gathering places where',
        'Today, Central Florida\u2019s business support organizations are gathering places where',
        'serve a similar role')
    sub_fix('lesson-7-5', 'callout-7-5-funfact',
        "Today, Central Florida's business support organizations serve a similar role: gathering places where",
        "Today, Central Florida's business support organizations are gathering places where",
        'serve a similar role (alt)')


# ── PHASE F: RESIDUAL GLOBAL FIXES ──────────────────────────────────────────

def run_phase_f(dry_run=False):
    print('\n' + '='*70)
    print('PHASE F: Residual Global Fixes ("most" → "many", "Orlando metro")')
    print('='*70)

    # Scan all generated/ module files for residual "most international founders"
    # and "most participants" — but NOT in quiz explanations about S-Corp eligibility
    import glob as glob_mod
    gen_files = glob_mod.glob(os.path.join(BASE, 'generated', 'content-phase1-module*.json'))

    for fpath in sorted(gen_files):
        rel = os.path.relpath(fpath, BASE).replace('\\', '/')
        data = load_file(rel)
        if data is None:
            continue
        lessons = data.get('lessons', [data])
        file_changed = False
        for lesson in lessons:
            lid = lesson.get('lessonId', '')
            for block in lesson.get('contentBlocks', []):
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
                    # "most international founders" → "many" (skip if in quiz explanation or scenario outcome)
                    if 'most international founders' in val and btype not in ('knowledge-check',):
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
                        print(f'  FIXED [{lid}][{bid}].{field} in {rel}')
                        record_change(lid, bid)

                # Also check scenario paths
                for path in block.get('paths', []):
                    outcome = path.get('outcome', '')
                    if 'most participants' in outcome:
                        path['outcome'] = outcome.replace('most participants', 'many participants')
                        file_changed = True
                        print(f'  FIXED [{lid}][{bid}] scenario outcome in {rel}')
                        record_change(lid, bid)

                # Check tab content
                for tab in block.get('tabs', []):
                    tc = tab.get('content', '')
                    if isinstance(tc, str) and 'most international founders' in tc:
                        tab['content'] = tc.replace('most international founders', 'many international founders')
                        file_changed = True
                        print(f'  FIXED [{lid}][{bid}] tab content in {rel}')
                        record_change(lid, bid)

        if file_changed:
            mark_dirty(rel)


# ── MAIN ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='UCF Business Course editorial fixes')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    parser.add_argument('--phase', type=str, help='Run single phase (A-F)')
    args = parser.parse_args()

    dry_run = args.dry_run
    phase = (args.phase or '').upper()

    print('='*70)
    print('UCF Business Course — Comprehensive Editorial Fix Script')
    if dry_run:
        print('MODE: DRY RUN (no files will be modified)')
    print('='*70)

    if not phase or phase == 'A':
        run_phase_a(dry_run)
    if not phase or phase == 'B':
        run_phase_b(dry_run)
    if not phase or phase == 'C':
        run_phase_c(dry_run)
    if not phase or phase == 'D':
        run_phase_d(dry_run)
    if not phase or phase == 'E':
        run_phase_e(dry_run)
    if not phase or phase == 'F':
        run_phase_f(dry_run)

    # Save all modified files
    print('\n' + '='*70)
    print('SAVING FILES')
    print('='*70)
    save_all(dry_run)

    # Write changed blocks manifest
    manifest = {k: sorted(v) for k, v in sorted(changed_blocks.items())}
    manifest_path = os.path.join(BASE, 'changed-blocks-manifest.json')
    if dry_run:
        print(f'\n[DRY-RUN] Would write manifest with {sum(len(v) for v in manifest.values())} block changes across {len(manifest)} lessons')
    else:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print(f'\nManifest: {manifest_path}')

    # Summary
    print('\n' + '='*70)
    print('SUMMARY')
    print('='*70)
    total_blocks = sum(len(v) for v in changed_blocks.values())
    print(f'  Lessons affected: {len(changed_blocks)}')
    print(f'  Blocks changed: {total_blocks}')
    print(f'  Files modified: {len(_dirty_files)}')
    for lid in sorted(changed_blocks):
        print(f'    {lid}: {", ".join(sorted(changed_blocks[lid]))}')


if __name__ == '__main__':
    main()
