"""
Generate the two missing per-course-repo-contract files for BusinessCourse:
  1. interactive-specs.json — extracted from inline interactive blocks already
     in generated/content-phase1-module*.json (tabs, accordion, scenario,
     simulation, knowledge-check, drag-drop, flashcards, timeline, etc.)
  2. outcomes-mapping.json — built from blueprint.json learning objectives
     mapped to lessons.

Both files are required by the auto-publish action's cloud phase 4 — without
them, run-phase-4.ts hard-fails before regenerating HTML.

This is a one-shot generator. Once these files exist they live in git and
are maintained alongside the content JSON.
"""
import io, sys, json, glob, re, os, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Component types treated as "interactives" for the spec
INTERACTIVE_TYPES = {
    'tabs', 'accordion', 'flashcards', 'timeline',
    'scenario', 'branching-scenario',
    'knowledge-check', 'simulation', 'drag-drop',
    'checklist', 'reflection',
    'comparison-card', 'intel-matrix', 'bmc',
    'data-visualization',
    'gallery-card', 'gallery-cards',
    'multi-card', 'multi-cards',
    'spectrum',
}

def text_preview(s, n=100):
    if not s: return ''
    return re.sub(r'<[^>]+>', '', str(s))[:n].strip()

def extract_specs_from_lesson(lesson):
    """Walk a lesson's contentBlocks and emit a spec per interactive block."""
    lesson_id = lesson.get('lessonId') or lesson.get('id')
    specs = []
    for block in lesson.get('contentBlocks', []) or []:
        btype = block.get('type', '')
        if btype not in INTERACTIVE_TYPES:
            continue
        title = block.get('title') or block.get('heading') or block.get('label') or text_preview(block.get('text') or block.get('description') or block.get('content', ''), 80)
        spec = {
            'specId': block.get('id') or f'{lesson_id}-{btype}-{len(specs)+1}',
            'componentType': btype,
            'lessonId': lesson_id,
            'title': title or f'{btype} component',
            'description': text_preview(block.get('description') or block.get('content', ''), 200),
            'priority': 'medium',
            'placement': {
                'position': 'inline',
                'anchorBlock': block.get('id') or '',
            },
            'source': 'inline-content-block',
        }
        # Capture key counts/items so the spec is auditable
        if btype == 'tabs' and block.get('tabs'):
            spec['itemCount'] = len(block['tabs'])
        elif btype == 'accordion' and block.get('items'):
            spec['itemCount'] = len(block['items'])
        elif btype == 'flashcards' and block.get('cards'):
            spec['itemCount'] = len(block['cards'])
        elif btype == 'timeline' and block.get('steps'):
            spec['itemCount'] = len(block['steps'])
        elif btype == 'knowledge-check' and block.get('questions'):
            spec['itemCount'] = len(block['questions'])
        elif btype in ('scenario', 'branching-scenario'):
            paths = block.get('paths') or block.get('choices') or block.get('options') or []
            spec['itemCount'] = len(paths)
        elif btype == 'simulation' and block.get('inputs'):
            spec['itemCount'] = len(block['inputs'])
        elif btype == 'drag-drop' and block.get('items'):
            spec['itemCount'] = len(block['items'])
        elif btype == 'checklist' and block.get('items'):
            spec['itemCount'] = len(block['items'])
        specs.append(spec)
    return specs

# ─── 1. interactive-specs.json ────────────────────────────────────────
print('=== Generating interactive-specs.json ===\n')
all_specs = []
total_lessons = 0
lessons_with_specs = 0
type_counts = {}
for path in sorted(glob.glob('generated/content-phase1-module*.json')):
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    for lesson in d.get('lessons', []) or []:
        total_lessons += 1
        specs = extract_specs_from_lesson(lesson)
        if specs:
            lessons_with_specs += 1
            all_specs.extend(specs)
            for s in specs:
                type_counts[s['componentType']] = type_counts.get(s['componentType'], 0) + 1

interactive_specs = {
    'projectPath': 'clients/UCF/BusinessCourse',
    'generatedAt': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
    'totalSpecs': len(all_specs),
    'totalLessons': total_lessons,
    'lessonsWithSpecs': lessons_with_specs,
    'sourceFile': 'generated/content-phase1-module*.json (extracted from inline interactive blocks)',
    'note': 'BusinessCourse authors interactives inline in content JSON rather than via a separate phase-2 opportunities file. This spec documents what is present so the cloud phase 4 (which requires interactive-specs.json) can run.',
    'componentTypeCounts': dict(sorted(type_counts.items(), key=lambda x: -x[1])),
    'specs': all_specs,
}
with open('interactive-specs.json', 'w', encoding='utf-8') as f:
    json.dump(interactive_specs, f, indent=2, ensure_ascii=False)
print(f'  {len(all_specs)} specs across {lessons_with_specs}/{total_lessons} lessons')
print(f'  Component types:')
for t, n in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f'    {n:3d}  {t}')
print(f'  -> wrote interactive-specs.json\n')

# ─── 2. outcomes-mapping.json ─────────────────────────────────────────
print('=== Generating outcomes-mapping.json ===\n')
with open('blueprint.json', encoding='utf-8') as f:
    bp = json.load(f)

# Course-level outcomes — blueprint uses courseStructure.learningOutcomes
cs = bp.get('courseStructure') or {}
clo = (cs.get('learningOutcomes')
       or bp.get('courseLearningOutcomes')
       or bp.get('learningOutcomes')
       or bp.get('outcomes')
       or [])

# Modules + per-module outcomes
modules_list = cs.get('modules') or bp.get('modules') or []

# If no course-level outcomes, build from per-module learningOutcomes + per-lesson objectives
if not clo:
    clo = []
    counter = 1
    for m in modules_list:
        m_outs = m.get('learningOutcomes') or m.get('learningObjectives') or m.get('objectives') or []
        for obj in m_outs:
            text = obj if isinstance(obj, str) else (obj.get('text') or obj.get('outcome') or obj.get('description', ''))
            if text:
                clo.append({
                    'id': f'CLO-{counter}',
                    'outcome': text,
                    'sourceModule': m.get('id') or m.get('title'),
                })
                counter += 1
        # Also pick up per-lesson objectives if module-level is empty
        if not m_outs:
            for l in m.get('lessons') or []:
                for obj in (l.get('objectives') or l.get('learningObjectives') or []):
                    text = obj if isinstance(obj, str) else (obj.get('text') or obj.get('outcome', ''))
                    if text:
                        clo.append({
                            'id': f'CLO-{counter}',
                            'outcome': text,
                            'sourceModule': m.get('id') or m.get('title'),
                            'sourceLesson': l.get('id') or l.get('lessonId'),
                        })
                        counter += 1

# Build module → lesson map
module_lessons = {}
for m in modules_list:
    mid = m.get('id') or f'module-{len(module_lessons)}'
    module_lessons[mid] = [l.get('id') or l.get('lessonId') for l in (m.get('lessons') or [])]

# Map each CLO to its primary module (best-effort; derived if not specified)
outcomes_with_mapping = []
for i, co in enumerate(clo):
    # CLO entries may be plain strings (just the outcome text) or dicts
    if isinstance(co, str):
        co = {'outcome': co}
    mapped = {
        'id': co.get('id') or f'CLO-{i+1}',
        'outcome': co.get('outcome') or co.get('text') or co.get('description') or '',
        'primaryModules': co.get('primaryModules') or ([co.get('sourceModule')] if co.get('sourceModule') else []),
        'reinforcedIn': co.get('reinforcedIn', []),
        'assessedIn': co.get('assessedIn') or ([co.get('sourceLesson')] if co.get('sourceLesson') else []),
    }
    # Default lesson mapping if module known
    pm = mapped['primaryModules'][0] if mapped['primaryModules'] else None
    if pm and pm in module_lessons and module_lessons[pm]:
        lessons = module_lessons[pm]
        mapped['lessons'] = co.get('lessons') or {
            'introduced': lessons[0],
            'practiced': lessons[1:-1] if len(lessons) > 2 else [],
            'mastered': lessons[-1] if len(lessons) > 1 else lessons[0],
        }
    outcomes_with_mapping.append(mapped)

outcomes_mapping = {
    'courseId': bp.get('courseId') or 'ucf-business-course',
    'courseTitle': bp.get('courseTitle') or 'U.S. Market Readiness Program',
    'description': 'Maps course-level learning outcomes to modules and lessons. Derived from blueprint.json learning objectives — refine manually if more nuanced mappings are needed.',
    'generatedAt': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
    'totalOutcomes': len(outcomes_with_mapping),
    'courseLearningOutcomes': outcomes_with_mapping,
}
with open('outcomes-mapping.json', 'w', encoding='utf-8') as f:
    json.dump(outcomes_mapping, f, indent=2, ensure_ascii=False)
print(f'  {len(outcomes_with_mapping)} learning outcomes mapped')
print(f'  -> wrote outcomes-mapping.json\n')

print('DONE')
