#!/usr/bin/env python3
"""Inject infographic and scenario image blocks into lesson JSONs."""
import sys, json, os
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

INJECTIONS = [
    {
        "lessonId": "lesson-1-2",
        "images": [{
            "id": "img-1-2-sunbiz",
            "title": "SunBiz Registration: 8-Step Process",
            "src": "images/infographics/lesson-1-2-sunbiz-process.jpg",
            "alt": "Infographic showing 8 steps to register a business on SunBiz.org, from choosing entity type through obtaining local licenses. Estimated cost $300-$500, total time 1-2 weeks.",
            "insert_after_id": None,
            "insert_after_type": "text",
            "insert_after_keywords": ["registration", "sunbiz", "step"]
        }]
    },
    {
        "lessonId": "lesson-1-3",
        "images": [{
            "id": "img-1-3-bank",
            "title": "Founder at Bank Meeting",
            "src": "images/scenarios/lesson-1-3-bank-meeting.jpg",
            "alt": "Illustration of an international founder meeting with a bank officer, presenting business documents and EIN letter.",
            "insert_after_id": "text-1-3-0",
            "insert_after_type": None,
            "insert_after_keywords": []
        }]
    },
    {
        "lessonId": "lesson-2-2",
        "images": [{
            "id": "img-2-2-vat",
            "title": "VAT vs. U.S. Sales Tax Comparison",
            "src": "images/infographics/lesson-2-2-vat-vs-salestax.jpg",
            "alt": "Infographic comparing VAT (applied at every production stage, one national rate) with U.S. Sales Tax (applied only at final sale, varies by state/county/city). Key insight: U.S. shelf prices do not include tax.",
            "insert_after_id": None,
            "insert_after_type": "text",
            "insert_after_keywords": ["vat", "sales tax", "different"]
        }]
    },
    {
        "lessonId": "lesson-2-3",
        "images": [{
            "id": "img-2-3-bank",
            "title": "Founder Facing Bank Rejection",
            "src": "images/scenarios/lesson-2-3-bank-rejection.jpg",
            "alt": "Illustration of a founder standing outside a bank, contemplating next steps after a rejection.",
            "insert_after_id": "text-2-3-0",
            "insert_after_type": None,
            "insert_after_keywords": []
        }]
    },
    {
        "lessonId": "lesson-3-1",
        "images": [{
            "id": "img-3-1-trademark",
            "title": "U.S. Trademark Registration Timeline",
            "src": "images/infographics/lesson-3-1-trademark-timeline.jpg",
            "alt": "Timeline showing trademark registration process: file application, USPTO review, office actions, publication, registration. Total 8-12 months, cost $250-$3,000.",
            "insert_after_id": None,
            "insert_after_type": "comparison-card",
            "insert_after_keywords": ["ip", "trademark", "copyright"]
        }]
    },
    {
        "lessonId": "lesson-3-2",
        "images": [{
            "id": "img-3-2-insurance",
            "title": "Business Insurance Types Overview",
            "src": "images/infographics/lesson-3-2-insurance-types.jpg",
            "alt": "Infographic showing 6 business insurance types: General Liability, Professional Liability, Workers Comp, Commercial Property, BOP, and Cyber Liability with costs and descriptions.",
            "insert_after_id": None,
            "insert_after_type": "text",
            "insert_after_keywords": ["insurance", "coverage", "protect"]
        }]
    },
    {
        "lessonId": "lesson-4-1",
        "images": [{
            "id": "img-4-1-irs",
            "title": "IRS Classification Decision",
            "src": "images/scenarios/lesson-4-1-irs-classification.jpg",
            "alt": "Illustration of a founder at a desk reviewing IRS forms, deciding between W-2 employee and 1099 contractor classification.",
            "insert_after_id": "text-4-1-0",
            "insert_after_type": None,
            "insert_after_keywords": []
        }]
    },
    {
        "lessonId": "lesson-4-2",
        "images": [{
            "id": "img-4-2-visa",
            "title": "Four Visa Pathways for International Founders",
            "src": "images/infographics/lesson-4-2-visa-pathways.jpg",
            "alt": "Comparison of 4 visa types: E-2 Treaty Investor, L-1A Transfer, O-1A Extraordinary Ability, B-1/B-2 Visitor with requirements, duration, and green card eligibility.",
            "insert_after_id": None,
            "insert_after_type": "accordion",
            "insert_after_keywords": ["visa", "pathway"]
        }]
    },
    {
        "lessonId": "lesson-6-3",
        "images": [{
            "id": "img-6-3-cultural",
            "title": "Cultural Missteps That Cost Real Money",
            "src": "images/infographics/lesson-6-3-cultural-costs.jpg",
            "alt": "Infographic showing 6 cultural missteps with dollar costs: missing follow-up ($5K-$50K), no contracts ($10K-$100K+), over-promising ($2K-$20K), ignoring small talk, wrong formality, assuming yes.",
            "insert_after_id": None,
            "insert_after_type": "text",
            "insert_after_keywords": ["culture", "misstep", "mistake", "cost"]
        }]
    },
    {
        "lessonId": "lesson-7-1",
        "images": [{
            "id": "img-7-1-map",
            "title": "Central Florida Business Resources Map",
            "src": "images/infographics/lesson-7-1-resource-map.jpg",
            "alt": "Map of Central Florida showing UCF Business Incubation Program, SBDC, SCORE Orlando, Enterprise Florida, and Orlando Economic Partnership locations.",
            "insert_after_id": None,
            "insert_after_type": "accordion",
            "insert_after_keywords": ["resource", "directory", "organization"]
        }]
    },
    {
        "lessonId": "lesson-7-2",
        "images": [{
            "id": "img-7-2-network",
            "title": "Central Florida Networking Map",
            "src": "images/infographics/lesson-7-2-networking-map.jpg",
            "alt": "Map showing Central Florida networking locations including 1 Million Cups, StarterStudio, Canvs, UCF BIP, Lake Nona Medical City, and Groundswell Startups.",
            "insert_after_id": None,
            "insert_after_type": "accordion",
            "insert_after_keywords": ["network", "show up", "where"]
        }]
    },
]


def find_insert_index(blocks, spec):
    if spec.get("insert_after_id"):
        for i, b in enumerate(blocks):
            if b.get("id") == spec["insert_after_id"]:
                return i + 1
        for i, b in enumerate(blocks):
            if b.get("type") == "text":
                return i + 1
        return 1

    target_type = spec.get("insert_after_type", "text")
    keywords = [k.lower() for k in spec.get("insert_after_keywords", [])]

    best_idx = None
    best_score = 0

    for i, b in enumerate(blocks):
        if b.get("type") == target_type:
            title = (b.get("title", "") + " " + b.get("id", "")).lower()
            content = ""
            if isinstance(b.get("content"), str):
                content = b["content"][:200].lower()
            text = title + " " + content
            score = sum(1 for k in keywords if k in text)
            if score > best_score:
                best_score = score
                best_idx = i + 1

    if best_idx is None:
        for i, b in enumerate(blocks):
            if b.get("type") == target_type:
                return i + 1
        return 1

    return best_idx


changes = 0
for injection in INJECTIONS:
    lid = injection["lessonId"]
    fpath = f"phase1-lessons/{lid}.json"

    if not os.path.exists(fpath):
        print(f"  SKIP {lid}: file not found")
        continue

    with open(fpath, encoding="utf-8") as f:
        lesson = json.load(f)

    blocks = lesson.get("contentBlocks", [])
    existing_ids = {b.get("id") for b in blocks}

    for img_spec in injection["images"]:
        if img_spec["id"] in existing_ids:
            print(f"  SKIP {lid}: {img_spec['id']} already exists")
            continue

        actual_path = os.path.join("media", img_spec["src"])
        if not os.path.exists(actual_path):
            print(f"  SKIP {lid}: {actual_path} not found")
            continue

        idx = find_insert_index(blocks, img_spec)

        image_block = {
            "type": "image",
            "id": img_spec["id"],
            "title": img_spec["title"],
            "src": img_spec["src"],
            "alt": img_spec["alt"],
        }

        blocks.insert(idx, image_block)
        after_id = blocks[idx - 1].get("id", "?") if idx > 0 else "start"
        print(f"  {lid}: inserted {img_spec['id']} after {after_id} (pos {idx})")
        changes += 1

    lesson["contentBlocks"] = blocks
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(lesson, f, indent=2, ensure_ascii=False)

print(f"\nTotal: {changes} images injected into lesson JSONs")
