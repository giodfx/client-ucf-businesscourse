#!/usr/bin/env python3
"""
Phase B: Content Enhancement
  B1: Fix 6 text walls
  B2: Add 7 new interactives
  B3: Add 5 stretch scenarios

Usage:
  python apply-phase-b-improvements.py          # Dry run
  python apply-phase-b-improvements.py --apply  # Apply
"""
import json, sys, os
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

COURSE_DIR = Path(__file__).resolve().parent
LESSONS_DIR = COURSE_DIR / 'phase1-lessons'
DRY_RUN = '--apply' not in sys.argv

if DRY_RUN:
    print("=== DRY RUN === (use --apply to write changes)\n")

changes = []
def log(lid, cat, desc):
    changes.append((lid, cat, desc))
    print(f"  [{lid}] {cat}: {desc}")

def load(lid):
    with open(LESSONS_DIR / f'{lid}.json', encoding='utf-8') as f:
        return json.load(f)

def save(lid, data):
    if DRY_RUN: return
    with open(LESSONS_DIR / f'{lid}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def find_block(blocks, type_, title_contains):
    for i, b in enumerate(blocks):
        if b.get('type') == type_ and title_contains in b.get('title', ''):
            return i, b
    return None, None

def insert_after(blocks, idx, new_block):
    blocks.insert(idx + 1, new_block)

def insert_before(blocks, idx, new_block):
    blocks.insert(idx, new_block)


# ═══════════════════════════════════════════════════════════════════════════════
# B1: TEXT WALL FIXES
# ═══════════════════════════════════════════════════════════════════════════════

def fix_text_walls():
    print("=== B1: TEXT WALL FIXES ===\n")

    # ── 0-1: Split intro after para 3 with image placeholder ──
    d = load('lesson-0-1')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'Time Commitment')
    if b:
        b['content'] = (
            '<p>What if the biggest risk in expanding to the U.S. is not what you think it is? Most founders assume the hard part is paperwork. The real challenge is knowing what you do not know.</p>\n\n'
            '<p>This program takes less than 3 hours and covers the legal, financial, and cultural realities of running a business in the United States: entity setup, Florida filing, banking, taxes, insurance, hiring, finding customers, and cultural gaps.</p>\n\n'
            '<p>Think of this as the start of a road trip through Central Florida\'s business landscape. Your GPS is loaded, your dashboard is lit, and seven destinations stretch out ahead of you. By the time you return, you will know the territory, even if you decide not to move there yet.</p>'
        )
        b['title'] = 'What It Actually Takes'
        # Insert new text block after it for the second half
        second_half = {
            "type": "text",
            "id": "text-0-1-learn-first",
            "title": "Learn First, Then Decide",
            "content": (
                '<p>This program is the first step in getting ready for the U.S. market. It is low-commitment on purpose: a hands-on intro to help you grasp what it takes, think about whether expanding makes sense, and avoid costly early mistakes. Some companies may be invited to join more advanced support through the UCF Business Incubation Program.</p>\n\n'
                '<p>At this stage, many founders feel pressure to "get started" quickly. Many do it in reverse: they register an LLC, open a bank account, and only then start figuring out product-market fit. This program flips that order. <strong>Learn first, then decide.</strong></p>\n\n'
                '<p>Every module blends practical tips and curated resources to give you a clear, real-world view of how business works in the United States. The program is self-paced, with no deadlines or exams.</p>'
            )
        }
        insert_after(blocks, idx, second_half)
        log('lesson-0-1', 'B1', 'Split 7-para intro into 2 sections: "What It Actually Takes" + "Learn First, Then Decide"')
    save('lesson-0-1', d)

    # ── 2-1: Split opening after Brazil founder story ──
    d = load('lesson-2-1')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'Welcome to the Financial District')
    if b:
        b['content'] = (
            '<p>You have set up your entity and picked your business structure back in the city. Now the road leads into the Financial District, a corridor of accounting firms, tax offices, and bank branches where the real money questions get answered.</p>\n\n'
            '<p>What would you do if the IRS sent you a $1,200 penalty before you even made a profit? A founder from Brazil set up an LLC in Orlando and assumed she only needed to file once a year. She missed quarterly estimated payments for two consecutive quarters, and the penalty was $1,200 before she even turned a profit.</p>'
        )
        b['title'] = 'Welcome to the Financial District'
        second_half = {
            "type": "text",
            "id": "text-2-1-no-state-tax",
            "title": "Florida Has No Income Tax — But That Does Not Mean No Taxes",
            "content": (
                '<p>Here is one of the biggest reasons international founders choose Florida: there is no state personal income tax. That is real money staying in your pocket. Florida is one of only nine U.S. states with no personal income tax, and the Orlando metro area consistently ranks among the top regions in the Southeast for small business growth.</p>\n\n'
                '<p>But no state income tax does not mean no taxes. Federal taxes still apply to every U.S. business, and the IRS will want to hear from you regardless of where you incorporated or how much revenue you earned.</p>\n\n'
                '<p><strong>Important:</strong> Tax obligations vary based on your entity type, revenue, and personal tax residency status. The information here is educational. Consult a qualified CPA or tax attorney for your specific situation.</p>'
            )
        }
        insert_after(blocks, idx, second_half)
        log('lesson-2-1', 'B1', 'Split 6-para opening into "Welcome" (Brazil story) + "No Income Tax But..." (tax reality)')
    save('lesson-2-1', d)

    # ── 2-3: Split into "Why Banks Say No" + scenario + "What You Can Do" ──
    d = load('lesson-2-3')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'The Last Building')
    if b:
        b['content'] = (
            '<p>You have walked past the tax offices and the accounting firms. Now you are standing in front of the tallest building at the end of the Financial District: the bank. This is the stop that trips up more international founders than any other.</p>\n\n'
            '<p>You can form your LLC in two days. But getting a bank account? That can take two months and three rejections. Banks reject international founders for specific, predictable reasons:</p>\n\n'
            '<ul>'
            '<li><strong>No U.S. credit history.</strong> Home-country credit does not transfer. A German founder with a 15-year Deutsche Bank relationship was turned away by Chase because he had no U.S. credit score.</li>'
            '<li><strong>Missing documents.</strong> Every bank has a different checklist, and most do not post it clearly. Walk in missing one document and you will come back another day.</li>'
            '<li><strong>Entity type mismatch.</strong> Some banks prefer C-Corps over single-member LLCs. Others will not open accounts for entities less than 30 days old.</li>'
            '<li><strong>High-risk country flags.</strong> Anti-money-laundering rules mean founders from certain countries face added review or refusal.</li>'
            '</ul>'
        )
        b['title'] = 'Why Banks Say No'
        # Insert new text block for the solution side + Kenya story
        solution_block = {
            "type": "text",
            "id": "text-2-3-what-you-can-do",
            "title": "What You Can Do About It",
            "content": (
                '<p>A Kenyan fintech founder applied at three banks, each asking for more KYC documents: proof of where her funds came from, notarized business records, a letter from her Kenyan bank. She eventually succeeded at a regional Orlando bank experienced with African founders, but the process took seven weeks.</p>\n\n'
                '<p><strong>International-friendly banks (early 2026):</strong> Mercury, Relay, Centennial Bank, and Valley National Bank have been more willing to work with international founders. Chase and Bank of America have stricter non-resident requirements. Always call ahead and confirm before visiting a branch.</p>\n\n'
                '<p><strong>Important:</strong> Banking policies are not uniform across institutions, and they change frequently. What worked for another founder six months ago may not apply to your situation today. Call ahead, ask specific questions, and get answers in writing when possible.</p>'
            )
        }
        insert_after(blocks, idx, solution_block)
        log('lesson-2-3', 'B1', 'Split 8-para wall into "Why Banks Say No" (reasons) + "What You Can Do" (Kenya story + solutions)')
    save('lesson-2-3', d)

    # ── 6-1: Split opening, move phrase list to flashcard intro ──
    d = load('lesson-6-1')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'Welcome to the Beach')
    if b:
        b['content'] = (
            '<p>Picture arriving at a wide Florida beach. The sand is warm, the atmosphere is relaxed, and everyone seems casual and easygoing. But step into the water and you feel the pull of strong currents just beneath the surface. U.S. business culture works the same way. It looks informal — first names, casual dress, "let\'s grab coffee" — but underneath there are serious expectations about speed, follow-through, and professionalism.</p>\n\n'
            '<p>A Brazilian founder\'s American contact said, "This is great, let\'s definitely move forward." She spent $3,000 on legal fees drafting a partnership agreement. Two weeks later she learned "let\'s move forward" meant "I\'m interested enough to keep talking."</p>\n\n'
            '<p>Learning to tell the difference between real commitment and polite interest is what this lesson is about. Once you see the pattern, you will read these situations accurately every time.</p>'
        )
        b['title'] = 'Welcome to the Beach — Where the Water Looks Calm'
        # Insert direct/indirect explanation block
        comm_block = {
            "type": "text",
            "id": "text-6-1-direct-indirect",
            "title": "The Direct Parts and the Undercurrents",
            "content": (
                '<h4>The Direct Parts</h4>\n\n'
                '<p>When an American gives you a specific number, date, or action item, take it literally. "Send me the proposal by Friday" means Friday. "Our budget is $50,000" means $50,000. U.S. business emails are short — three to five sentences. Match that style.</p>\n\n'
                '<h4>The Undercurrents</h4>\n\n'
                '<p>Americans avoid direct "no" in business. They use softening phrases that founders frequently misread. The pattern: when Americans are interested, they take <strong>clear action</strong> — they propose dates, send follow-ups, and make intros. When they are not, you hear vague praise and open-ended timelines. The flashcards below decode the most common phrases.</p>'
            )
        }
        insert_after(blocks, idx, comm_block)
        log('lesson-6-1', 'B1', 'Split 5-para opening: "Welcome" (beach metaphor + Brazil story) + "Direct vs Undercurrents" (communication patterns). Phrase list moved to flashcards context.')
    save('lesson-6-1', d)

    # ── 7-2: Convert networking map text wall → accordion ──
    d = load('lesson-7-2')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'Your Networking Map')
    if b:
        # Replace the 334-word text block with an accordion
        new_accordion = {
            "type": "accordion",
            "id": "accordion-7-2-networking",
            "title": "Your Networking Map — Where to Show Up",
            "sections": [
                {
                    "heading": "Events That Matter",
                    "content": (
                        '<p>Showing up in person is the fastest way to build your local network. Focus on these high-value events:</p>'
                        '<ul>'
                        '<li><strong>Orlando Tech Association meetups</strong> — Monthly, casual gatherings with local tech founders and service providers. Go within two weeks of arriving.</li>'
                        '<li><strong>Starter Studio Demo Days</strong> — Accelerator showcase events connecting you with investors and mentors, even if you are not in the program.</li>'
                        '<li><strong>CFITO Trade Events</strong> — Bring together importers, exporters, and logistics partners for businesses bridging Latin America and the U.S.</li>'
                        '<li><strong>UCF BIP Workshops</strong> — Cover IP, pitch preparation, and market validation. The cohort format builds founder relationships.</li>'
                        '</ul>'
                    )
                },
                {
                    "heading": "Places to Work and Meet",
                    "content": (
                        '<p>Where you work shapes who you meet. Choosing a workspace inside the support ecosystem increases the chance of running into the right people:</p>'
                        '<ul>'
                        '<li><strong>UCF Business Incubation facilities</strong> — Coworking space embedded in the support network with mentors and advisors nearby.</li>'
                        '<li><strong>Canvs at Creative Village</strong> — Downtown Orlando\'s coworking hub, popular with creative and tech startups.</li>'
                        '<li><strong>Orlando Public Library co-lab spaces</strong> — Free workspace and meeting rooms for budget-conscious founders.</li>'
                        '</ul>'
                    )
                },
                {
                    "heading": "People to Connect With Early",
                    "content": (
                        '<p>Three relationships matter most in your first 90 days:</p>'
                        '<ol>'
                        '<li><strong>Your SBDC counselor</strong> — Free and matched to your industry.</li>'
                        '<li><strong>Your UCF BIP coordinator</strong> — Points you to the right programs and people.</li>'
                        '<li><strong>A founder 6-12 months ahead of you</strong> — What they wish they had known is often more valuable than any workshop.</li>'
                        '</ol>'
                    )
                }
            ]
        }
        blocks[idx] = new_accordion
        log('lesson-7-2', 'B1', 'Converted 334-word networking text wall into 3-section accordion')
    save('lesson-7-2', d)


# ═══════════════════════════════════════════════════════════════════════════════
# B2: NEW INTERACTIVES
# ═══════════════════════════════════════════════════════════════════════════════

def add_new_interactives():
    print("\n=== B2: NEW INTERACTIVES ===\n")

    # ── 2-3: Branching scenario "The Bank Said No" ──
    d = load('lesson-2-3')
    blocks = d['contentBlocks']
    # Insert after "What You Can Do" (the new block from B1) and before "Reality Check" callout
    idx, _ = find_block(blocks, 'callout', 'Reality Check')
    if idx is None:
        # fallback: insert after the second text block
        idx, _ = find_block(blocks, 'text', 'What You Can Do')
        if idx is not None:
            idx = idx + 1
        else:
            idx = 2
    scenario = {
        "type": "scenario",
        "id": "scenario-2-3-bank-rejection",
        "title": "The Bank Said No — What's Your Next Move?",
        "description": "You applied for a business checking account at a major national bank. After two weeks of waiting, you received an email: 'We are unable to open an account at this time.' No explanation. What do you do?",
        "paths": [
            {
                "label": "Apply at a different national bank immediately",
                "outcome": "Risky approach. If the rejection was due to missing documentation or KYC flags, the same issues will follow you to the next bank. Before reapplying anywhere, find out WHY you were rejected.",
                "isRecommended": False
            },
            {
                "label": "Call the bank and ask specifically why you were rejected",
                "outcome": "Smart first step. Banks are not always required to explain, but many will give you a general reason — missing documents, entity age, or country-of-origin review requirements. This information tells you what to fix before your next application.",
                "isRecommended": True
            },
            {
                "label": "Switch to a payment processor like Stripe or Mercury while you sort it out",
                "outcome": "Practical and common. Many international founders use Mercury or Relay as their primary account while building U.S. banking history. These fintech platforms have more flexible requirements for non-residents. You can always add a traditional bank later.",
                "isRecommended": False
            }
        ]
    }
    insert_before(blocks, idx, scenario)
    log('lesson-2-3', 'B2', 'Added branching scenario: "The Bank Said No — What\'s Your Next Move?"')
    save('lesson-2-3', d)

    # ── 3-3: Comparison card "DIY vs. Hire a Lawyer" ──
    d = load('lesson-3-3')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'Knowing When to Call')
    if b:
        # Compress the text block
        b['content'] = (
            '<p>You have secured your intellectual property and your insurance is in place. Now comes the last major question for this module: which decisions can you make on your own, and which ones require a specialist?</p>\n\n'
            '<p>A business attorney in Central Florida charges $200 to $400 per hour. Call one for every question and you will burn through your budget fast. A founder from Ecuador saved $3,000 by filing his own LLC and EIN, then spent $800 on an attorney for the operating agreement and a major client contract. The comparison below shows where you can save and where you should invest.</p>'
        )
        b['title'] = 'DIY or Call an Expert?'
        # Insert comparison card after the text
        comp_card = {
            "type": "comparison-card",
            "id": "comparison-3-3-diy-vs-lawyer",
            "title": "DIY vs. Hire a Lawyer",
            "columns": [
                {
                    "heading": "Handle It Yourself",
                    "items": [
                        "SunBiz entity filing (LLC or Corp — $125)",
                        "EIN application with the IRS (free)",
                        "Basic NDA using a reputable template",
                        "Sales tax registration with Florida DOR (free)",
                        "Setting up accounting software (QuickBooks, Xero)",
                        "Opening a business bank account"
                    ]
                },
                {
                    "heading": "Get a Lawyer",
                    "items": [
                        "Complex entity setup (visa status involved)",
                        "Investor agreements (SAFE notes, equity rounds)",
                        "IP disputes or cease-and-desist letters",
                        "Employment contracts and non-competes",
                        "Any contract worth more than $25,000",
                        "Regulatory compliance in specialized industries",
                        "Any situation involving threatened legal action"
                    ]
                }
            ]
        }
        insert_after(blocks, idx, comp_card)
        log('lesson-3-3', 'B2', 'Added comparison card: "DIY vs. Hire a Lawyer" — replaced back-to-back bullet lists')
    save('lesson-3-3', d)

    # ── 5-2: Vendor Readiness Checklist ──
    d = load('lesson-5-2')
    blocks = d['contentBlocks']
    idx, b = find_block(blocks, 'text', 'Vendor Onboarding')
    if b:
        # Compress text, add checklist after it
        b['content'] = (
            '<p>This blindsides many founders selling B2B. Your product must pass through a buyer\'s procurement process before you see payment. The buyer says yes, then the purchasing team sends a packet with forms you have never heard of. Have everything ready before you start selling.</p>'
        )
        checklist = {
            "type": "checklist",
            "id": "checklist-5-2-vendor",
            "title": "Vendor Readiness Checklist",
            "items": [
                {"label": "W-9 form completed with your EIN (required by any U.S. company paying you $600+/year)"},
                {"label": "General liability insurance policy active ($500-$2,000/year)"},
                {"label": "Certificate of Insurance (COI) ready to send on request"},
                {"label": "Professional or cyber liability insurance (if selling services or handling data)"},
                {"label": "Vendor registration completed in buyer's procurement system (Ariba, Coupa, Oracle — allow 1-4 weeks)"},
                {"label": "Sample invoice template with U.S.-standard format (Net 30 terms, EIN, bank details)"},
                {"label": "U.S. business bank account active for receiving ACH or wire payments"},
                {"label": "Payment terms documented and ready to negotiate (Net 30, Net 45, or Net 60)"}
            ]
        }
        insert_after(blocks, idx, checklist)
        log('lesson-5-2', 'B2', 'Added vendor readiness checklist (8 items) — replaced dense text with actionable checklist')
    save('lesson-5-2', d)

    # ── 6-1: Drag-and-drop matching "Decode American Business Phrases" ──
    d = load('lesson-6-1')
    blocks = d['contentBlocks']
    # Insert after the flashcards
    idx, _ = find_block(blocks, 'flashcards', 'American Business Phrases')
    if idx is not None:
        matching = {
            "type": "matching",
            "id": "matching-6-1-phrases",
            "title": "Decode the Phrase — What Do They Really Mean?",
            "instruction": "Match each American business phrase to its actual meaning.",
            "pairs": [
                {"left": "Let's circle back on this", "right": "Not interested right now"},
                {"left": "That's really interesting", "right": "Polite deflection — no follow-up coming"},
                {"left": "Let me check with my team", "right": "Soft stall — likely moving on"},
                {"left": "We should get coffee sometime", "right": "Social pleasantry — not a real invitation"},
                {"left": "Let's put a pin in that", "right": "This topic is effectively dead"},
                {"left": "Send me the proposal by Friday", "right": "Literal deadline — they mean Friday"}
            ]
        }
        insert_after(blocks, idx, matching)
        log('lesson-6-1', 'B2', 'Added matching interactive: "Decode the Phrase" (6 phrase pairs)')
    save('lesson-6-1', d)

    # ── 6-2: Fill-in-blank elevator pitch template ──
    d = load('lesson-6-2')
    blocks = d['contentBlocks']
    idx, _ = find_block(blocks, 'exercise', 'Elevator Pitch')
    if idx is not None:
        # Replace the exercise with a structured fill-in-blank
        blocks[idx] = {
            "type": "exercise",
            "id": "exercise-6-2-pitch",
            "title": "Build Your 30-Second Elevator Pitch",
            "format": "fill-in-blank",
            "instruction": "Complete each blank to build a pitch you can use at your next networking event. Keep it under 30 seconds when spoken aloud.",
            "template": "[Company name] helps [target customer in the U.S.] solve [specific problem] by [your solution/approach]. We are based in [location] and [credibility statement — traction, clients, or background].",
            "example": "FinBridge helps Latin American exporters solve cross-border payment delays by automating customs documentation and compliance checks. We are based in Orlando and already process $2M monthly for 40 companies across Colombia and Brazil.",
            "prompts": [
                {"label": "Company name", "placeholder": "Your company"},
                {"label": "Target customer in the U.S.", "placeholder": "e.g., mid-size manufacturing companies"},
                {"label": "Specific problem", "placeholder": "e.g., slow vendor onboarding processes"},
                {"label": "Your solution/approach", "placeholder": "e.g., providing a pre-qualified vendor package"},
                {"label": "Location", "placeholder": "e.g., Orlando, FL"},
                {"label": "Credibility statement", "placeholder": "e.g., already serve 15 clients in Latin America"}
            ]
        }
        log('lesson-6-2', 'B2', 'Enhanced elevator pitch exercise with fill-in-blank template + example')
    save('lesson-6-2', d)

    # ── 8-1: Replace overlapping checklist + scoring with unified scored rubric ──
    d = load('lesson-8-1')
    blocks = d['contentBlocks']
    # Remove the old 10-item checklist
    for i in range(len(blocks) - 1, -1, -1):
        if blocks[i].get('type') == 'checklist' and 'Readiness' in blocks[i].get('title', ''):
            blocks.pop(i)
            break
    # Replace the scoring exercise with a unified rubric
    idx, _ = find_block(blocks, 'exercise', 'Readiness Scoring')
    if idx is not None:
        blocks[idx] = {
            "type": "exercise",
            "id": "exercise-8-1-rubric",
            "title": "Your Market Readiness Score",
            "format": "scored-rubric",
            "instruction": "Rate yourself honestly on each dimension. There is no passing score — the point is to identify where you are strong and where you need more preparation.",
            "scale": {"min": 1, "max": 5, "labels": ["Not started", "Researching", "Partially ready", "Mostly ready", "Fully prepared"]},
            "dimensions": [
                {"label": "Legal Setup", "description": "Entity type chosen, EIN obtained, registered agent in place"},
                {"label": "Financial Foundation", "description": "Bank account open, tax obligations understood, accountant identified"},
                {"label": "IP & Risk Protection", "description": "Trademarks filed, insurance active, key contracts reviewed"},
                {"label": "Team & Compliance", "description": "Hiring classification understood, payroll plan in place, visa status clear"},
                {"label": "Market Strategy", "description": "U.S. pricing set, competitive research done, customer acquisition plan ready"},
                {"label": "Cultural Readiness", "description": "Communication style adapted, meeting norms understood, follow-up habits in place"},
                {"label": "Ecosystem & Network", "description": "Support organizations identified, networking started, mentor relationship active"}
            ],
            "interpretation": [
                {"range": "7-15", "message": "You are in the early exploration phase. Focus on Modules 1-3 before taking action."},
                {"range": "16-25", "message": "You have a foundation but gaps remain. Revisit the modules where you scored 1-2."},
                {"range": "26-30", "message": "You are well-prepared in most areas. Address any remaining 2s before moving forward."},
                {"range": "31-35", "message": "You are highly prepared. Consider scheduling your Phase 2 consultation with UCF BIP."}
            ]
        }
        log('lesson-8-1', 'B2', 'Replaced overlapping checklist + scoring exercise with unified 7-dimension scored rubric')
    save('lesson-8-1', d)


# ═══════════════════════════════════════════════════════════════════════════════
# B3: STRETCH SCENARIOS
# ═══════════════════════════════════════════════════════════════════════════════

def add_stretch_scenarios():
    print("\n=== B3: STRETCH SCENARIOS ===\n")

    # ── 1-1: Entity decision scenario ──
    d = load('lesson-1-1')
    blocks = d['contentBlocks']
    # Insert after comparison card, before "How Your Entity Type Connects"
    idx, _ = find_block(blocks, 'comparison-card', 'LLC vs. C-Corp')
    if idx is not None:
        scenario = {
            "type": "scenario",
            "id": "scenario-1-1-entity",
            "title": "Which Entity Fits Your Business?",
            "description": "You are launching a tech startup with a co-founder. You have $80,000 in savings, a working prototype, and plan to pitch U.S. investors within 12 months. Which entity structure makes the most sense?",
            "paths": [
                {
                    "label": "LLC — keep it simple and flexible",
                    "outcome": "An LLC is simpler to set up and maintain, but most U.S. venture capital firms will not invest in an LLC. If you plan to raise institutional funding within 12 months, you will likely need to convert to a C-Corp later — adding $2,000-$5,000 in legal fees and tax complexity. Starting as a C-Corp avoids this.",
                    "isRecommended": False
                },
                {
                    "label": "C-Corp — investor-ready from day one",
                    "outcome": "Correct for this scenario. A Delaware or Florida C-Corp is the standard structure that U.S. investors expect. It allows for multiple share classes, stock option pools, and the SAFE/convertible note instruments that early-stage investors use. The extra paperwork is worth it if fundraising is in your 12-month plan.",
                    "isRecommended": True
                },
                {
                    "label": "S-Corp — best tax treatment",
                    "outcome": "An S-Corp offers tax advantages for U.S. citizens, but it requires ALL shareholders to be U.S. citizens or permanent residents. As an international founder, you are ineligible. This option is off the table for most participants in this program.",
                    "isRecommended": False
                }
            ]
        }
        insert_after(blocks, idx, scenario)
        log('lesson-1-1', 'B3', 'Added scenario: "Which Entity Fits Your Business?" (tech startup + investor path)')
    save('lesson-1-1', d)

    # ── 2-1: Missed quarterly taxes scenario ──
    d = load('lesson-2-1')
    blocks = d['contentBlocks']
    idx, _ = find_block(blocks, 'tabs', 'Tax Breakdown by Jurisdiction')
    if idx is not None:
        scenario = {
            "type": "scenario",
            "id": "scenario-2-1-taxes",
            "title": "You Missed a Quarterly Payment — Now What?",
            "description": "It is July. You set up your LLC in January and have been earning revenue since March. You just realized you have not made any estimated tax payments to the IRS. What should you do?",
            "paths": [
                {
                    "label": "Wait until the annual tax filing deadline to pay everything at once",
                    "outcome": "Dangerous. The IRS charges penalties for each quarter you miss. Waiting until April means penalties accumulate for Q1, Q2, Q3, and Q4. The longer you wait, the more you owe in interest and penalties — exactly what happened to the Brazilian founder who got a $1,200 surprise.",
                    "isRecommended": False
                },
                {
                    "label": "Make an estimated payment now and catch up on missed quarters",
                    "outcome": "Best move. Pay what you owe for Q1 and Q2 immediately, then set up quarterly payments going forward. The IRS may still charge a small penalty for the late quarters, but it will be much less than waiting. Use Form 1040-ES or pay directly at irs.gov/payments.",
                    "isRecommended": True
                },
                {
                    "label": "Call your CPA and ask them to handle it",
                    "outcome": "Good instinct, but do not wait for the appointment. Make the payment now through irs.gov, then consult your CPA about the correct quarterly amounts going forward. Every day of delay adds to the penalty calculation.",
                    "isRecommended": False
                }
            ]
        }
        insert_after(blocks, idx, scenario)
        log('lesson-2-1', 'B3', 'Added scenario: "You Missed a Quarterly Payment — Now What?"')
    save('lesson-2-1', d)

    # ── 4-1: Contractor misclassification scenario ──
    d = load('lesson-4-1')
    blocks = d['contentBlocks']
    idx, _ = find_block(blocks, 'text', 'The IRS Test')
    if idx is not None:
        scenario = {
            "type": "scenario",
            "id": "scenario-4-1-classification",
            "title": "Contractor or Employee? The IRS Is Watching",
            "description": "You hired a developer six months ago as a 1099 contractor. She works 40 hours a week, uses your company laptop, attends your daily standup meetings, and you set her schedule. She just asked about health insurance. What is your biggest risk?",
            "paths": [
                {
                    "label": "No risk — she signed a contractor agreement",
                    "outcome": "Wrong. The IRS does not care what the contract says. They look at the ACTUAL working relationship. A signed agreement does not override the facts: if you control when, where, and how someone works, they are an employee in the eyes of the IRS regardless of what you call them.",
                    "isRecommended": False
                },
                {
                    "label": "She is likely misclassified — convert her to W-2 employee immediately",
                    "outcome": "Correct. Under the IRS three-factor test (behavioral control, financial control, relationship type), this worker is an employee. Converting her now limits your exposure. If the IRS reclassifies her, you owe back taxes, the employee's share of FICA, plus penalties that can reach $50 per misclassified W-2.",
                    "isRecommended": True
                },
                {
                    "label": "Reduce her hours to under 30 per week to maintain contractor status",
                    "outcome": "Hours alone do not determine classification. The IRS looks at behavioral control (do you set her schedule?), financial control (does she work only for you?), and relationship type (is the relationship permanent?). Reducing hours while keeping everything else the same will not change the classification.",
                    "isRecommended": False
                }
            ]
        }
        insert_after(blocks, idx, scenario)
        log('lesson-4-1', 'B3', 'Added scenario: "Contractor or Employee? The IRS Is Watching"')
    save('lesson-4-1', d)

    # ── 5-1: Pricing strategy scenario ──
    d = load('lesson-5-1')
    blocks = d['contentBlocks']
    idx, _ = find_block(blocks, 'text', 'Product-Market Fit')
    if idx is not None:
        scenario = {
            "type": "scenario",
            "id": "scenario-5-1-pricing",
            "title": "Your Price Is Too Low — What Do You Do?",
            "description": "Your SaaS product costs $15/month in Latin America. A U.S. prospect says: 'At that price, I'd assume it doesn't include compliance features.' Your U.S. competitors charge $45-$65/month. What is your move?",
            "paths": [
                {
                    "label": "Keep the $15 price — it is your competitive advantage",
                    "outcome": "Risky in the U.S. market. American B2B buyers associate low prices with missing features, poor support, or short company lifespan. You may win price-sensitive customers but lose enterprise buyers who need to justify the purchase to procurement teams. Cheap signals risk.",
                    "isRecommended": False
                },
                {
                    "label": "Raise to $39/month and add U.S.-specific features (compliance docs, English support, SLA)",
                    "outcome": "Strong approach. Pricing within the competitive range signals credibility. Adding U.S.-specific features (SOC 2 documentation, English-first support, uptime SLA) justifies the price increase and addresses the real concern: does this product meet U.S. business standards?",
                    "isRecommended": True
                },
                {
                    "label": "Create a separate 'U.S. Edition' at $55/month with premium positioning",
                    "outcome": "Viable but complex. A separate tier can work if you genuinely have premium features to offer. But managing two product tiers across markets adds operational complexity. Start with one competitive U.S. price and add tiers later when you understand the market better.",
                    "isRecommended": False
                }
            ]
        }
        insert_after(blocks, idx, scenario)
        log('lesson-5-1', 'B3', 'Added scenario: "Your Price Is Too Low — What Do You Do?"')
    save('lesson-5-1', d)

    # ── 6-3: Cultural decoder scenario ──
    d = load('lesson-6-3')
    blocks = d['contentBlocks']
    idx, _ = find_block(blocks, 'table', 'Reading the Undercurrents')
    if idx is not None:
        scenario = {
            "type": "scenario",
            "id": "scenario-6-3-cultural",
            "title": "What Did They Really Mean?",
            "description": "You just had a great 45-minute meeting with a potential U.S. partner. They said: 'This is really exciting. We love what you're building. Let me run this by a few people internally and we'll circle back next week.' It has been 10 days with no follow-up. What is happening?",
            "paths": [
                {
                    "label": "They are busy — give them more time",
                    "outcome": "Unlikely. In U.S. business culture, if someone is genuinely excited about a deal, they follow up within the timeline they set. 'Next week' means next week. Ten days of silence after enthusiastic language is a strong signal that interest has cooled. Waiting longer wastes your time.",
                    "isRecommended": False
                },
                {
                    "label": "Send one brief follow-up email — then move on if no response",
                    "outcome": "Correct approach. Send a short, specific follow-up: 'Hi [name], wanted to check in on our conversation from [date]. Happy to answer any questions from your team.' If no response within 3-4 business days, the opportunity is likely dead. Do not send multiple follow-ups — it signals desperation and damages the relationship for future opportunities.",
                    "isRecommended": True
                },
                {
                    "label": "Call them directly to show enthusiasm and persistence",
                    "outcome": "In many Latin American business cultures, calling shows initiative. In U.S. business culture, an unexpected call after radio silence often feels pushy. Email first. If they want to talk, they will suggest a call. Persistence reads differently across cultures — in the U.S., one follow-up is professional, two is acceptable, three is aggressive.",
                    "isRecommended": False
                }
            ]
        }
        insert_after(blocks, idx, scenario)
        log('lesson-6-3', 'B3', 'Added scenario: "What Did They Really Mean?" (cultural decoder)')
    save('lesson-6-3', d)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

fix_text_walls()
add_new_interactives()
add_stretch_scenarios()

print(f"\n{'='*60}")
print(f"Total Phase B changes: {len(changes)}")
if DRY_RUN:
    print("\n=== DRY RUN === Run with --apply to write.")
else:
    print("All changes written to lesson files.")
