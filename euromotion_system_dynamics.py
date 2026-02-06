"""
EuroMotion Automotive — Supply chain resilience & delivery throughput.
System dynamics: Backlog, Chip & Battery inventory, Production, Delivered.
Capacity–demand with supply constraints. Scipy + matplotlib.
"""

import numpy as np
from scipy.integrate import solve_ivp
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# --- Parameters (base case) ---
MONTHS = 60  # 5 years
# Orders (per month)
orders_in = 120.0
# Capacity (vehicles per month)
capacity = 100.0
# Chip: inventory target (months of supply), consumption per vehicle, supply rate (base)
chip_target = 2.0
chips_per_vehicle = 1.0
chip_supply_base = 120.0  # units/month (enough for ~120 vehicles if 1:1)
# Battery: same idea
battery_target = 1.5
batteries_per_vehicle = 1.0
battery_supply_base = 110.0

# Initial state: [Backlog, Delivered, Chip_inventory, Battery_inventory]
B0, D0, C0, Bat0 = 500.0, 0.0, 200.0, 150.0
y0 = [B0, D0, C0, Bat0]


def euromotion(t, y, chip_supply_mult=1.0, battery_supply_mult=1.0):
    """ODEs: y = [Backlog, Delivered, Chip_inv, Battery_inv]."""
    Backlog, Delivered, Chip_inv, Battery_inv = y
    # Supply-limited production: can't exceed capacity or chip/battery availability
    chip_avail = min(1.0, Chip_inv / (chip_target * capacity)) if chip_target * capacity > 0 else 1.0
    battery_avail = min(1.0, Battery_inv / (battery_target * capacity)) if battery_target * capacity > 0 else 1.0
    supply_factor = min(chip_avail, battery_avail)
    production = min(capacity, Backlog) * supply_factor
    production = max(0, production)
    # Flows
    chip_consumption = production * chips_per_vehicle
    battery_consumption = production * batteries_per_vehicle
    chip_supply = chip_supply_base * chip_supply_mult
    battery_supply = battery_supply_base * battery_supply_mult
    # Derivatives
    dBacklog = orders_in - production
    dDelivered = production
    dChip = chip_supply - chip_consumption
    dBattery = battery_supply - battery_consumption
    return [dBacklog, dDelivered, dChip, dBattery]


def run_scenario(chip_mult=1.0, battery_mult=1.0, label="Base"):
    """Run one scenario; return t, Backlog, Delivered, Chip_inv, Battery_inv, label."""
    def odefun(t, y):
        return euromotion(t, y, chip_supply_mult=chip_mult, battery_supply_mult=battery_mult)
    sol = solve_ivp(odefun, [0, MONTHS], y0, dense_output=True, max_step=1.0)
    t = np.linspace(0, MONTHS, 200)
    B, D, C, Bat = sol.sol(t)
    return t, B, D, C, Bat, label


# --- Run scenarios ---
scenarios = [
    (1.0, 1.0, "Base"),
    (0.5, 1.0, "Semiconductor shock (50% supply)"),
    (1.0, 0.6, "Battery shock (60% supply)"),
    (0.5, 0.6, "Dual shock"),
    (1.2, 1.2, "Resilience (120% supply)"),
]
results = [run_scenario(c, b, l) for c, b, l in scenarios]

# --- Time-series plot ---
fig, axes = plt.subplots(2, 2, figsize=(10, 8))

ax = axes[0, 0]
for t, B, D, C, Bat, label in results:
    ax.plot(t, B, alpha=0.8, label=label)
ax.set_ylabel("Orders")
ax.set_title("Order backlog")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

ax = axes[0, 1]
for t, B, D, C, Bat, label in results:
    ax.plot(t, D, alpha=0.8, label=label)
ax.set_ylabel("Vehicles")
ax.set_title("Delivered (cumulative)")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

ax = axes[1, 0]
for t, B, D, C, Bat, label in results:
    ax.plot(t, C, alpha=0.8, label=label)
ax.set_xlabel("Month")
ax.set_ylabel("Units")
ax.set_title("Semiconductor inventory")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

ax = axes[1, 1]
for t, B, D, C, Bat, label in results:
    ax.plot(t, Bat, alpha=0.8, label=label)
ax.set_xlabel("Month")
ax.set_ylabel("Units")
ax.set_title("Battery inventory")
ax.legend(fontsize=7)
ax.grid(True, alpha=0.3)

fig.suptitle("EuroMotion Automotive — Supply chain resilience (5-year scenarios)", fontsize=11)
plt.tight_layout()
plt.savefig("euromotion_scenarios.png", dpi=120)
print("Saved euromotion_scenarios.png")

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


w, h = 1.4, 0.75
stock_box(ax2, 0.8, 2.6, w, h, "Backlog", "mistyrose")
stock_box(ax2, 3.8, 2.6, w, h, "Chip\ninventory", "lavender")
stock_box(ax2, 5.8, 2.6, w, h, "Battery\ninventory", "lightyellow")
stock_box(ax2, 8.2, 2.6, w, h, "Delivered", "lightgreen")

# Flows
def draw_flow(ax, xy1, xy2, mid_label, eq_label):
    ax.annotate("", xy=xy2, xytext=xy1, arrowprops=dict(arrowstyle="->", lw=1.8, color="black"))
    mid = ((xy1[0] + xy2[0])/2, (xy1[1] + xy2[1])/2)
    ax.text(mid[0], mid[1] + 0.12, mid_label, ha="center", fontsize=9, style="italic")
    ax.text(mid[0], mid[1] - 0.18, eq_label, ha="center", fontsize=8)

# orders_in → Backlog
draw_flow(ax2, (0.2, 2.98), (0.8, 2.98), "orders_in", "exogenous")
# production: Backlog → Delivered (main flow)
ax2.annotate("", xy=(8.0, 2.98), xytext=(2.3, 2.98), arrowprops=dict(arrowstyle="->", lw=2, color="darkgreen"))
ax2.text(5.15, 3.35, "production", ha="center", fontsize=9, style="italic", color="darkgreen")
ax2.text(5.15, 2.6, r"$\min(cap,B) \cdot \varphi$", ha="center", fontsize=8)
ax2.text(5.15, 2.2, r"$\varphi = \min(\frac{C}{C^*}, \frac{Bat}{Bat^*})$", ha="center", fontsize=7)
# chip_supply → Chip_inv; chip_use (outflow)
draw_flow(ax2, (3.2, 2.98), (3.8, 2.98), "chip_supply", "exogenous")
ax2.annotate("", xy=(4.5, 2.3), xytext=(4.0, 2.3), arrowprops=dict(arrowstyle="->", lw=1.2, color="gray"))
ax2.text(4.25, 2.5, r"chip_use $= \alpha \cdot prod$", ha="center", fontsize=7)
# battery_supply → Battery_inv; battery_use (outflow)
draw_flow(ax2, (5.2, 2.98), (5.8, 2.98), "battery_supply", "exogenous")
ax2.annotate("", xy=(6.5, 2.3), xytext=(6.0, 2.3), arrowprops=dict(arrowstyle="->", lw=1.2, color="gray"))
ax2.text(6.25, 2.5, r"battery_use $= \beta \cdot prod$", ha="center", fontsize=7)

# ODEs
ax2.text(6, 0.5,
         r"$\frac{d\,Backlog}{dt} = orders\_in - production$  |  "
         r"$\frac{d\,Delivered}{dt} = production$",
         ha="center", fontsize=9)
ax2.text(6, 0.15,
         r"$\frac{d\,Chip}{dt} = chip\_supply - \alpha \cdot production$  |  "
         r"$\frac{d\,Battery}{dt} = battery\_supply - \beta \cdot production$",
         ha="center", fontsize=9)
ax2.text(6, 0.0, r"$production = \min(capacity, Backlog) \cdot \min(1, C/C^*, Bat/Bat^*)$",
         ha="center", fontsize=8)
ax2.set_title("EuroMotion — Stock-flow diagram (Supply chain resilience)", fontsize=11)
plt.tight_layout()
plt.savefig("euromotion_stock_flow_diagram.png", dpi=120)
print("Saved euromotion_stock_flow_diagram.png")

if plt.get_backend().lower() != "agg":
    plt.show()
