---
id: tmpl_brewery_t1_cold_intro
vertical: vertical_brewery
touch: 1
scenario: cold_intro
pallet_focus: [gma_48x40_new, gma_48x40_recycled, heat_treated_ispm15]
tone: consultative
subject_pattern: "{company} pallets — CHEP audit season?"
body_words_target: 115
required_vars: [company, city, contact_first_name]
optional_vars: [recent_trigger, current_supplier]
teaching_insight: "CHEP/PECO audit fees land hardest in brand-facing lanes; stenciled custom is the exchange-pool alternative"
---

Subject: {{company}} pallets — CHEP audit season?

Hi {{contact_first_name}},

Curious how {{company}} is running pallets into the taproom and distributor loads{{#if recent_trigger}} — noticed {{recent_trigger}}{{/if}}. Most NC breweries I talk to are on CHEP or PECO for the main packaging runs, and the audit fees compound fastest on brand-facing deliveries.

One thing we've helped a few Asheville-area breweries with: stenciled custom 48×40 for the branded loads (keeps the brewery logo clean on taproom drops) plus exchange-pool GMA for everything else. Lowers total pool exposure without ripping out CHEP.

Worth 10 minutes on how your mix looks{{#if current_supplier}} alongside {{current_supplier}}{{/if}}?

— {{sender_signature}}
