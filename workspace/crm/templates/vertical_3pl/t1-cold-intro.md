---
id: tmpl_3pl_t1_cold_intro
vertical: vertical_3pl
touch: 1
scenario: cold_intro
pallet_focus: [gma_48x40_recycled, gma_48x40_new]
tone: consultative
subject_pattern: "{city} DC pallets"
body_words_target: 100
required_vars: [company, city, contact_first_name]
optional_vars: [est_volume_weekly, current_supplier, recent_trigger]
teaching_insight: "Recycled-to-new GMA ratio flips when peak volume hits — most 3PLs don't forecast it and get caught on Mondays"
---

Subject: {{city}} DC pallets

Hi {{contact_first_name}},

Noticed {{company}}'s {{city}} operation's been ramping{{#if recent_trigger}} — {{recent_trigger}}{{/if}}. Quick question: who's servicing pallets for that site, and are you running mostly recycled GMA inbound or a split with new?

Asking because the recycled-to-new ratio flips when 3PLs hit peak volume — most don't forecast it, and Monday mornings run short. We dedicate a local line for 3PLs doing {{est_volume_weekly | default:"500+"}}/week in the Piedmont corridor and pre-stage before spikes.

Worth 10 minutes to compare notes on your current coverage?

— {{sender_signature}}
