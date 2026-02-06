"""
AeroDyn Systems — Pipeline & Ministerial Trust.
System dynamics: R&D → Integration → Certification → Delivery; Ministerial trust.
Builds on Pipeline + Reputation/trust archetypes. Scipy + matplotlib.
"""

import numpy as np
from scipy.integrate import solve_ivp
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# --- Parameters (base case) ---
MONTHS = 60  # 5 years
# Pipeline rates (fraction per month)
k_rd = 0.08       # R&D completion → Integration
k_int = 0.12      # Integration completion → Certification
k_cert_base = 0.15  # Certification → Delivery (base, before oversight)
# Oversight: 1 = normal; >1 = slower certification (political/ethical scrutiny)
oversight = 1.0
# New programs entering R&D (per month)
new_programs = 1.2
# Trust
trust_gain_per_delivery = 1.5    # trust points per delivery
non_lethal_bonus = 0.4           # extra trust gain per delivery if non-lethal (fraction)
fraction_non_lethal = 0.3        # share of portfolio that is non-lethal (0–1)
trust_decay = 0.02               # monthly decay of trust (no reinforcing events)
trust_floor = 20.0               # minimum trust

# Initial state: [R&D, Integration, Cert_queue, Delivered, Trust]
R0, I0, C0, D0, T0 = 20.0, 5.0, 3.0, 0.0, 60.0
y0 = [R0, I0, C0, D0, T0]


def aerodyn(t, y, oversight_factor=1.0, frac_nl=0.3):
    """ODEs: y = [R&D, Integration, Cert_queue, Delivered, Trust]."""
    R, I, C, D, T = y
    # Flows
    rd_completion = k_rd * R
    integration_completion = k_int * I
    cert_rate = (k_cert_base / oversight_factor) * C
    # Trust gain: deliveries boost trust; non-lethal share gives bonus
    trust_gain = trust_gain_per_delivery * cert_rate * (1 + non_lethal_bonus * frac_nl)
    trust_loss = trust_decay * max(T - trust_floor, 0)
    # Derivatives
    dR = new_programs - rd_completion
    dI = rd_completion - integration_completion
    dC = integration_completion - cert_rate
    dD = cert_rate
    dT = trust_gain - trust_loss
    return [dR, dI, dC, dD, dT]


def run_scenario(oversight_factor=1.0, frac_nl=0.3, label="Base"):
    """Run one scenario; return t, R, I, C, D, T."""
    def odefun(t, y):
        return aerodyn(t, y, oversight_factor=oversight_factor, frac_nl=frac_nl)
    sol = solve_ivp(odefun, [0, MONTHS], y0, dense_output=True, max_step=1.0)
    t = np.linspace(0, MONTHS, 200)
    R, I, C, D, T = sol.sol(t)
    return t, R, I, C, D, T, label


# --- Run scenarios ---
scenarios = [
    (1.0, 0.3, "Base"),
    (1.6, 0.3, "High oversight (slower cert)"),
    (1.0, 0.6, "Higher non-lethal share"),
    (1.4, 0.5, "High oversight + more non-lethal"),
]
results = [run_scenario(o, f, l) for o, f, l in scenarios]

# --- Time-series plot ---
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
t_base, R_base, I_base, C_base, D_base, T_base, _ = results[0]

# Pipeline stocks (R, I, C) — base only for clarity; or overlay scenarios
ax = axes[0, 0]
for t, R, I, C, D, T, label in results:
    ax.plot(t, R, alpha=0.8, label=f"R&D ({label})")
ax.set_ylabel("Programs")
ax.set_title("R&D pipeline")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

ax = axes[0, 1]
for t, R, I, C, D, T, label in results:
    ax.plot(t, D, alpha=0.8, label=label)
ax.set_ylabel("Cumulative")
ax.set_title("Delivered (cumulative)")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

ax = axes[1, 0]
for t, R, I, C, D, T, label in results:
    ax.plot(t, C, alpha=0.8, label=label)
ax.set_xlabel("Month")
ax.set_ylabel("Programs")
ax.set_title("Certification queue")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

ax = axes[1, 1]
for t, R, I, C, D, T, label in results:
    ax.plot(t, T, alpha=0.8, label=label)
ax.set_xlabel("Month")
ax.set_ylabel("Trust (0–100)")
ax.set_title("Ministerial trust")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

fig.suptitle("AeroDyn Systems — Pipeline & Ministerial Trust (5-year scenarios)", fontsize=11)
plt.tight_layout()
plt.savefig("aerodyn_scenarios.png", dpi=120)
print("Saved aerodyn_scenarios.png")

# --- Stock-flow diagram (exact relationships) ---
fig2, ax2 = plt.subplots(figsize=(12, 6))
ax2.set_xlim(0, 12)
ax2.set_ylim(0, 6)
ax2.set_aspect("equal")
ax2.axis("off")


def stock_box(ax, x, y, w, h, label, color="lightblue"):
    box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02",
                         facecolor=color, edgecolor="black", linewidth=1.5)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, label, ha="center", va="center", fontsize=10, fontweight="bold")


# Stocks: R&D, Integration, Cert, Delivered, Trust
w, h = 1.3, 0.75
stock_box(ax2, 0.8, 2.8, w, h, "R&D", "lavender")
stock_box(ax2, 3.2, 2.8, w, h, "Integration", "lightyellow")
stock_box(ax2, 5.6, 2.8, w, h, "Cert\nqueue", "moccasin")
stock_box(ax2, 8.0, 2.8, w, h, "Delivered", "lightgreen")
stock_box(ax2, 9.8, 1.0, 1.5, 0.7, "Trust", "mistyrose")

# Flows
def draw_flow(ax, xy1, xy2, mid_label, eq_label, y_offset=0):
    ax.annotate("", xy=xy2, xytext=xy1,
                arrowprops=dict(arrowstyle="->", lw=1.8, color="black"))
    mid = ((xy1[0] + xy2[0])/2, (xy1[1] + xy2[1])/2 + y_offset)
    ax.text(mid[0], mid[1] + 0.15, mid_label, ha="center", fontsize=9, style="italic")
    ax.text(mid[0], mid[1] - 0.2, eq_label, ha="center", fontsize=8)

draw_flow(ax2, (2.2, 3.15), (3.0, 3.15), "rd_completion", r"$k_{rd} \cdot R$")
draw_flow(ax2, (4.6, 3.15), (5.4, 3.15), "integration", r"$k_{int} \cdot I$")
draw_flow(ax2, (7.0, 3.15), (7.8, 3.15), "cert_rate", r"$\frac{k_{cert}}{oversight} \cdot C$")
# Trust: gain from deliveries
ax2.annotate("", xy=(10.2, 1.35), xytext=(8.8, 2.5),
            arrowprops=dict(arrowstyle="->", lw=1.5, color="green"))
ax2.text(9.4, 2.0, "trust_gain", ha="center", fontsize=8, style="italic")
ax2.text(9.4, 1.7, r"$\propto$ cert_rate $\cdot (1 + \beta \cdot f_{nl})$", ha="center", fontsize=7)
# Inflow to R&D
ax2.annotate("", xy=(0.8, 3.15), xytext=(0.2, 3.15),
            arrowprops=dict(arrowstyle="->", lw=1.5, color="black"))
ax2.text(0.5, 3.5, "new_programs", ha="center", fontsize=8)
# Trust decay (outflow)
ax2.annotate("", xy=(9.8, 0.7), xytext=(10.5, 0.7),
            arrowprops=dict(arrowstyle="->", lw=1.2, color="gray"))
ax2.text(10.6, 0.5, r"decay $\cdot T$", ha="center", fontsize=7)

# Exact ODEs
ax2.text(6, 0.35,
         r"$\frac{dR}{dt} = new\_programs - k_{rd}R$  |  "
         r"$\frac{dI}{dt} = k_{rd}R - k_{int}I$  |  "
         r"$\frac{dC}{dt} = k_{int}I - \frac{k_{cert}}{oversight}C$  |  "
         r"$\frac{dD}{dt} = \frac{k_{cert}}{oversight}C$",
         ha="center", fontsize=8)
ax2.text(6, 0.0,
         r"$\frac{dT}{dt} = trust\_gain\_per\_delivery \cdot cert\_rate \cdot (1 + non\_lethal\_bonus \cdot f_{nl}) - decay \cdot T$",
         ha="center", fontsize=8)
ax2.set_title("AeroDyn — Stock-flow diagram (Pipeline & Ministerial Trust)", fontsize=11)
plt.tight_layout()
plt.savefig("aerodyn_stock_flow_diagram.png", dpi=120)
print("Saved aerodyn_stock_flow_diagram.png")

if plt.get_backend().lower() != "agg":
    plt.show()
