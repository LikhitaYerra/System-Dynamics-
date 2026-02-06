"""
SIR system dynamics — integrate with scipy, display with matplotlib.
Classic epidemic model: Susceptible → Infected → Recovered.
Includes stock-flow diagram with exact flow equations.
"""

import numpy as np
from scipy.integrate import solve_ivp
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# Parameters
N = 1000.0       # total population
beta = 0.3       # transmission rate
gamma = 0.1      # recovery rate
I0, R0 = 10, 0   # initial infected, recovered
S0 = N - I0 - R0

def sir(t, y):
    """SIR ODEs: y = [S, I, R]."""
    S, I, R = y
    dS = -beta * S * I / N
    dI = beta * S * I / N - gamma * I
    dR = gamma * I
    return [dS, dI, dR]

# Integrate over 0..160 days
sol = solve_ivp(sir, [0, 160], [S0, I0, R0], dense_output=True)
t = np.linspace(0, 160, 200)
S, I, R = sol.sol(t)

# Plot
fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(t, S, label="Susceptible", color="C0")
ax.plot(t, I, label="Infected", color="C1")
ax.plot(t, R, label="Recovered", color="C2")
ax.set_xlabel("Time (days)")
ax.set_ylabel("Population")
ax.set_title("SIR system dynamics (scipy + matplotlib)")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("sir_plot.png", dpi=120)
print("Saved sir_plot.png")

# --- Stock-flow diagram with exact relationships ---
fig2, ax2 = plt.subplots(figsize=(10, 5))
ax2.set_xlim(0, 10)
ax2.set_ylim(0, 5)
ax2.set_aspect("equal")
ax2.axis("off")

# Stock box style
def stock_box(ax, x, y, w, h, label, color="lightblue"):
    box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02", 
                         facecolor=color, edgecolor="black", linewidth=1.5)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, label, ha="center", va="center", fontsize=12, fontweight="bold")

# Stocks: S (left), I (center), R (right)
w, h = 1.4, 0.9
stock_box(ax2, 1.0, 2.0, w, h, "S\nSusceptible", "lightblue")
stock_box(ax2, 4.2, 2.0, w, h, "I\nInfected", "mistyrose")
stock_box(ax2, 7.4, 2.0, w, h, "R\nRecovered", "lightgreen")

# Flow: S → I (infection)
ax2.annotate("", xy=(4.0, 2.45), xytext=(2.5, 2.45),
             arrowprops=dict(arrowstyle="->", lw=2, color="black"))
ax2.text(3.25, 2.75, r"infection", ha="center", fontsize=10, style="italic")
ax2.text(3.25, 2.15, r"$\beta \cdot S \cdot I \,/\, N$", ha="center", fontsize=10)

# Flow: I → R (recovery)
ax2.annotate("", xy=(7.2, 2.45), xytext=(5.6, 2.45),
             arrowprops=dict(arrowstyle="->", lw=2, color="black"))
ax2.text(6.4, 2.75, r"recovery", ha="center", fontsize=10, style="italic")
ax2.text(6.4, 2.15, r"$\gamma \cdot I$", ha="center", fontsize=10)

# Exact ODEs (relationship summary)
ax2.text(5, 0.85, r"$\frac{dS}{dt} = -\beta S I / N$  |  "
         r"$\frac{dI}{dt} = \beta S I / N - \gamma I$  |  "
         r"$\frac{dR}{dt} = \gamma I$",
         ha="center", fontsize=11, family="monospace")
ax2.text(5, 0.45, r"Parameters: $N$ (population), $\beta$ (transmission), $\gamma$ (recovery)",
         ha="center", fontsize=9, color="gray")
ax2.set_title("SIR stock-flow diagram (exact relationships)", fontsize=12)
plt.tight_layout()
plt.savefig("sir_stock_flow_diagram.png", dpi=120)
print("Saved sir_stock_flow_diagram.png")

if plt.get_backend().lower() != "agg":
    plt.show()
