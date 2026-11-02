# Gears, torque and speed, mechanical advantage (Systems Engineering)
from math import *
def rd(x):
    return round(x, 5)
print("1: gear train")
print("2: torque, speed and power")
print("3: mechanical advantage")
m = int(input("Choose 1-3: "))
if m == 1:
    print("Teeth driver,driven pairs")
    print("e.g. 12,36  for a 12T driving 36T")
    stages = int(input("number of stages: "))
    ratio = 1.0
    for i in range(stages):
        a, b = eval("(" + input("stage " + str(i + 1) + " driver,driven: ") + ")")
        print("ratio = driven/driver = " + str(b) + "/" + str(a) + " = " + str(rd(b / a)))
        ratio = ratio * b / a
    print("Overall ratio = " + str(rd(ratio)))
    n = eval(input("input speed (rpm): "))
    T = eval(input("input torque (Nm): "))
    print("Output speed = in/ratio = " + str(rd(n / ratio)) + " rpm")
    print("Output torque = in x ratio = " + str(rd(T * ratio)) + " Nm (ideal)")
    e = eval(input("efficiency % (100 if ideal): "))
    print("Real torque = " + str(rd(T * ratio * e / 100)) + " Nm")
elif m == 2:
    print("Enter two of: torque T (Nm), speed n (rpm), power P (W); Enter on unknown")
    s = input("T = ")
    n = input("n = ")
    P = input("P = ")
    print("P = T x omega, omega = 2 pi n/60")
    if s != "" and n != "":
        T = eval(s)
        n = eval(n)
        print("P = " + str(rd(T * 2 * pi * n / 60)) + " W")
    elif s != "" and P != "":
        T = eval(s)
        P = eval(P)
        print("n = " + str(rd(P * 60 / (2 * pi * T))) + " rpm")
    elif n != "" and P != "":
        n = eval(n)
        P = eval(P)
        print("T = " + str(rd(P * 60 / (2 * pi * n))) + " Nm")
    else:
        print("Give exactly two values.")
else:
    L = eval(input("load (N): "))
    E = eval(input("effort (N): "))
    MA = L / E
    print("MA = load/effort = " + str(rd(MA)))
    dE = eval(input("effort distance (m): "))
    dL = eval(input("load distance (m): "))
    VR = dE / dL
    print("VR = effort dist/load dist = " + str(rd(VR)))
    print("Efficiency = MA/VR = " + str(rd(100 * MA / VR)) + " %")
