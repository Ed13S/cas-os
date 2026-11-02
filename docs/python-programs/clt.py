# Watch the sample mean settle down as n grows (Maths Methods)
from math import *
import random
def show(xs, ys, title):
    try:
        import ti_plotlib as plt
        plt.cls()
        plt.auto_window(xs, ys)
        plt.axes("on")
        plt.title(title)
        plt.plot(xs, ys, "+")
        plt.show_plot()
    except:
        pass
def die():
    return random.randint(1, 6)
print("Fair die: true mean 3.5, sd 1.7078")
print("1: running mean of one long run")
print("2: how spread of sample means")
print("   shrinks (sigma/sqrt(n))")
m = int(input("Choose 1 or 2: "))
if m == 1:
    N = int(input("Rolls (e.g. 1000)? "))
    total = 0
    xs = []
    ys = []
    step = max(1, N // 40)
    for i in range(1, N + 1):
        total += die()
        if i % step == 0 or i < 10:
            xs.append(i)
            ys.append(total / i)
    for i in (1, 10, 50, 100, 500, 1000, 5000):
        if i <= N:
            for j in range(len(xs)):
                if xs[j] >= i:
                    print("n=" + str(xs[j]) + " mean=" + str(round(ys[j], 4)))
                    break
    print("final n=" + str(N) + " mean=" + str(round(ys[-1], 4)))
    show(xs, ys, "Running mean")
else:
    reps = 200
    print("n  sd of means  sigma/sqrt(n)")
    for n in (1, 4, 9, 25, 100):
        ms = []
        for r in range(reps):
            s = 0
            for k in range(n):
                s += die()
            ms.append(s / n)
        mu = sum(ms) / reps
        v = sum((x - mu) ** 2 for x in ms) / reps
        print(str(n) + "  " + str(round(sqrt(v), 3)) + "  " + str(round(1.7078 / sqrt(n), 3)))
