#!/usr/bin/env python3
"""Replace all '3-6 months' / '3–6 months' / '3 to 6 months' with '2–6 months'"""
import sys, io, os, glob, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.abspath(__file__))
changed_files = []

for pattern in ['generated/*.json', 'phase1-lessons/*.json']:
    for fpath in glob.glob(os.path.join(BASE, pattern)):
        txt = open(fpath, encoding='utf-8').read()
        new_txt = txt
        # Replace all variants: 3–6, 3-6, 3 to 6 (case-insensitive, months/month)
        new_txt = re.sub(r'3\u20136 month', '2\u20136 month', new_txt)  # em dash
        new_txt = re.sub(r'3-6 month', '2\u20136 month', new_txt)       # hyphen
        new_txt = re.sub(r'3 to 6 month', '2 to 6 month', new_txt)      # words
        if new_txt != txt:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_txt)
            fname = os.path.relpath(fpath, BASE)
            changed_files.append(fname)
            print(f'FIXED: {fname}')

print(f'\nTotal files updated: {len(changed_files)}')
print('DONE')
