# Ohm's law, power, voltage divider, RC, LED resistor (Systems Engineering)
from math import *
def rd(x):
    return round(x, 6)
def opt(p):
    s = input(p + " = ")
    if s.strip() == "":
        return None
    return eval(s)
E12 = (1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2)
def e12_up(r):
    d = 0
    while r >= 10:
        r = r / 10
        d += 1
    while r < 1:
        r = r * 10
        d -= 1
    for x in E12:
        if x >= r - 1e-9:
            return x * 10.0 ** d
    return 10.0 * 10.0 ** d
print("1: Ohm's law + power")
print("2: voltage divider")
print("3: RC circuit")
print("4: LED series resistor")
m = int(input("Choose 1-4: "))
if m == 1:
    print("Enter any two, Enter on the rest")
    V = opt("V (volts)")
    I = opt("I (amps)")
    R = opt("R (ohms)")
    P = opt("P (watts)")
    if V is not None and I is not None:
        R = V / I
        P = V * I
        print("R = V/I, P = VI")
    elif V is not None and R is not None:
        I = V / R
        P = V * V / R
        print("I = V/R, P = V^2/R")
    elif I is not None and R is not None:
        V = I * R
        P = I * I * R
        print("V = IR, P = I^2 R")
    elif P is not None and V is not None:
        I = P / V
        R = V * V / P
        print("I = P/V, R = V^2/P")
    elif P is not None and I is not None:
        V = P / I
        R = P / (I * I)
        print("V = P/I, R = P/I^2")
    elif P is not None and R is not None:
        V = sqrt(P * R)
        I = sqrt(P / R)
        print("V = sqrt(PR), I = sqrt(P/R)")
    else:
        print("Give exactly two values.")
    if V is not None and I is not None and R is not None:
        print("V = " + str(rd(V)) + " V")
        print("I = " + str(rd(I)) + " A")
        print("R = " + str(rd(R)) + " ohm")
        print("P = " + str(rd(P)) + " W")
elif m == 2:
    Vin = eval(input("Vin (V): "))
    R1 = eval(input("R1 (top, ohm): "))
    R2 = eval(input("R2 (bottom, ohm): "))
    print("Vout = Vin x R2/(R1+R2)")
    print("= " + str(Vin) + " x " + str(R2) + "/" + str(R1 + R2))
    print("= " + str(rd(Vin * R2 / (R1 + R2))) + " V")
    print("Divider current = " + str(rd(Vin / (R1 + R2))) + " A")
elif m == 3:
    R = eval(input("R (ohm): "))
    C = eval(input("C (farad, e.g. 100e-6): "))
    Vs = eval(input("supply Vs (V): "))
    tau = R * C
    print("tau = RC = " + str(rd(tau)) + " s")
    print("Charging: V(t) = Vs(1 - e^(-t/tau))")
    for n in (1, 2, 3, 5):
        print("t = " + str(n) + " tau: " + str(rd(Vs * (1 - exp(-n))) ) + " V (" + str(round(100 * (1 - exp(-n)), 1)) + "%)")
    pc = eval(input("time to reach what % of Vs? "))
    t = -tau * log(1 - pc / 100)
    print("t = -tau ln(1 - p) = " + str(rd(t)) + " s")
else:
    Vs = eval(input("supply Vs (V): "))
    Vf = eval(input("LED forward voltage Vf (V): "))
    If = eval(input("LED current (A), e.g. 0.02: "))
    R = (Vs - Vf) / If
    print("R = (Vs - Vf)/I")
    print("= (" + str(Vs) + " - " + str(Vf) + ")/" + str(If))
    print("= " + str(rd(R)) + " ohm")
    Rs = e12_up(R)
    print("Next E12 value up: " + str(rd(Rs)) + " ohm")
    print("Actual current = " + str(rd((Vs - Vf) / Rs)) + " A")
    print("Resistor power = " + str(rd(If * If * Rs)) + " W")
