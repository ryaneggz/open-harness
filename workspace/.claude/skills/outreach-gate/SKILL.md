---
name: outreach-gate
description: |
  Deterministic quality gate for cold-email drafts. 25 named checks (G_SUBJ_LEN, G_BODY_LEN, G_BODY_NO_BANNED_PHRASE, G_SIG_HAS_ADDRESS, ...).
  Regex + word-count + set-membership only. NO LLM. No draft with gate_status != PASS is deliverable.
  TRIGGER when: cold-email writes a draft; owner manually runs against a draft.
argument-hint: "<path-to-draft.md>"
---

# outreach-gate — Deterministic Threshold Check

Cloned from the orchestrator's `quality-gate/` template, specialized with 25 named checks from spec 04 § 5.

## Contract

- **Type**: Deterministic. NO LLM. Pure regex / word-count / set-membership.
- **Input**: Path to a draft markdown file under `crm/drafts/<lead-id>/*.md`.
- **Output**: Markdown report to stdout + rewrite of the draft's frontmatter `gate_status`.
- **Side effects**:
  - Rewrites draft frontmatter `gate_status` → `PASS` or `FAIL`.
  - Calls `/crm-write note <lead_id> "outreach-gate <status>" ref=<path>`.
  - On FAIL, does NOT modify body. Author revises.
- **Determinism**: Full. Same input → same PASS/FAIL.

## Checks

### Subject line (extracted from body: line starting `Subject:`)
| Check | Rule |
|-------|------|
| `G_SUBJ_LEN` | `len(subject) ≤ 60` |
| `G_SUBJ_WORDS` | `len(subject.split()) ≤ 9` |
| `G_SUBJ_NO_ALLCAPS` | No word >3 chars in ALLCAPS except allow-list: `GMA ISPM NWPCA NC SC VA GA TN 3PL USDA FDA IPPC EUR EPAL CHEP PECO` |
| `G_SUBJ_NO_EXCLAIM` | Zero `!` |
| `G_SUBJ_NO_EMOJI` | No Unicode emoji (ranges U+1F300–U+1F9FF etc.) |
| `G_SUBJ_NO_REBRACKET` | No `RE:` or `FWD:` unless thread truly exists |
| `G_SUBJ_NO_PRICING_WORD` | Banned substrings (case-insensitive): `free`, `discount`, `$`, `cheap`, `save`, `urgent`, `!!!`, `act now`, `limited time`, `deal`, `offer` |
| `G_SUBJ_HAS_SPECIFIC` | Must match at least one of: `{company}`, `{city}`, a vertical-specific term from the template's frontmatter |

### Opener (first 1-2 sentences of body)
| Check | Rule |
|-------|------|
| `G_OPENER_NO_COMPLIMENT` | Banned: `hope this finds you well`, `hope you're doing well`, `trust this email finds you`, `hope your week is going great` |
| `G_OPENER_NO_I_WE_START` | First word ≠ `I` / `We` / `Our` |
| `G_OPENER_HAS_FACT` | ≥1 prospect-fact token (company, city, vertical term, trigger event) |
| `G_OPENER_MAX_2_SENT` | `count(.!?) ≤ 2` (in first 2 sentences, abbrev-aware) |
| `G_OPENER_MAX_35_WORDS` | `len(opener.words) ≤ 35` |

### Body
| Check | Rule |
|-------|------|
| `G_BODY_LEN` | Touch-specific word cap from frontmatter: T1=120, T2=80, T4=100, T6=40, T8=60 |
| `G_BODY_ONE_ASK` | Exactly one `?` or CTA sentence |
| `G_BODY_NO_BANNED_PHRASE` | Not present: spam triggers (~40) + corpspeak (~70). See banned-phrases.txt sibling file (future). Seed list below. |
| `G_BODY_PERSONALIZATION_TOKENS` | ≥2 of: `{company}`, `{city}`, `{vertical_term}`, `{trigger_event}`, `{current_supplier}`, `{volume}` resolved |
| `G_BODY_PROSPECT_FACTS` | ≥1 fact cited; if `research.md` exists, at least one entity from research appears |

### Signature + compliance
| Check | Rule |
|-------|------|
| `G_SIG_HAS_NAME` | Signature block contains a name |
| `G_SIG_HAS_COMPANY` | Signature block names the principal (from USER.md) |
| `G_SIG_HAS_ADDRESS` | Physical address (CAN-SPAM mandatory) |
| `G_SIG_HAS_OPTOUT` | Unsubscribe link OR "reply STOP" instruction |

### Sending rules
| Check | Rule |
|-------|------|
| `G_COUNTRY_US_ONLY` | `state` in `{NC, SC, VA, GA, TN, other}`; non-US destinations flagged (v1 out of scope) |
| `G_INBOX_CAP` | Warn if today's count for this inbox exceeds per-domain cap (configurable, default 3) |

## Seed Banned Phrases

**Spam triggers** (case-insensitive substring):
`free pallet`, `free quote`, `no obligation`, `act now`, `limited time`, `100% guaranteed`, `amazing`, `click here`, `order now`, `save big`, `best price`, `cheap`, `guaranteed`, `great deal`, `risk-free`, `winner`, `congratulations`, `$$$`, `!!!`, `urgent`

**Corpspeak** (case-insensitive):
`synergy`, `leverage our`, `cutting-edge`, `world-class`, `best-in-class`, `paradigm shift`, `game-changer`, `move the needle`, `circle back`, `touch base`, `low-hanging fruit`, `at the end of the day`, `thought leader`, `value-add`, `deep dive`, `take offline`, `ballpark`, `bandwidth`

## Output Format

```
OUTREACH GATE CHECK (as of 2026-04-18)
Draft: crm/drafts/L-000042/2026-04-18T14-02Z-cold.md
======================================
Subject length <= 60:        42   [PASS]
Subject words <= 9:           7   [PASS]
No allcaps (ex allow-list):   0   [PASS]
No `!`:                       0   [PASS]
No emoji:                     0   [PASS]
No pricing word:              0   [PASS]
Subject has specific:         1   [PASS]

Opener no compliment:         0   [PASS]
Opener no I/We start:         0   [PASS]
Opener has fact:              1   [PASS]
Opener max 2 sentences:       2   [PASS]
Opener max 35 words:         24   [PASS]

Body len <= 120:             98   [PASS]
Body one ask:                 1   [PASS]
Body no banned phrase:        0   [PASS]
Body personalization tokens:  3   [PASS] (threshold >= 2)
Body prospect facts cited:    2   [PASS]

Sig has name:                 1   [PASS]
Sig has company:              1   [PASS]
Sig has address:              1   [PASS]
Sig has opt-out:              1   [PASS]

Country US-only:              1   [PASS]
Inbox cap:                    2   [PASS] (cap 3, today's count 2)

Overall Gate: PASS
```

## Failure Modes

- On FAIL: print the failed checks with specific offenders (which banned phrase hit, which word exceeded count).
- Draft `gate_status` → `FAIL`.
- `history.csv` row: `note "outreach-gate FAIL: G_SUBJ_LEN(78), G_BODY_NO_BANNED_PHRASE(free quote)"`
- Author must revise and re-run.

## Guardrails

- Gate does NOT modify the body — only frontmatter.
- Gate does NOT send the email — send is external and manual.
- Gate refuses to run on a draft missing required frontmatter (`lead_id`, `touch`).
