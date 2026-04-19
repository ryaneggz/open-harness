---
id: tmpl_brewery_t2_value_prop
vertical: vertical_brewery
touch: 2
scenario: value_prop
pallet_focus: [gma_48x40_new, heat_treated_ispm15]
tone: consultative
subject_pattern: "Re: {company} pallets"
body_words_target: 80
required_vars: [company, contact_first_name]
optional_vars: [export_exposure]
teaching_insight: "Seasonal brewery spikes (releases, festivals, High Point Market weekends) are where pool systems fail — surge capacity is the opening"
---

Subject: Re: {{company}} pallets

{{contact_first_name}} — follow-up data point.

Breweries running CHEP hit their first real spike around summer festival season or a seasonal release. Pool audit adjustments + availability squeeze usually cost 10-15% more than the baseline contract math suggested.

We stage surge inventory inside the 150-mile Piedmont loop. You keep CHEP for the steady state; call us for the spike weeks. {{#if export_exposure}}Also worth a word on ISPM-15 if you're shipping north.{{/if}}

Twenty minutes this week?

— {{sender_signature}}
