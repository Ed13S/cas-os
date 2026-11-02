# PID controller simulation on a first-order plant (Systems Engineering)
from math import *
def ask(p, d):
    s = input(p + " [" + str(d) + "] ")
    if s.strip() == "":
        return d
    return eval(s)
print("Plant: tau dy/dt = -y + K u")
K = ask("plant gain K", 1.0)
tau = ask("plant time const tau (s)", 2.0)
Kp = ask("Kp", 2.0)
Ki = ask("Ki", 1.0)
Kd = ask("Kd", 0.0)
sp = ask("setpoint", 1.0)
T = ask("run time (s)", 15)
dt = 0.01
y = 0.0
integ = 0.0
prev = sp
ts = []
ys = []
t = 0.0
peak = 0.0
rise = None
settle = 0.0
steps = int(T / dt)
for i in range(steps):
    e = sp - y
    integ += e * dt
    de = (e - prev) / dt
    prev = e
    u = Kp * e + Ki * integ + Kd * de
    y += dt * (-y + K * u) / tau
    t += dt
    if y > peak:
        peak = y
    if rise is None and y >= 0.9 * sp:
        rise = t
    if abs(y - sp) > 0.02 * abs(sp):
        settle = t
    if i % 25 == 0:
        ts.append(t)
        ys.append(y)
print("t(s)  y")
for j in range(0, len(ts), max(1, len(ts) // 12)):
    print(str(round(ts[j], 2)) + "  " + str(round(ys[j], 4)))
print("final y = " + str(round(y, 4)))
print("steady-state error = " + str(round(sp - y, 4)))
os_ = max(0.0, (peak - sp) / abs(sp) * 100)
print("overshoot = " + str(round(os_, 1)) + " %")
print("rise time (90%) = " + (str(round(rise, 2)) + " s" if rise else "not reached"))
print("settling (2%) = " + str(round(settle, 2)) + " s")
try:
    import ti_plotlib as plt
    plt.cls()
    plt.auto_window(ts, ys)
    plt.axes("on")
    plt.title("Step response")
    plt.plot(ts, ys, "+")
    plt.show_plot()
except:
    pass
