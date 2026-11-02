# Projectile motion: range, max height, time of flight, plotted path (Physics)
from math import *
def ask(p, d):
    s = input(p + " [" + str(d) + "] ")
    if s.strip() == "":
        return d
    return eval(s)
def rd(x):
    return round(x, 4)
v = ask("launch speed (m/s)", 20)
ang = ask("angle above horizontal (deg)", 45)
h0 = ask("launch height (m)", 0)
g = ask("g (m/s^2)", 9.8)
th = radians(ang)
vx = v * cos(th)
vy = v * sin(th)
print("vx = v cos(th) = " + str(rd(vx)))
print("vy = v sin(th) = " + str(rd(vy)))
ta = vy / g
H = h0 + vy * vy / (2 * g)
print("Time to top = vy/g = " + str(rd(ta)) + " s")
print("Max height = h0 + vy^2/(2g)")
print("= " + str(rd(H)) + " m")
print("Landing: 0 = h0 + vy t - 1/2 g t^2")
T = (vy + sqrt(vy * vy + 2 * g * h0)) / g
print("Time of flight T = " + str(rd(T)) + " s")
R = vx * T
print("Range = vx T = " + str(rd(R)) + " m")
vyf = vy - g * T
print("Landing speed = " + str(rd(sqrt(vx * vx + vyf * vyf))) + " m/s")
try:
    import ti_plotlib as plt
    xs = []
    ys = []
    for i in range(41):
        t = T * i / 40
        xs.append(vx * t)
        ys.append(h0 + vy * t - 0.5 * g * t * t)
    plt.cls()
    plt.auto_window(xs, ys)
    plt.axes("on")
    plt.title("Projectile path")
    plt.plot(xs, ys, "+")
    plt.show_plot()
except:
    pass
