#!/usr/bin/env python3
"""Flavour and copy audit: missing text, duplicates, and tone that contradicts effects."""
import json, re, collections

pol = json.load(open('config/policies.json'))
evs = json.load(open('config/events.json'))['events']
issues = []
seen = collections.Counter()

for c in pol['policies']:
    if not c.get('briefing'):
        issues.append(f"MISSING briefing: {c['id']}")
    for o in c['options']:
        f = o.get('flavour', '')
        if not f:
            issues.append(f"MISSING flavour: {c['id']}/{o['id']}")
        else:
            seen[f] += 1
        e = o.get('effects', {})
        if e.get('approvalBoost', 0) > 4 and re.search(r'nobody thanks|unpopular|resent', f, re.I):
            issues.append(f"TONE: popular effect, unpopular text — {c['id']}/{o['id']}")
        if e.get('approvalBoost', 0) < -4 and re.search(r'polls well|gratitude|popular\b', f, re.I):
            issues.append(f"TONE: costly effect, popular text — {c['id']}/{o['id']}")
        if e.get('taxRate', 0) > 0.4 and not re.search(
                r'revenue|tax|excise|collect|fund|VAT', f + c.get('briefing', ''), re.I):
            issues.append(f"COPY: raises revenue, never says so — {c['id']}/{o['id']}")
        if e.get('reformIndex', 0) >= 30 and not re.search(
                r'reform|fight|resist|ministr|agenc|nobody', f, re.I):
            issues.append(f"COPY: major reform with no friction in text — {c['id']}/{o['id']}")
        if o.get('requiresFlags') and not o.get('lockedNote'):
            issues.append(f"COPY: locked option with no explanation — {c['id']}/{o['id']}")
        if o.get('dependsOn') and not o['dependsOn'].get('note'):
            issues.append(f"COPY: soft dependency with no note — {c['id']}/{o['id']}")

for ev in evs:
    if not ev.get('body'):
        issues.append(f"MISSING body: event {ev['id']}")
    for o in ev['options']:
        f = o.get('flavour', '')
        if not f:
            issues.append(f"MISSING flavour: event {ev['id']}/{o['id']}")
        else:
            seen[f] += 1
        if not o.get('opinion') and not o.get('unavailable'):
            issues.append(f"COPY: event option moves nobody — {ev['id']}/{o['id']}")

for f, n in seen.items():
    if n > 1:
        issues.append(f"DUPLICATE flavour ({n}x): {f[:70]}…")

print(f"cards {len(pol['policies'])}  card options {sum(len(c['options']) for c in pol['policies'])}")
print(f"events {len(evs)}  event options {sum(len(e['options']) for e in evs)}")
print(f"\n{len(issues)} issue(s):")
for i in issues:
    print('  -', i)
