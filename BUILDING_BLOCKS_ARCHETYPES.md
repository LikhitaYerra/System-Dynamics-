# Reusable Building Blocks (Archetypes)

Use these to **start** each model quickly. Pick 1–2 per Model Brief and rename stocks/flows to fit the strategic question. No need to invent structure from scratch.

---

## 1. Capacity–demand

**When to use:** Delivery timelines, resource planning, backlog, “can we fulfill orders?”

| Concept | SD element | Example names |
|---------|------------|----------------|
| Work to do | Stock | Backlog, Order book |
| Capacity | Stock | Capacity, Team size, Production lines |
| New demand | Inflow | Orders, Incoming requests |
| Completion | Outflow | Deliveries, Completed units |
| Capacity change | Flow | Hiring, Investment, Expansion |

**Typical loops:**  
- Balancing: Backlog ↑ → pressure to deliver → deliveries ↑ → Backlog ↓  
- Reinforcing: Revenue ↑ → investment → Capacity ↑ → Deliveries ↑ → Revenue ↑  

**AeroDyn example:** Integration capacity vs contract backlog; R&D capacity vs pipeline of programs.

---

## 2. Adoption / diffusion

**When to use:** Rollout of new AI capabilities, platforms, or product lines; “how fast will X be adopted?”

| Concept | SD element | Example names |
|---------|------------|----------------|
| Adopters / systems in use | Stock | Systems deployed, Users, Platforms in field |
| Adoption | Inflow | New deployments, Adoption rate |
| Retirement | Outflow | Obsolescence, Decommissioning |
| Word-of-mouth / saturation | Feedback | Adoption rate depends on remaining “non-adopters” or market size |

**Typical loops:**  
- S-shaped growth: Adoption ↑ → Adopters ↑ → remaining potential ↓ → Adoption ↓ (saturation).

**AeroDyn example:** Adoption of new targeting or decision-support modules across platforms; diffusion of non-lethal vs lethal capability mix.

---

## 3. Reputation / trust

**When to use:** Public perception, ministerial or stakeholder trust, ethical scrutiny.

| Concept | SD element | Example names |
|---------|------------|----------------|
| Perceived trust / reputation | Stock | Reputation, Trust, License to operate |
| Positive events | Inflow | Successful deliveries, Transparency, Compliance |
| Negative events / decay | Outflow | Incidents, Scandals, Time decay |
| Media / oversight | Auxiliary | Coverage, Oversight intensity |

**Typical loops:**  
- Balancing: Reputation ↓ → more transparency → Positive events ↑ → Reputation ↑  
- Reinforcing (vicious): Incidents → Reputation ↓ → less access → more pressure → Incidents risk ↑  

**AeroDyn example:** Trust with ministries; public perception of lethal vs non-lethal focus; “ethical AI” narrative.

---

## 4. Pipeline (multi-stage)

**When to use:** R&D → integration → certification → delivery; regulatory milestones; stage-gate processes.

| Concept | SD element | Example names |
|---------|------------|----------------|
| Stage 1 | Stock | R&D pipeline, Concepts |
| Stage 2 | Stock | Integration, Prototypes |
| Stage 3 | Stock | Certification queue, In test |
| Stage 4 | Stock | Ready to deliver, Contracted |
| Transitions | Flows | Completion rate at each stage (can depend on capacity, regulation) |

**Typical loops:**  
- Delays in one stage → backlog → pressure → reallocation or delay in previous stage.  
- Certification delay → longer time in Stage 3 → later revenue.

**AeroDyn example:** R&D → integration → military certification → delivery; effect of export or ethical reviews on stage durations.

---

## 5. Resource competition

**When to use:** Shared R&D or capacity; allocation between business lines, lethal vs non-lethal, or programs.

| Concept | SD element | Example names |
|---------|------------|----------------|
| Shared resource | Stock | R&D budget, Engineering capacity, Key talent |
| Project A demand | Flow | Allocation to A, A’s draw |
| Project B demand | Flow | Allocation to B, B’s draw |
| Policy / priority | Auxiliary | % to A vs B, Strategic weight |

**Typical loops:**  
- More allocation to A → A progresses → A’s perceived value ↑ → more allocation to A (reinforcing).  
- Fixed resource → more to A → less to B → B lags → rebalancing (balancing).

**AeroDyn example:** Allocation between lethal and non-lethal programs; between domestic and export; between legacy and AI-enabled systems.

---

## How to use in practice

1. **From the Model Brief**, identify the main “story” (e.g. “delivery timelines”, “trust with ministries”, “pipeline delays”).
2. **Select 1–2 archetypes** that match (e.g. Capacity–demand + Pipeline).
3. **Rename** stocks and flows to the client’s language (e.g. “Backlog” → “Contract backlog”, “Capacity” → “Integration capacity”).
4. **Add only the links** needed for the strategic question; avoid adding subsystems that are “out of scope” in the Brief.
5. **Calibrate** with sponsor-provided or public data; document assumptions in the model passport.

This keeps models small, comparable, and fast to build.
