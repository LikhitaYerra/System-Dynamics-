# Script: How to Explain the Schema and Flows (AeroDyn Lethal AI)

Use this when presenting the **Schema view** or walking someone through the model structure. It covers the schema and flows completely and in a logical order.

---

## 1. Opening (what this model is)

*"This is the **AeroDyn Lethal AI** model. It answers one strategic question:*

***What happens to our long-term business if we heavily invest in lethal AI, and how do public opinion, regulation, and contracts interact over 5–10 years?***

*We didn’t model ‘yes or no’—we modelled **under what conditions** investing helps or hurts. So the schema is built around **five accumulations** (stocks) and **eleven flows** that connect them. Everything you see is explicit: every stock, every flow, every parameter. That’s what we mean by transparent and auditable."*

---

## 2. The five stocks (accumulations)

*"There are **five stocks**—things that accumulate over time, on a 0–100 scale."*

| Stock | Name | What it means |
|-------|------|----------------|
| **LethalAIVis** | Lethal AI visibility | How much the market and public see us as invested in lethal AI. Grows with investment, can decay if we diversify. |
| **Backlash** | Public / ethical backlash | Public and ethical pushback. Reacts to visibility; fades with the media cycle. |
| **Regulation** | Regulatory pressure | Export controls, certification, oversight. Rises with backlash; eases with the policy cycle. |
| **Reputation** | Reputation (license to operate) | Trust and license to operate. Eroded by backlash; recovered by transparency and compliance. |
| **Contracts** | Contract pipeline (value at stake) | Value at stake in the contract pipeline. Fed by reputation and constrained by regulation; drained by delivery. |

*"All of these are **stocks**: they accumulate. The **flows** are what increase or decrease them. Every flow has a **from** and a **to**—either a stock or the outside world (source/sink)."*

---

## 3. The ten flows (one by one)

*"Here are the **eleven flows**, in causal order."*

### 3.1 Visibility

1. **Investment → visibility**  
   - **From:** source (outside) **→ To:** Lethal AI visibility  
   - **Idea:** More investment in lethal AI increases how visible we are in that space.  
   - **Loop:** Reinforcing (R1 — part of the backlash spiral).  
   - **Delay:** 6–12 months.

2. **Visibility decay (diversification)**  
   - **From:** Lethal AI visibility **→ To:** sink  
   - **Idea:** If we diversify or reduce emphasis, visibility decays.  
   - **Loop:** Balancing (B1 — dampens the spiral).  
   - **Delay:** 12–24 months.

### 3.2 Backlash

3. **Visibility → backlash**  
   - **From:** Lethal AI visibility **→ To:** Backlash  
   - **Idea:** More visibility drives more public/ethical backlash (with a saturation term so it doesn’t blow up infinitely).  
   - **Loop:** Reinforcing (R1).  
   - **Delay:** 3–6 months.

4. **Backlash decay (media cycle)**  
   - **From:** Backlash **→ To:** sink  
   - **Idea:** Attention fades; backlash decays over time.  
   - **Loop:** Balancing (B2).  
   - **Delay:** 6–12 months.

### 3.3 Regulation

5. **Backlash → regulation**  
   - **From:** Backlash **→ To:** Regulation  
   - **Idea:** Stronger backlash pushes regulation up (again with a ceiling).  
   - **Loop:** Reinforcing (R1).  
   - **Delay:** 12–24 months.

6. **Regulation decay (policy cycle)**  
   - **From:** Regulation **→ To:** sink  
   - **Idea:** Policy cycle turns; regulatory pressure can ease.  
   - **Loop:** Balancing (B3).  
   - **Delay:** 24+ months.

### 3.4 Reputation

7. **Backlash erodes reputation**  
   - **From:** Reputation **→ To:** sink (erosion)  
   - **Idea:** More backlash erodes reputation—our license to operate.  
   - **Loop:** Reinforcing (R2 — vicious cycle).  
   - **Delay:** 3–6 months.

8. **Reputation recovery (transparency, compliance)**  
   - **From:** source **→ To:** Reputation  
   - **Idea:** Transparency, compliance, and public education bring reputation back toward a target.  
   - **Loop:** Balancing (B4).  
   - **Delay:** 12–24 months.

### 3.5 Contracts

9. **Reputation → contract pipeline**  
   - **From:** source **→ To:** Contracts  
   - **Idea:** Better reputation feeds the contract pipeline; the rate is scaled by **AI performance sufficiency** (0–1). So we can run a ‘lower AI performance’ scenario by turning that down.  
   - **Loop:** Reinforcing (R3 — success breeds success).  
   - **Delay:** 6–12 months.

10. **Regulation constrains contracts**  
    - **From:** Contracts **→ To:** sink (constraint)  
    - **Idea:** Higher regulation reduces or blocks contract pipeline (value at stake).  
    - **Loop:** Reinforcing (R1 — part of the spiral).  
    - **Delay:** 12–24 months.

11. **Contracts fulfilled (delivery)**  
    - **From:** Contracts **→ To:** sink  
    - **Idea:** Delivery drains the pipeline; normal business flow.  
    - **Loop:** Balancing (B5).  
    - **Delay:** 24+ months.

*"So we have **inflows** and **outflows** for each stock. For example: Lethal AI visibility goes up with investment and down with visibility decay. Backlash goes up with visibility and down with media-cycle decay. The equations in the sidebar are exactly these flows—every symbol is a stock or a parameter."*

---

## 4. Reinforcing (R) and balancing (B) loops

*"The diagram and the loop cards show **reinforcing** and **balancing** loops."*

- **Reinforcing (R):** Amplify. Same direction of effect keeps feeding back (e.g. visibility → backlash → regulation → contracts down → more pressure).
- **Balancing (B):** Dampen or correct. They limit growth or bring things back (e.g. visibility decay, backlash decay, reputation recovery).

*"We have **four reinforcing loops** and **five balancing loops**."*

| Id | Name | Type | Story |
|----|------|------|--------|
| **R1** | Backlash spiral | R | Investment → visibility → backlash → regulation → contracts constrained. Reinforcing: the spiral can amplify. |
| **R2** | Backlash erodes reputation | R | More backlash → reputation falls → less license to operate. Vicious cycle. |
| **R3** | Reputation builds contracts | R | Better reputation → more contract pipeline (scaled by AI performance). Success breeds success. |
| **B1** | Diversification (visibility decay) | B | Diversify → visibility decays → dampens the backlash spiral. |
| **B2** | Media cycle (backlash decay) | B | Attention fades → backlash decays → limits sustained pressure. |
| **B3** | Policy cycle (regulation decay) | B | Policy cycle → regulation eases → limits permanent constraint. |
| **B4** | Reputation recovery | B | Transparency/compliance → reputation recovers → counters backlash erosion. |
| **B5** | Contract fulfillment | B | Delivery → pipeline drains → normal business flow. |

*"So the **causal story** is: visibility drives backlash; backlash drives regulation and erodes reputation; reputation feeds contracts, and regulation constrains them. The balancing loops are the levers—diversification, media cycle, policy cycle, recovery, and delivery."*

---

## 5. Parameters (brief)

*"Every flow rate uses **parameters**—numbers we can change for scenarios. Key ones:"*

- **invest_rate** — how fast investment turns into visibility  
- **decay_vis, decay_back, decay_reg** — visibility, backlash, and regulation decay  
- **k_vis_back, k_back_reg, k_back_rep** — strengths of visibility→backlash, backlash→regulation, backlash→reputation  
- **recovery_rate** — reputation recovery speed  
- **k_rep_cont, k_reg_cont, base_contracts, fulfill_rate** — contract pipeline behaviour  
- **ai_performance_sufficient** — 0–1; scales how much reputation turns into contracts (used in the ‘Lower AI performance’ scenario)

*"Scenario presets (Base, High invest, Diversification, Stricter reg, Lower AI performance) change these parameters. The schema is the same; we only change the knobs."*

---

## 6. Clusters (for the diagram)

*"The schema also has **clusters**—groups of stocks for the diagram:"*

- **C1 — Visibility & backlash:** LethalAIVis, Backlash  
- **C2 — Regulatory pressure:** Regulation  
- **C3 — Reputation & contracts:** Reputation, Contracts  

*"So when you look at the Schema view—SVG, React Flow, Cluster, or Mermaid—you’re seeing the same stocks and flows; the clusters just group them for readability."*

---

## 7. How to say it in the app (demo flow)

*"In the app:*

1. *Pick **AeroDyn — Lethal AI** from the model selector.*  
2. *In **Schema view**, you see the diagram (toggle SVG / React Flow / Cluster / Mermaid if you want).*  
3. *On the **left**, the **variables and equations** list stocks, parameters, and flows—that’s the full schema.*  
4. *Use **‘Show explanation’** to get the AI plain-language summary of the model (name, question, stocks, flows, R/B loops, causal story, transparency).*  
5. *The **loop cards** (Show explanation / loop section) spell out each R and B loop with delays.*  
6. *In **Graph view**, we run scenarios; the same schema drives the simulation—the chart and ‘So what?’ interpretation trace back to these flows and parameters."*

---

## 8. One-paragraph summary (if you need 30 seconds)

*"This schema has five stocks: Lethal AI visibility, Backlash, Regulation, Reputation, and Contract pipeline. Eleven flows connect them: investment builds visibility; visibility drives backlash; backlash pushes regulation and erodes reputation; reputation feeds contracts; regulation constrains them; and diversification, media cycle, policy cycle, recovery, and delivery provide balancing effects. Four reinforcing loops and five balancing loops tell the causal story. Everything is explicit—stocks, flows, parameters—so the model is transparent and auditable, and we can run scenarios by changing parameters without changing the structure."*

---

*End of script.*
