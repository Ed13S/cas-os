# Resistors and electric / gravitational fields (Physics)
from math import *
def rd(x):
    return round(x, 6)
print("1: series resistors")
print("2: parallel resistors")
print("3: electric field/force")
print("4: gravitational field/force")
m = int(input("Choose 1-4: "))
if m in (1, 2):
    rs = eval("[" + input("Resistors in ohms, e.g. 10,22,47: ") + "]")
    if m == 1:
        print("R = R1 + R2 + ...")
        print("= " + " + ".join([str(x) for x in rs]))
        print("= " + str(rd(sum(rs))) + " ohm")
    else:
        print("1/R = 1/R1 + 1/R2 + ...")
        inv = 0
        for x in rs:
            inv += 1 / x
        print("1/R = " + str(rd(inv)))
        print("R = " + str(rd(1 / inv)) + " ohm")
elif m == 3:
    k = 8.99e9
    Q = eval(input("source charge Q (C), e.g. 2e-6: "))
    r = eval(input("distance r (m): "))
    E = k * abs(Q) / (r * r)
    print("E = kQ/r^2 = " + str(rd(E)) + " N/C")
    print("Direction: " + ("away from Q" if Q > 0 else "towards Q"))
    q = eval(input("test charge q (C) or 0: "))
    if q != 0:
        print("F = qE = " + str(rd(abs(q) * E)) + " N")
else:
    G = 6.67e-11
    M = eval(input("mass M (kg), e.g. 5.97e24: "))
    r = eval(input("distance from centre r (m): "))
    gg = G * M / (r * r)
    print("g = GM/r^2 = " + str(rd(gg)) + " N/kg")
    mm = eval(input("test mass m (kg) or 0: "))
    if mm != 0:
        print("F = mg = " + str(rd(mm * gg)) + " N")
