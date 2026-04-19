# SDR Outbound Execution Spec

> **Scope**: Mechanics of outbound — cold email anatomy, multichannel cadence, personalization rules, reply handling, deliverability, compliance, quality gates, metrics.
> **Out of scope**: Sales methodology stages (see `01-sales-methodology.md`), pallet product enums & objection bank (see `02-pallet-domain.md`), NC/Southeast vertical lists & geographic hooks (see `03-nc-gtm.md`), Claude Code skill wiring (see `05-agent-architecture.md`).
> **Authoritative consumer**: `workspace/.claude/skills/outreach-gate/` — every rule in this spec is a deterministic check that gate performs before an email publishes.

---

## 1. Context

### 1.1 Operating Envelope

- **Volume**: 50–200 prospects/week (not 5,000). Personalization beats throughput.
- **Deliverability over scale**: one blacklisting destroys the entire outbound channel; we target reply-rate not send-rate.
- **Human owner in the loop**: agent drafts; human reviews gate output before send (at least until reply-rate baseline established).
- **Territory**: Southeast US (NC/SC/VA/GA/TN). No national blasting.
- **Channel mix**: email primary, LinkedIn secondary, phone tertiary. No SMS, no direct mail in v1.

### 1.2 Non-Negotiable Principles

1. **One prospect fact per touch** — at least one verifiable, specific reference to THIS company (not "companies like yours").
2. **One ask per email** — exactly one question or CTA. No multi-question paragraphs.
3. **Read in 15 seconds** — subject + preview + body readable on a phone without scrolling past one screen.
4. **Respect the inbox** — if no reply after full cadence, break for 90 days before re-engaging.
5. **Compliance by construction** — every send carries physical address + unsubscribe; the gate refuses to pass an email without them.

### 1.3 Inputs This Spec Expects

- `workspace/crm/leads.csv` — per-lead row (id, company, city, state, contact_name, contact_title, contact_email, pallet_interest, est_volume_weekly, stage, source, notes_ref, …).
- `workspace/crm/history.csv` — append-only event log for touches.
- `workspace/wiki/pages/` — pallet-domain facts (objection bank, product specs), NC-GTM hooks (vertical-specific pain points).
- Vertical name (snake_case, from `03-nc-gtm.md`): e.g. `3pl`, `brewery`, `furniture`, `ag_produce`, `textile`, `building_products`, `food_bev_copacker`.

---

## 2. Cadence Design

### 2.1 Sequence Overview (8 touches over 21 days, then break)

Day offsets measured from **Touch 1** send (T+0). All touches are weekdays; if a touch lands on a weekend or US federal holiday, push to next business day. No touches before 08:00 or after 17:00 prospect-local (ET for Southeast).

| Touch | Day | Channel | Goal | Length cap | Stops on reply? |
|-------|-----|---------|------|------------|-----------------|
| 1 | T+0 | Email | Introduce relevance; one specific prospect fact; one soft ask | 120 words body | Yes |
| 2 | T+3 | Email | New angle (different value prop or vertical hook); bump thread | 80 words | Yes |
| 3 | T+6 | LinkedIn connect | No pitch in note. Referenced mutual geography or vertical only | 300 chars | Yes |
| 4 | T+9 | Email | Proof-point: case study / comparable NC customer (anonymized OK) | 100 words | Yes |
| 5 | T+13 | Phone | One call, one voicemail if no pickup. Voicemail ≤25 seconds | 25s VM | Yes (log) |
| 6 | T+15 | Email | Pattern interrupt — different format (e.g., 2-line "still worth a look?") | 40 words | Yes |
| 7 | T+19 | LinkedIn message | Only if connection accepted; otherwise skip. One-line relevance | 200 chars | Yes |
| 8 | T+21 | Email (break-up) | Explicit close: "assuming not a fit, closing the loop" + easy revive | 60 words | Yes |
| — | T+111 | Re-engage allowed | 90-day cooldown ends; new trigger event required to re-enter | — | — |

**Hard rules**:

- Max 8 touches per prospect per cadence. No exceptions.
- A reply of any kind (even OOO auto-reply) **stops the scheduled cadence**; reply-handling playbook (§6) takes over.
- Skip Touch 7 entirely if LinkedIn connect (Touch 3) was not accepted within 8 days.
- Never send Touch 1 and Touch 2 on the same calendar day.
- After the break-up (Touch 8), lead moves to `stage=closed_lost` with `lost_reason=no_response` and enters 90-day cooldown list.

### 2.2 Per-Touch Intent

| Touch | Intent | Forbidden content |
|-------|--------|-------------------|
| 1 | Earn the second email | Product dump, feature list, pricing |
| 2 | Reframe without repeating T1 | Copy-paste of T1 with "bumping this" only |
| 3 | Humanize channel | Any pitch language, "saw you might need pallets" |
| 4 | Third-party proof | Unverifiable claims, named customers without permission |
| 5 | Voice signal | Reading a script verbatim; longer than 25s VM |
| 6 | Break pattern | Re-pitching T1 value prop |
| 7 | LinkedIn touch if connected | DM blast copy |
| 8 | Clean close | Guilt, "last chance", manufactured urgency |

### 2.3 Sequence Branching

A reply during the cadence forks the lead into one of these states (see §6 for response templates):

- `interested` → cadence paused; stage advances per methodology spec.
- `not_now` → cadence paused; lead scheduled for re-engage per prospect-supplied timing (default +60 days).
- `wrong_person` → cadence paused on this contact; new cadence started on referred contact with T+0 reset. Original contact tagged `stage=closed_lost`, `lost_reason=wrong_contact`.
- `decline` → cadence stopped, added to DNC list (§8.2), `stage=closed_lost`, `lost_reason=declined`.
- `out_of_office` → cadence paused; resume T+N where N is 1 business day after OOO return date (parsed from auto-reply if available, else +7 days).

---

## 3. Email Anatomy

### 3.1 Subject Line Rules (gateable)

| Rule | Threshold | Check |
|------|-----------|-------|
| `subj_length` | ≤ 60 chars | `len(subject) ≤ 60` |
| `subj_word_count` | ≤ 9 words | `len(subject.split()) ≤ 9` |
| `subj_no_allcaps_word` | no word >3 chars in ALLCAPS (acronyms OK) | regex `\b[A-Z]{4,}\b` absent except allow-list (GMA, ISPM, NWPCA, NC, SC, VA, GA, TN, 3PL, USDA, FDA) |
| `subj_no_exclaim` | zero `!` | `"!" not in subject` |
| `subj_no_emoji` | no emoji | Unicode emoji ranges absent |
| `subj_no_rebracket` | no `RE:` or `FWD:` unless real thread | starts-with check |
| `subj_no_pricing_word` | banned: `free`, `discount`, `$`, `cheap`, `save`, `urgent`, `!!!`, `act now` | substring check, case-insensitive |
| `subj_has_specific` | must contain company-specific or vertical-specific token | regex must match one of: `{prospect_company}`, `{prospect_city}`, vertical keyword from `03-nc-gtm.md` |

**Format patterns that pass**:

- `question re {prospect_company} pallets`
- `{prospect_city} → Wilmington lane`
- `GMA 48×40 for {prospect_company}?`

**Format patterns that fail**:

- `Quick question` (no specificity)
- `FREE pallet quote!!` (banned words, exclaim)
- `Let's connect` (generic, no token)

### 3.2 Opener Rules

The opener is the first 1–2 sentences. These carry the personalization.

| Rule | Threshold | Check |
|------|-----------|-------|
| `opener_no_compliment` | banned: "hope this finds you well", "hope you're doing well", "trust this email finds you", "hope your week is going great" | substring check, case-insensitive |
| `opener_no_i_we_start` | first word of body ≠ `I`, `We`, `Our` | token-0 check |
| `opener_has_fact` | at least one prospect-fact token (see §4.1) | regex match against enumerated fact sources |
| `opener_max_sentences` | ≤ 2 sentences | count of `.!?` outside abbreviations |
| `opener_max_words` | ≤ 35 words | word count of first 2 sentences |

### 3.3 Value Prop Rules

The middle 1–3 sentences. Tied to vertical hook + prospect inferred need.

| Rule | Threshold | Check |
|------|-----------|-------|
| `vp_concrete_benefit` | contains at least one quantified or concrete term (e.g., "heat-treated for USDA export", "next-day Charlotte→Raleigh", "400/week") | regex against pallet-domain lexicon + numeric pattern |
| `vp_no_adjective_soup` | banned: `world-class`, `best-in-class`, `cutting-edge`, `innovative`, `revolutionary`, `leverage`, `synergy`, `robust solution`, `game-changer` | substring check |
| `vp_no_feature_list` | no bullet list with >3 items, no ≥3 comma-separated feature tokens in one sentence | structural check |
| `vp_ties_to_prospect` | references `{prospect_fact}` OR vertical hook keyword from `03-nc-gtm.md` | regex check |

### 3.4 CTA Rules

Exactly one ask. Must be answerable with yes/no or a one-sentence reply.

| Rule | Threshold | Check |
|------|-----------|-------|
| `cta_count` | exactly one `?` OR one explicit ask verb (`worth a look`, `worth 15 min`, `open to`, `reply with`) | count = 1 |
| `cta_no_calendar_link` in T1–T3 | no Calendly/Chili Piper URL in first three touches | URL regex, domain blocklist |
| `cta_low_friction` | ask must be one of: `{yes_no_reply}`, `{15min_call}`, `{refer_right_person}` | enum check on ask classifier |
| `cta_no_demo_push` | banned in T1–T2: `demo`, `product tour`, `discovery call`, `book time` | substring check |

### 3.5 Signature Rules

Signature must carry compliance and identity minimum:

| Field | Required | Source |
|-------|----------|--------|
| Sender full name | yes | sender config |
| Role | yes | sender config |
| Company name | yes | sender config |
| Company phone | yes | sender config |
| Physical mailing address | yes (CAN-SPAM §8.1) | sender config |
| Unsubscribe link OR plain-text opt-out instruction | yes (CAN-SPAM §8.1) | sender config |
| Marketing banner / tagline | no — forbidden | gate removes |
| Image logo | no in T1–T3 (deliverability) | gate strips |

**Example compliant signature**:

```
— Morgan Reyes
Sales, {CompanyName}
{CompanyStreet}, {CompanyCity}, NC {Zip}
p: 919-555-0100
Reply "unsubscribe" to stop emails from me.
```

### 3.6 Body Length & Shape

| Rule | Threshold | Check |
|------|-----------|-------|
| `body_max_words` (T1) | ≤ 120 | word count excl. signature |
| `body_max_words` (T2) | ≤ 80 | ditto |
| `body_max_words` (T4) | ≤ 100 | ditto |
| `body_max_words` (T6) | ≤ 40 | ditto |
| `body_max_words` (T8) | ≤ 60 | ditto |
| `body_paragraphs_max` | ≤ 3 | `\n\n` split count |
| `body_sentences_max` | ≤ 8 for T1/T4, ≤ 5 for T2, ≤ 3 for T6 | sentence tokenize |
| `body_no_image` | no inline images, no attachments | MIME check pre-send |
| `body_no_tracking_pixel` | no 1×1 pixel img tag in v1 (hurts deliverability, not worth the signal) | HTML scan |
| `body_plaintext_preferred` | HTML OK if used only for a single hyperlink; otherwise plaintext | MIME type check |

---

## 4. Personalization Hierarchy

### 4.1 Prospect-Fact Tiers (ranked by impact)

An email must contain **at least one Tier-1 OR Tier-2 fact**. Tier-3 alone does NOT satisfy `opener_has_fact`.

| Tier | Fact source | Example | Why it works |
|------|-------------|---------|--------------|
| **Tier 1 — Trigger event** | Recent news, expansion, hire, press release, permit filing, DC opening, funding round | "Saw the press release about the new Mebane DC opening in Q3" | Highest relevance, highest reply rate |
| **Tier 1 — Operational signal** | Specific lane, port activity, USDA registration, BRC/SQF cert, SKU count, truck count | "Running your own fleet out of Greensboro and the Wilmington port on ISPM-15 loads" | Implies inferred need |
| **Tier 2 — Account-specific** | Named locations, specific products, public job postings, case study by them | "Your Raleigh tap-room and Durham production site both run 5k-case weeks per {public_source}" | Shows research, not scale |
| **Tier 2 — Vertical+geo specific** | Vertical pain referenced by name + prospect city/state | "3PL cross-docks around {I-85_corridor} tend to churn GMA 48×40 faster than the market" | Works when Tier 1 unavailable |
| **Tier 3 — Weak personalization** | Industry trend, generic "companies like yours", quoted CEO LinkedIn post without tying to pallet need | "Everyone in furniture is dealing with lumber volatility" | Fails gate alone — must pair with Tier 1/2 |

### 4.2 Extraction Provenance

Every prospect fact used in an email must carry a provenance reference in the `history.csv` entry: URL or `notes_ref` path. If provenance cannot be recorded, the fact was fabricated — the gate blocks the send.

Provenance format:

```
fact: "Mebane DC opening Q3"
source: https://www.wraltechwire.com/2026/…
captured: 2026-04-12
```

### 4.3 Token Substitution Safety

- Never send with an unfilled `{token}`. Gate scans for `{` or `}` in final output → fail.
- Always sanity-check `{contact_first_name}` — if empty, fall back to no name (not "Hi there" — fail the gate).
- Company-name casing must match public casing (e.g., "PepsiCo" not "pepsico", "MOM's Organic Market" not "Moms Organic Market").

### 4.4 What Counts As Research (input contract for `lead-research/`)

Before any outbound, `lead-research/` must have populated in `leads.csv`/`notes_ref`:

- Company website URL (verified 200 OK)
- 1+ Tier-1 OR Tier-2 fact with provenance
- Plausible pallet-interest enum (from `02-pallet-domain.md`)
- Estimated weekly volume bucket (`<100`, `100–500`, `500–2000`, `>2000`)
- Vertical classification (snake_case, from `03-nc-gtm.md`)

Missing any field → `outreach-gate` fails with `ERR_INSUFFICIENT_RESEARCH`.

---

## 5. Quality-Gate Criteria (`outreach-gate/`)

The gate runs before every email is marked send-ready. Output is a structured PASS/FAIL with per-rule detail. Pass = all gates PASS. Fail = any single gate FAIL.

### 5.1 Gate Matrix

| # | Gate ID | Rule | Source § |
|---|---------|------|----------|
| 1 | `G_SUBJ_LEN` | subject ≤ 60 chars | §3.1 |
| 2 | `G_SUBJ_WORDS` | subject ≤ 9 words | §3.1 |
| 3 | `G_SUBJ_NO_SPAM` | no spam triggers | §3.1, §7 |
| 4 | `G_SUBJ_SPECIFIC` | contains company/city/vertical token | §3.1 |
| 5 | `G_OPENER_NO_COMPLIMENT` | no banned compliments | §3.2 |
| 6 | `G_OPENER_NOT_ME_FIRST` | doesn't start with I/We/Our | §3.2 |
| 7 | `G_OPENER_HAS_FACT` | ≥1 Tier-1/Tier-2 fact present | §4.1 |
| 8 | `G_VP_CONCRETE` | concrete/quantified benefit | §3.3 |
| 9 | `G_VP_NO_SOUP` | no banned corpspeak | §3.3, §7 |
| 10 | `G_CTA_COUNT` | exactly one ask | §3.4 |
| 11 | `G_CTA_NO_CALENDAR_EARLY` | no scheduler link in T1–T3 | §3.4 |
| 12 | `G_CTA_LOW_FRICTION` | ask in allowed enum | §3.4 |
| 13 | `G_BODY_LENGTH` | within touch-specific cap | §3.6 |
| 14 | `G_BODY_PARAS` | ≤3 paragraphs | §3.6 |
| 15 | `G_NO_ATTACHMENTS` | no inline images/attachments | §3.6 |
| 16 | `G_NO_UNFILLED_TOKENS` | no `{` or `}` survive | §4.3 |
| 17 | `G_SIG_HAS_ADDRESS` | physical address present | §3.5, §9.1 |
| 18 | `G_SIG_HAS_OPTOUT` | unsubscribe mechanism present | §3.5, §9.1 |
| 19 | `G_PROVENANCE_LOGGED` | every claimed fact has a URL/notes_ref entry | §4.2 |
| 20 | `G_DNC_CLEAR` | contact_email ∉ DNC list | §8.2 |
| 21 | `G_BOUNCE_HISTORY_CLEAR` | prior bounces for this domain < threshold (§8.3) | §8.3 |
| 22 | `G_RESEARCH_COMPLETE` | all §4.4 fields populated | §4.4 |
| 23 | `G_CADENCE_TOUCH_VALID` | current touch index ≤ 8 AND ≥1 business day since prior | §2.1 |
| 24 | `G_QUIET_HOURS` | scheduled send time ∈ [08:00, 17:00] prospect-local, weekday, non-holiday | §2.1 |
| 25 | `G_INBOX_CAP` | sender inbox has not exceeded daily send cap (§8.3) | §8.3 |

### 5.2 Gate Output Format

```
OUTREACH GATE CHECK  lead_id=L0042  touch=1  sender=morgan@{domain}  ts=2026-04-18T10:05:00-04:00
===========================================================================================
G_SUBJ_LEN              PASS   47/60
G_SUBJ_WORDS            PASS   6/9
G_SUBJ_NO_SPAM          PASS
G_SUBJ_SPECIFIC         PASS   matched: "Wilmington"
G_OPENER_NO_COMPLIMENT  PASS
G_OPENER_NOT_ME_FIRST   PASS
G_OPENER_HAS_FACT       PASS   Tier-1 operational: "ISPM-15 export to EU"
G_VP_CONCRETE           PASS   matched: "heat-treated", "48x40"
G_VP_NO_SOUP            PASS
G_CTA_COUNT             PASS   count=1
G_CTA_NO_CALENDAR_EARLY PASS
G_CTA_LOW_FRICTION      PASS   class=yes_no_reply
G_BODY_LENGTH           PASS   96/120
G_BODY_PARAS            PASS   3/3
G_NO_ATTACHMENTS        PASS
G_NO_UNFILLED_TOKENS    PASS
G_SIG_HAS_ADDRESS       PASS
G_SIG_HAS_OPTOUT        PASS
G_PROVENANCE_LOGGED     PASS   1/1 facts sourced
G_DNC_CLEAR             PASS
G_BOUNCE_HISTORY_CLEAR  PASS   0 prior bounces on furniturecoNC.com
G_RESEARCH_COMPLETE     PASS   vertical=furniture volume=500_2000
G_CADENCE_TOUCH_VALID   PASS   touch=1 prev=none
G_QUIET_HOURS           PASS   local=10:05 ET weekday
G_INBOX_CAP             PASS   sent_today=12/40

Overall: PASS  — safe to send
```

### 5.3 Failure Example

```
OUTREACH GATE CHECK  lead_id=L0097  touch=1
=================================================
G_SUBJ_LEN              PASS
G_SUBJ_NO_SPAM          FAIL   matched banned: "free"
G_OPENER_HAS_FACT       FAIL   only Tier-3 fact detected ("companies like yours")
G_VP_NO_SOUP            FAIL   matched: "best-in-class", "robust solution"
G_CTA_COUNT             FAIL   count=3  (3 question marks)
…
Overall: FAIL — 4 gates failed. Do NOT send. Draft returned for revision.
```

### 5.4 Escalation

- 2 consecutive FAIL drafts for same lead → flag lead for human review, pause cadence.
- Any gate with `G_DNC_CLEAR=FAIL` → hard block, silent drop, alert owner.
- Any gate with `G_BOUNCE_HISTORY_CLEAR=FAIL` → domain-quarantine the entire company for 30 days.

---

## 6. Reply-Handling Playbook

### 6.1 Reply Classification

First automated pass classifies reply into one of these types. Uncertain replies → `unknown` → human routes.

| Reply type | Signals |
|------------|---------|
| `interested` | affirmative verbs ("yes", "sure", "send info"), question back about product/pricing, explicit meeting request |
| `not_now` | "not right now", "check back in Q3", "circle back", "budget frozen" |
| `wrong_person` | "not me", "this goes to X", "try our procurement team", signature doesn't match target title |
| `decline` | "not interested", "remove me", "no thanks", "stop emailing" |
| `out_of_office` | subject contains "out of office"/"OOO"/"auto-reply"/"vacation"; body has return date |
| `unsubscribe` | explicit "unsubscribe", "opt me out", "take me off your list" |
| `unknown` | none of the above with confidence ≥ 0.7 |

### 6.2 Response Templates & Stage Actions

| Reply type | Response template (≤60 words) | Stage action |
|------------|-------------------------------|--------------|
| `interested` | "Appreciate the quick reply, {first_name}. Two quick qualifiers so I come back with something useful: (1) which size/treatment are you running today — GMA 48×40, heat-treated, something custom? (2) roughly how many per week out of {prospect_city}? Happy to pull a comparable lane quote before we eat up a call." | `stage=contacted → qualifying`; cadence paused; next action = await reply, 2-day SLA |
| `not_now` | "Totally fair, {first_name}. I'll stay out of your inbox until {date+60d}. If anything shifts on the {vertical_hook} side before then, my line below works." | cadence paused; re-engage task scheduled T+60d (or prospect-specified); `stage=nurture` |
| `wrong_person` | "Thanks for the redirect — I'll reach out to {referred_name}. Appreciate it." | current contact closed_lost (`wrong_contact`); new lead created for referred contact with provenance=`referral_from:{current_id}`; fresh cadence T+0 |
| `decline` | "Understood, {first_name}. I'll close the loop and won't reach out again. Best with the rest of the year." | add email to DNC; `stage=closed_lost` with `lost_reason=declined`; no further touches ever |
| `out_of_office` | _(no auto-response)_ | parse return date; cadence paused; resume at return_date + 1 business day. If OOO unparseable, pause 7 business days. |
| `unsubscribe` | _(no response — silence is the required behavior)_ | add to DNC; `stage=closed_lost` with `lost_reason=unsubscribed`; immediate removal from all future sends |
| `unknown` | _(no auto-response)_ | flag for human review within 4 business hours |

### 6.3 Meeting Acceptance (post-interest)

When prospect indicates willingness to meet, agent hands off per `01-sales-methodology.md`. Outbound spec stops here — the methodology spec owns discovery-call scripting, qualification, stage transitions.

### 6.4 Forbidden Responses

- Never argue with a `decline`.
- Never send a "did you see my last email?" follow-up after `not_now`.
- Never say "totally understand, but…" — the "but" erases the acknowledgment.
- Never dispute an `unsubscribe`, including to confirm receipt.

---

## 7. Banned-Phrase Registry

Two lists, enforced by `G_SUBJ_NO_SPAM` and `G_VP_NO_SOUP`. Case-insensitive substring match.

### 7.1 Spam Triggers (subject + body)

```
free, 100% free, act now, apply now, buy now, cheapest, click here,
congratulations, cash, $$$, !!!, double your, earn money, extra income,
get paid, great offer, guarantee, guaranteed, important information,
increase sales, limited time, lowest price, make money, money back,
no obligation, no cost, no fee, order now, promise you, risk-free,
satisfaction, save up to, special promotion, this won't last,
unbelievable, urgent, while supplies last, winner, winning, won
```

### 7.2 Corpspeak / Adjective Soup (body)

```
absolutely revolutionary, at the end of the day, bandwidth,
best-in-class, circle back, cutting-edge, deep dive, disrupt,
double-click, drill down, ecosystem, empower, game-changer,
game changing, granular, hand in glove, holistic,
i hope this email finds you well, hope this finds you well,
i hope you are doing well, ideate, impactful, incentivize, innovative,
journey, leverage, low-hanging fruit, mission-critical, move the needle,
next-generation, next-gen, on my radar, one-stop shop, open the kimono,
operationalize, optimize your, paradigm, paradigm shift, passionate about,
piece of the puzzle, pivot, proactive, push the envelope, quick sync,
reach out, revolutionary, robust solution, scalable solution, seamless,
seamlessly, secret sauce, shift the paradigm, silver bullet, slam dunk,
solutioning, state-of-the-art, streamline, synergy, synergies,
take it offline, think outside the box, thought leader, thought leadership,
touch base, turnkey solution, unique value proposition, unlock,
unlock value, value-add, value proposition, we are excited to, win-win,
world-class
```

### 7.3 Allow-List (do not block)

Industry terms that superficially match but are legitimate in this domain:

```
heat-treated
heat treated
ISPM-15
ISPM 15
GMA
GMA 48x40
USDA
NWPCA
FDA
certified
```

### 7.4 Registry Storage

Ships as `workspace/.claude/skills/outreach-gate/banned_phrases.json`:

```json
{
  "spam_subject": [...],
  "spam_body": [...],
  "corpspeak": [...],
  "allow_list": [...]
}
```

Human owner may amend; agent MAY NOT self-edit this file (mutation protected).

---

## 8. Deliverability & Sending Hygiene

### 8.1 DNS & Authentication Baseline (assumptions)

Before a single cold email is sent, the sending domain MUST have:

| Record | Requirement | Verification command (human-owner-run, one-time) |
|--------|-------------|--------------------------------------------------|
| SPF | `v=spf1 include:{esp_mechanism} -all` (hard fail) | `dig TXT {domain}` |
| DKIM | 2048-bit key, aligned with From: domain | `dig TXT {selector}._domainkey.{domain}` |
| DMARC | `v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}; adkim=s; aspf=s` | `dig TXT _dmarc.{domain}` |
| MX | Primary + secondary set | `dig MX {domain}` |
| rDNS (PTR) | PTR record matches sending IP's HELO | `dig -x {ip}` |
| BIMI | optional; defer | — |

**Sending domain strategy**:

- Use a **dedicated cold-outbound subdomain** (e.g., `go.{primary-domain}.com` or `sales.{primary}.com`). Never send cold from the primary root domain — isolates reputation damage.
- Separate subdomain for transactional (orders/receipts) so cold-email reputation can't poison order confirmations.

### 8.2 Do-Not-Contact (DNC) List

Stored at `workspace/crm/dnc.csv`:

| Column | Type | Notes |
|--------|------|-------|
| `email` | string | exact, lowercase |
| `domain` | string | optional — blocks entire domain if set |
| `added_ts` | ISO-8601 | |
| `reason` | enum | `unsubscribed`, `declined`, `bounced_hard`, `manual`, `competitor` |
| `source_lead_id` | string | lead_id that triggered entry |

**Rules**:

- Any `unsubscribe` reply → append to DNC within 10 minutes (SLA). CAN-SPAM mandates 10 business days; we enforce real-time to reduce risk.
- Hard bounces → append with `reason=bounced_hard`.
- Entries are **append-only**. Never deleted.
- DNC check is `G_DNC_CLEAR`; runs against `email` exact match AND `domain` match.
- If a reply contains BOTH unsubscribe intent AND interest (e.g. "remove me from this list, but call me about something else"), the unsubscribe wins — always. Agent does not attempt to "clarify."

### 8.3 Send Caps & Warm-Up Thresholds

| Stage | Daily cap per inbox | Inter-send delay | When |
|-------|---------------------|------------------|------|
| Warm-up week 1 | 10 sends/day | ≥ 3 min | Fresh domain, first 5 business days |
| Warm-up week 2 | 20 sends/day | ≥ 2 min | Business days 6–10 |
| Warm-up week 3 | 30 sends/day | ≥ 2 min | Business days 11–15 |
| Steady state | 40 sends/day | ≥ 90 sec | From business day 16 on |
| Hard ceiling | **50 sends/day per inbox** | ≥ 90 sec | Never exceed, regardless of reputation |

**Health triggers** (auto-throttle to previous stage):

| Signal | Window | Threshold | Action |
|--------|--------|-----------|--------|
| Bounce rate | trailing 500 sends | ≥ 2% | Halve daily cap; alert owner |
| Spam complaint rate | trailing 1000 sends | ≥ 0.1% | Halt sending; human review within 1 business day |
| Reply rate (any reply) | trailing 200 sends | < 2% | Pause cadence; re-evaluate targeting/copy before resuming |
| Blacklisting detected | any | 1 | Halt ALL sending, rotate sending IP/warmup new subdomain |

Checks run via `pipeline-review/` skill on its heartbeat; thresholds are hard-coded in `outreach-gate/thresholds.json`.

### 8.4 Throttling & Quiet Hours

- No sends on Saturdays, Sundays, or US federal holidays.
- Prospect-local 08:00–17:00 only. Agent schedules in advance; sending infrastructure respects the `Date:` header.
- Global pause on: 2nd week of December through Jan 2 (reply rates collapse, gets flagged as spam).
- No sends during major Southeast events that consume inboxes: e.g., first week of a declared hurricane landfall within target region (agent defers proactively; human flags the event).

### 8.5 Reputation Monitoring

`pipeline-review/` heartbeat (daily 08:00 ET) must report:

- Yesterday: sends, bounces, replies, unsubscribes, opens (if tracked).
- Rolling 7-day: bounce rate, reply rate, unsubscribe rate.
- Any blocklist hits (Spamhaus, SORBS, Barracuda) for sending domain and IP.
- Open rate should NOT be optimized for (pixel tracking hurts deliverability). Reply rate is the KPI.

---

## 9. Compliance (CAN-SPAM + Practical DNC)

### 9.1 CAN-SPAM Non-Negotiables (US)

Every cold email must carry:

1. **Accurate header info** — From, Reply-To, domain all match the actual sender. No forged routing.
2. **Non-deceptive subject** — subject line must reflect message content.
3. **Identification as commercial** — content must make clear it's a commercial outreach (implicit when a signature with role + company appears, but there must be no attempt to pass it off as a personal note from a friend).
4. **Physical postal address** — valid street address in the signature, not a PO box alone (PO box acceptable ONLY if registered with USPS).
5. **Clear opt-out** — plain-text instruction OR working unsubscribe link. Opt-out must function for ≥30 days after the message is sent.
6. **Honor opt-out within 10 business days** — we enforce real-time (< 10 min).
7. **No deceptive "RE:" or "FWD:"** — never prefix to fake a reply/forward chain.

### 9.2 DNC List Mechanics (summary — mechanics in §8.2)

- Stored at `workspace/crm/dnc.csv`.
- `G_DNC_CLEAR` blocks sends against it.
- Append-only. No delete, ever. Human may correct a mistaken entry by adding a contradicting `reason=manual_reinstatement` and marking original with a note — but the historical row stays.

### 9.3 Unsubscribe Mechanics

Three equivalent opt-out paths offered in the signature:

- Reply with "unsubscribe"
- Reply with "remove"
- Reply with "stop"

The reply parser (owned by reply-handler, routed through `crm-write/`) treats any of these tokens case-insensitively, at any position in the body, as an unsubscribe — no further interpretation required.

### 9.4 Jurisdictional Notes

This spec is US-only (Southeast). If target list ever expands to include Canadian (CASL) or EU (GDPR) recipients, this spec is insufficient — a separate compliance review is required. The agent MUST refuse to send outside the US without an explicit human sign-off.

- Signal: `contact_country` in leads.csv or inferred TLD. `G_COUNTRY_US_ONLY` gate (add to matrix when non-US is in scope) would block.

---

## 10. Example Emails (Tier-1 personalization, vertical-tailored)

### 10.1 Example 1 — Brewery (vertical: `brewery`), Touch 1

**Context fact** (Tier-1 operational): public brewing-industry listing shows 5k-case weekly volume at Durham production site; two tap-room locations (Raleigh, Durham).

```
Subject: GMA 48×40 for {ProspectCo}'s Durham site?

{FirstName} —

Saw {ProspectCo} is running ~5k cases/week out of Durham with the
Raleigh tap-room as a second pull. Two sites on separate delivery
windows usually means pallet turnover moves faster than one-site
breweries, and the returns/exchanges get messy.

We're a NC pallet supplier out of {OurCity}, running GMA 48×40
next-day into Durham and most of the Triangle. No minimum order,
and we do exchanges on damaged returns at pickup — most breweries
we work with cut their pallet spend 10–18% in the first quarter
just from that alone.

Worth a 10-minute call next week to see if the numbers work for
your Durham lane?

— Morgan Reyes
Sales, {OurCompany}
{OurStreet}, {OurCity}, NC {OurZip}
p: 919-555-0100
Reply "unsubscribe" to stop emails from me.
```

Gate pass trace (abbreviated):

```
G_SUBJ_LEN             PASS 40/60
G_SUBJ_SPECIFIC        PASS matched: {ProspectCo}, "Durham"
G_OPENER_HAS_FACT      PASS Tier-1 operational: "5k cases/week", "Durham", "Raleigh tap-room"
G_VP_CONCRETE          PASS matched: "GMA 48×40", "next-day", "10–18%"
G_CTA_COUNT            PASS count=1 ("Worth a 10-minute call?")
G_CTA_LOW_FRICTION     PASS class=15min_call
G_BODY_LENGTH          PASS 118/120
Overall: PASS
```

### 10.2 Example 2 — Furniture Manufacturer (vertical: `furniture`), Touch 1

**Context fact** (Tier-1 trigger): press release about a new DC opening in Mebane in Q3; company historically ships via I-40 to Southeastern retailers.

```
Subject: Mebane DC → pallet lane question

{FirstName} —

Caught the release about the Mebane DC coming online in Q3 —
congrats. Opening a new DC usually doubles pallet churn for
2–3 months while outbound lanes stabilize, and finding a
second source in-state is the cheapest insurance against that.

We run GMA 48×40 out of {OurCity}, NC — one-truck minimum,
same-week turnaround into Mebane. A handful of furniture
makers on I-40 use us as second source specifically to cover
DC-ramp months without committing full-volume contracts.

Worth a short call once Mebane is 30 days from open?

— Morgan Reyes
Sales, {OurCompany}
{OurStreet}, {OurCity}, NC {OurZip}
p: 919-555-0100
Reply "unsubscribe" to stop emails from me.
```

### 10.3 Example 3 — 3PL / Distribution (vertical: `3pl`), Touch 4 (proof-point touch)

**Context fact** (Tier-1 operational): 3PL runs cross-dock on I-85 between Charlotte and Greensboro; public job postings mention ISPM-15 export handling.

```
Subject: quick proof point — I-85 3PL, heat-treated

{FirstName} —

Following up once with a concrete comparable since {ProspectCo}
runs the Charlotte–Greensboro cross-dock and handles ISPM-15
export loads:

A 3PL on the same I-85 stretch switched their heat-treated
pallet supply to us last spring. 400 units/week, ISPM-15
certified, same-day pickup on damages. They kept their
incumbent for GMA 48×40 and moved only the export side — the
split cut audit headaches and trimmed ~12% off the export-
pallet line.

Not suggesting a full switch — just: does splitting the
ISPM-15 lane out make sense for you?

— Morgan Reyes
Sales, {OurCompany}
{OurStreet}, {OurCity}, NC {OurZip}
p: 919-555-0100
Reply "unsubscribe" to stop emails from me.
```

### 10.4 Example 4 — Break-up Email (Touch 8, any vertical)

```
Subject: closing the loop, {ProspectCo}

{FirstName} —

I've reached out a few times about pallets for {ProspectCo}
and haven't heard back, which usually means one of three
things: wrong timing, wrong contact, or not a fit.

I'll assume not a fit and stop here. If that's wrong, one-word
reply ("yes" or point me at the right person) and I'll pick it
back up — otherwise you won't hear from me again.

— Morgan Reyes
Sales, {OurCompany}
{OurStreet}, {OurCity}, NC {OurZip}
p: 919-555-0100
Reply "unsubscribe" to stop emails from me.
```

---

## 11. Metrics & Targets

### 11.1 Primary Targets (measured in `pipeline-review/` rollup)

| Metric | Calculation | Target (steady state) | Red-flag floor |
|--------|-------------|-----------------------|----------------|
| Reply rate | `replies / sends_with_no_bounce` | ≥ 7% | < 2% (halt) |
| Positive-reply rate | `(interested + not_now) / sends_with_no_bounce` | ≥ 2.5% | < 0.5% (copy/targeting review) |
| Meeting-booked rate | `meetings_booked / sends_with_no_bounce` | ≥ 1.0% | < 0.2% (review CTA/qualification) |
| Meeting-held rate | `meetings_held / meetings_booked` | ≥ 70% | < 50% (reconfirm practice) |
| Bounce rate | `bounces / sends` | < 1% | ≥ 2% (throttle) |
| Spam-complaint rate | `complaints / sends` | < 0.05% | ≥ 0.1% (halt) |
| Unsubscribe rate | `unsubs / sends` | < 0.5% | ≥ 1.5% (copy/targeting review) |
| DNC list growth | net adds/week | any | sudden spike = targeting or copy issue |

### 11.2 Cadence-Level Targets

| Metric | Calculation | Target |
|--------|-------------|--------|
| Touch 1 → Touch 2 reply rate | replies received after T1 but before T2 send | ≥ 3% |
| Cadence completion rate | leads reaching Touch 8 without response | acceptable 60–75% (too-low = over-eager classification; too-high = poor targeting) |
| Break-up → revive rate | replies to T8 that go to `interested` | ≥ 5% of T8 sends |
| Cross-channel lift (LinkedIn + email) | reply rate on leads where LinkedIn connected vs. email-only | LinkedIn-connected should be +2 pp or better |

### 11.3 Quality-Gate Metrics

| Metric | Calculation | Target |
|--------|-------------|--------|
| Gate pass rate | `PASS / (PASS + FAIL)` | ≥ 85% (lower = agent is producing drivel; higher = gate too loose) |
| Gate-blocked spam triggers | count of `G_SUBJ_NO_SPAM`/`G_VP_NO_SOUP` fails per week | trending down |
| Research-incomplete fails | count of `G_RESEARCH_COMPLETE` fails | trending down (indicates `lead-research/` getting better) |

### 11.4 Heartbeat Dashboard (daily output)

`pipeline-review/` heartbeat prints:

```
OUTBOUND DAILY ROLLUP — 2026-04-18
====================================
Sends (yesterday):           37 / 40 cap
Bounces:                      0  (rolling 7d: 0.3%)
Unsubs:                       1  (rolling 7d: 0.4%)
Replies:                      4  (rolling 7d reply rate: 8.2%)
  interested:                 1
  not_now:                    1
  wrong_person:               1
  decline:                    0
  OOO:                        1
Gate pass rate (7d):         89%
DNC adds (7d):                3
Next-7-day scheduled:        124 touches across 61 leads
```

---

## 12. Interfaces with Sibling Specs

| Sibling spec | What this spec consumes | What this spec emits |
|--------------|-------------------------|----------------------|
| `01-sales-methodology.md` | Qualification criteria, stage enum (`new`, `contacted`, `qualifying`, `demo`, `proposal`, `closed_won`, `closed_lost`), lost-reason enum | Stage transitions triggered by replies (§6) |
| `02-pallet-domain.md` | Product enum, objection bank (for Touch 4 proof-points, Touch 6 pattern interrupts), USDA/ISPM-15 constraints | Which objection classes showed up in replies (feedback loop) |
| `03-nc-gtm.md` | Vertical enum (snake_case), geographic hooks (lane names, port references, corridor names), ICP filters | Which verticals converted best (cohort feedback) |
| `05-agent-architecture.md` | Skill boundaries (`cold-email/`, `outreach-gate/`, `crm-write/`), CRM schema | Gate check as pre-commit hook on any email draft; banned-phrase registry location |

### 12.1 Referenced but Not Duplicated

- Objection responses — the Pallet Domain spec owns the canonical list. This spec uses them as proof-point content in Touch 4/6, via lookup.
- Vertical hook phrasing — the NC-GTM spec owns the canonical hook per vertical. This spec references `vertical_hook` tokens.
- Stage graph — the Methodology spec owns allowed transitions. This spec emits stage-change requests; `crm-write/` validates them against `stages.json`.

---

## 13. Open Questions

1. **Open-tracking**: use or disable? Leaning disable (pixel hurts deliverability, open rate is vanity). Decide with human owner before production.
2. **LinkedIn automation**: v1 assumes LinkedIn touches are human-executed by owner. If automated (Sales Navigator APIs), a separate compliance + rate-limit review is needed.
3. **A/B testing**: at 50–200 sends/week, statistical power for subject-line A/B is low. Propose: track cohort-level (vertical × season) instead of per-email A/B.
4. **Multi-contact accounts**: when a lead has 2+ buying-committee contacts, current cadence treats them independently. Should we sync so prospect A and prospect B don't get identical emails same week? Lean yes — stagger by ≥ 7 days and differentiate copy.
5. **Voicemail scripting**: Touch 5 VM is called out as ≤25s but template not specified. Should this spec include a VM script or is that Methodology's territory? Tentative: include a skeleton here, full script in Methodology spec.
6. **Reply-classifier confidence floor**: 0.7 is a placeholder. Calibrate after first 200 replies seen.
7. **Re-engage trigger events**: after 90-day cooldown, what counts as "new trigger" to reset? Proposed: a logged Tier-1 fact dated after the cooldown-start date. Needs owner sign-off.
8. **Shared sending inboxes vs. per-sender**: if owner scales beyond 1 sender, each inbox needs own warm-up. Capacity planning deferred to Agent Architecture spec.
9. **GDPR/CASL scope creep**: if Southeast list ever includes reseller contacts registered abroad, hard-stop required. Agent behavior: refuse non-US sends absent human override.
10. **Per-vertical cadence tuning**: should `brewery` get a different day-offset pattern than `3pl` (e.g., brewery owners read email after 18:00 often)? Propose: log vertical-segmented reply times for 60 days, then tune.

---

*End of spec — outbound execution. All rules herein are mechanically checkable and bound to gate IDs in §5.1. If a rule here cannot be expressed as a deterministic check, it does not belong in this spec — escalate to Methodology or Soul.*
