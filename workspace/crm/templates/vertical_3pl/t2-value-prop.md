---
id: tmpl_3pl_t2_value_prop
vertical: vertical_3pl
touch: 2
scenario: value_prop
pallet_focus: [gma_48x40_recycled, gma_48x40_new, block_pallet]
tone: consultative
subject_pattern: "Re: {city} DC pallets"
body_words_target: 80
required_vars: [company, city, contact_first_name]
optional_vars: [primary_lane]
teaching_insight: "A 53' dry van holds ~500 GMA stacked standard but only 400-440 block or heat-treated — truck-fill math favors spec-matching, not cheapest unit price"
---

Subject: Re: {{city}} DC pallets

{{contact_first_name}} — one data point in case useful.

A 53' holds ~500 GMA 48×40 stacked standard but drops to 400-440 on block or heat-treated stacks. Most 3PLs quote their pallet supplier on unit price and eat the freight delta quietly — it's usually $0.50-$1/pallet landed.

On a 1,000/week site, that's $40k-$50k a year in quiet margin leak.

Open to a 15-minute look at how your {{primary_lane | default:"inbound"}} lane stacks up?

— {{sender_signature}}
