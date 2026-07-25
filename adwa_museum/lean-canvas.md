# Adwa — Lean Canvas

A one-page business model for the Adwa museum platform, following Ash Maurya's Lean Canvas.

**Product in one line:** a white-label SaaS that lets a museum publish its own AI-guided visitor tour without building an app, where every answer is grounded in what its curators wrote.

**Status:** blocks 1 through 4 are grounded in the existing specs ([design.md](design.md), [non-mobile-platform-scope.md](non-mobile-platform-scope.md), [backend-implementation-plan.md](backend-implementation-plan.md)). Blocks 5 through 9 are largely unvalidated and are marked as such. Section 11 lists what to test first.

---

## The canvas at a glance

```text
+---------------------+---------------------+---------------------+---------------------+---------------------+
| 1. PROBLEM          | 4. SOLUTION         | 3. UNIQUE VALUE     | 9. UNFAIR ADVANTAGE | 2. CUSTOMER         |
|                     |                     |    PROPOSITION      |                     |    SEGMENTS         |
| Custom guide apps   | White-label visitor | Your museum's own   | Anchor deployment   | National and        |
| and handset audio   | app + QR waypoints  | AI guide, live in a | at a nationally     | memorial museums    |
| guides cost more    |                     | week, grounded only | significant site    |                     |
| than a museum can   | Grounded AI chat    | in what your        |                     | Private, university |
| justify             | that refuses rather | curators wrote      | Ethiopian-context   | and site museums    |
|                     | than fabricates     |                     | grounding + local   |                     |
| Visitors' real      |                     | ---                 | provider ties       | Heritage sites and  |
| questions go        | Curator authoring   | HIGH-LEVEL CONCEPT  |                     | cultural centers    |
| unanswered          | that regenerates    |                     | Switching cost that |                     |
|                     | narration, no       | Shopify for the     | grows with every    | ---                 |
| Content goes stale  | re-recording        | guided museum tour  | authored room       | EARLY ADOPTERS      |
| because updating    |                     |                     |                     |                     |
| means re-recording  |                     |                     |                     | Newly built or      |
|                     +---------------------+                     +---------------------+ renovated memorial  |
| ---                 | 8. KEY METRICS      |                     | 5. CHANNELS         | museums with a      |
| EXISTING            |                     |                     |                     | ticket gate, a      |
| ALTERNATIVES        | Museum reaches      |                     | Direct institutional| digital mandate,    |
|                     | tour-ready          |                     | sales via the       | no app, and a       |
| Rented handsets     |                     |                     | anchor reference    | director who can    |
| One-off agency apps | Rooms completed and |                     |                     | authorize a pilot   |
| QR to a PDF         | questions asked     |                     | Heritage authority  | without procurement |
| Wall labels         | per visit           |                     | and ministry        |                     |
| Human docents       |                     |                     | endorsement         |                     |
| Nothing at all      | Grounded-answer     |                     |                     |                     |
|                     | rate vs. explicit   |                     | The visitor app as  |                     |
|                     | no-answer           |                     | its own showroom    |                     |
|                     |                     |                     |                     |                     |
|                     | Cost per answered   |                     | Sector events and   |                     |
|                     | question            |                     | ICOM networks       |                     |
+---------------------+---------------------+---------------------+---------------------+---------------------+
| 7. COST STRUCTURE                                     | 6. REVENUE STREAMS                                    |
|                                                       |                                                       |
| Per-answer LLM inference and TTS synthesis            | Tiered subscription: Free, Pro, Enterprise            |
| Object storage and audio egress                       | White-label branding as an Enterprise add-on          |
| Hosting: web service + managed Postgres               | Content onboarding as a one-time service fee          |
| Engineering and design payroll                        | Annual site licence for government-procured buyers    |
| Content onboarding labour per new museum              |                                                       |
| Long institutional sales cycles                       | Billing enforcement is out of scope in v1, so revenue |
|                                                       | is invoiced manually today                            |
+-------------------------------------------------------+-------------------------------------------------------+
```

---

## 1. Problem

### Top three problems

1. **A guided experience costs more than a museum can justify.** Building a custom mobile app means hiring an agency, and the result is a one-off that nobody maintains. Renting handset audio guides means hardware that gets lost, breaks, needs charging, needs sanitising, and needs a staff member stationed to hand them out and collect them.

2. **Visitors' actual questions go unanswered.** A wall label and a recorded track answer only the questions the curator anticipated. Everything else needs a docent, and a docent cannot be in every room. Most visitors leave with the question they actually had still unasked.

3. **Content decays because updating it is expensive.** Changing an audio guide means booking a voice artist, re-recording, re-mastering, and re-deploying to hardware. So museums under-invest, the tour drifts out of date, and the gap between the scholarship and the visitor experience widens every year.

### Existing alternatives

| Alternative | Why it falls short |
|---|---|
| Rented handset audio guides | Hardware cost, logistics, staffing, fixed content, no interaction |
| Custom agency-built museum app | High upfront cost, no maintenance path, typically abandoned within two years |
| QR code linking to a PDF or web page | No narration, no interaction, poor on a phone in a dim gallery |
| Printed wall labels | Fixed, space-constrained, answers nothing unanticipated |
| Human docent tours | Excellent but does not scale, and is unavailable to walk-in visitors |
| Nothing at all | The realistic default for most regional and national museums in the target market |

---

## 2. Customer Segments

Separate the buyer from the users, because they are three different people with three different definitions of success.

| Role | Who | What success means to them |
|---|---|---|
| Buyer | Museum director, operations lead, or a ministry cultural authority | The museum looks modern, the spend is defensible, no IT hiring |
| Content user | Curator or head of collections | Their scholarship reaches visitors accurately, and they can change it themselves |
| End user | The visitor | They understood what they were looking at and felt guided |

### Segments

- National and memorial museums, typically government-affiliated
- Private and university museums and galleries
- Heritage sites, cultural centres, and interpretive sites without a fixed collection

### Early adopters

The narrowest description of who buys first: a **newly built or recently renovated memorial museum** that already has a ticket gate, carries an institutional mandate to feel contemporary, has no in-house app and no plan to build one, and has a single director or head curator who can authorise a pilot without going through a full procurement cycle.

That last clause matters more than the rest. Institutional procurement can outlast a startup's runway, so the first customers must be the ones where one person can say yes.

---

## 3. Unique Value Proposition

> **Your museum's own AI guide, live in a week — and it only says what your curators wrote.**

**High-level concept:** Shopify for the guided museum tour.

The defensible half of this is the second clause, not the first. Anyone can point a general-purpose chatbot at a museum. The product commitment here is **grounded fidelity**: answers derive only from curator-authored room and item content, matched item references are validated against the room's real items, and on upstream failure the system returns an explicit failure rather than a fabricated fallback.

For a memorial museum interpreting a contested national history, a hallucinated fact is not a bug, it is a reputational incident and potentially a political one. The willingness to say "I don't have that" is the feature a serious institution is actually buying.

---

## 4. Solution

Each solution maps to one problem above. Nothing else belongs in this block.

| Problem | Solution | Status |
|---|---|---|
| Custom apps and handsets cost too much | White-label visitor app with QR waypoint scanning; the museum ships zero engineering and buys zero hardware | Mobile app in build |
| Visitors' questions go unanswered | Grounded AI chat plus generated narration, so a visitor can ask anything and hear a spoken answer sourced from the museum's own content | Backend contract defined |
| Content decays | A curator-facing admin web app where editing a room's text regenerates its narration, with no re-recording and no redeployment | Spec complete, build phased |

Supporting the three above: a multi-tenant backend where museum data is isolated by server-resolved scope, and a provider control plane for operating the fleet.

---

## 5. Channels

Unvalidated. These are hypotheses about how a first paying museum is reached, ordered by plausibility.

- **The anchor reference.** A live, nationally visible deployment is the demo. Sector peers visit it, and a walkthrough on site outperforms any deck.
- **Direct institutional sales** through warm introductions from the anchor institution's leadership.
- **Heritage authority and ministry endorsement**, which in this market can convert a sales cycle into a mandate but is slow and relationship-dependent.
- **The visitor app as its own showroom.** Museum staff visit other museums. A well-executed guided tour markets itself to exactly the right audience.
- **Sector events and professional networks**, including ICOM national committees and heritage conferences.
- **Tour operators and school-trip organisers**, who influence which sites get visited and may pressure venues toward a digital offer.

Not a channel: paid acquisition, content marketing, or self-serve signup. This is a small, named, reachable market. Every prospect can be listed on one page, which means outbound beats inbound.

---

## 6. Revenue Streams

Documented tiers from the design spec:

| Tier | Museums | Rooms | Items | AI chat | Analytics |
|---|---|---|---|---|---|
| Free | 1 | 5 | 20 | 100 questions/month | Basic |
| Pro | 3 | Unlimited | Unlimited | Unlimited | Full |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Full plus export |

White-label branding is an Enterprise add-on.

Additional streams worth modelling:

- **Content onboarding fee**, one-time per museum. Digitising a collection into rooms and items is real labour, and charging for it both funds the work and qualifies the buyer.
- **Annual site licence** as an alternative to per-seat subscription, because government procurement is usually structured for annual licences rather than recurring SaaS billing.

Two honest gaps:

1. Billing enforcement is explicitly out of scope for v1. Tier limits are not enforced in code, so revenue depends on manual invoicing and trust until that ships.
2. Free tier limits are asserted, not derived. Nobody has yet checked whether five rooms is a useful trial or a useless one.

---

## 7. Cost Structure

### Variable, scaling with visitor traffic

- LLM inference per answered question
- Text-to-speech synthesis per generated narration or answer
- Object storage and egress for generated audio

Three mitigations are already designed in: a 24-hour answer cache for repeated questions, content-addressed TTS deduplication so identical text, voice, and model tuples synthesise once, and input and output caps. Spend is attributed per tenant through structured usage logs, which is what makes unit economics knowable per museum rather than only in aggregate.

### Variable, scaling with tenants

- **Content onboarding labour.** This is the cost most likely to be underestimated. Getting a museum's scholarship into structured rooms and items is human work, and it is the true cost of acquiring a tenant.
- Support and training for curators during their first authoring cycle.

### Fixed

- Hosting: web service plus managed Postgres
- Engineering and design payroll across mobile, admin web, and backend
- Long institutional sales cycles, which are a payroll cost in disguise

---

## 8. Key Metrics

One activation metric, then leading indicators. Avoid vanity counts.

### The one that matters

**Museums reaching tour-ready**, defined as every room having narration and at least three items — the point where the readiness spine in the admin dashboard is fully filled. A tenant that never reaches tour-ready produces no visitor value and will not renew, regardless of what they signed.

### Leading indicators

| Metric | Why it is worth tracking |
|---|---|
| Days from tenant creation to first published room | Measures onboarding friction, the biggest churn risk |
| Rooms completed per visit | Whether the guiding loop actually holds a visitor through the tour |
| Questions asked per visit | Whether the AI guide is discovered and trusted, not just present |
| Grounded-answer rate versus explicit no-answer | The fidelity promise, measured; a rising no-answer rate means content gaps |
| Size of the unanswered and flagged prompt queue | Directly tells curators what content to write next |
| Cache hit rate and cost per answered question | Whether unit economics improve or degrade with scale |
| Museums still publishing changes at day 90 | Real retention; a museum that stopped editing has stopped caring |

Note that most of these need visitor telemetry that the backend does not yet store. Until those tables exist, these are targets rather than measurements.

---

## 9. Unfair Advantage

Most things founders list here are not advantages. Applying the test — can a well-funded competitor copy this within a year — leaves three candidates.

**A nationally significant anchor deployment.** A reference installation at a site of real national importance is not something a competitor can buy or rebuild. It confers credibility with exactly the institutional buyers who matter, and it is a relationship, not a feature.

**Local context and provider relationships.** Grounding quality for Ethiopian historical content, working with a regional model provider, and understanding how cultural institutions in this market actually procure software are all advantages that a foreign entrant would need years to acquire.

**Compounding authored content.** Every room and item a curator writes increases the cost of leaving. The corpus belongs to the museum, but the structure, the grounding, and the generated narration live in the platform. Switching cost grows monotonically with use.

**Explicitly not advantages:** the technology stack, access to LLM and TTS APIs, the admin dashboard's design quality, or being first. All four are replicable by a funded competitor within months.

---

## 10. Riskiest Assumptions

Ordered by how much damage being wrong causes.

1. **Museums will pay recurring software fees at all.** Many operate on grant and government budgets structured for capital purchases, not subscriptions. If true, the model has to shift toward annual licence plus onboarding fee, which changes cash flow, sales motion, and everything downstream in this canvas.
2. **Curators will author and maintain content themselves.** The entire cost structure assumes onboarding labour is one-time. If curators will not or cannot keep content current, the platform becomes a services business with software attached.
3. **Visitors will scan a QR code and use a phone in the gallery.** The guiding loop depends on it. If scan rates are low, the AI guide is never reached and no other metric matters.
4. **Grounded refusal is a selling point, not a defect.** The bet is that institutions value "I don't have that" over a confident guess. A buyer who instead perceives the guide as limited would invert the UVP.
5. **The free tier converts.** Five rooms and twenty items may be enough to run a real pilot without ever paying.

---

## 11. What to Validate First

The cheapest tests for the two riskiest assumptions, before more is built.

- **Assumption 1, budget structure.** Ask five museum directors how they bought their last piece of software: what budget line, what approval path, capital or operating. This is a set of conversations, not a build.
- **Assumption 2, curator maintenance.** With the anchor museum, have a curator author one full room in the admin web unaided and time it. Then check, thirty days later, whether anything was edited without being prompted.
- **Assumption 3, scan behaviour.** Measurable at the anchor site with printed QR codes and a counter, before the app is finished.
- **Assumption 4, refusal as a feature.** Show two curators the same question answered two ways, one grounded refusal and one plausible guess, and ask which they would want in their gallery.

---

## Revision notes

This canvas is a snapshot of current thinking and should be revised whenever an assumption is tested. Blocks 5, 6, and 9 carry the least evidence today. When a block changes, note what was learned that caused the change, since the history of revisions is more useful than any single version.
