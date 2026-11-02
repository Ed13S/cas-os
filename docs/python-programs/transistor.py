# BJT / Darlington switch and bias calculator with load line (Systems Engineering)
from math import *
def rd(x):
    return round(x, 5)
print("1: base resistor for a switch")
print("2: fixed-bias Q point + load line")
m = int(input("Choose 1 or 2: "))
if m == 1:
    Vin = eval(input("input voltage Vin (V): "))
    Ic = eval(input("load current Ic (A): "))
    beta = eval(input("gain hFE (use the minimum): "))
    od = eval(input("overdrive factor (2 to 10): "))
    d = input("Darlington pair? (y/n): ").strip().lower() == "y"
    if d:
        b2 = eval(input("hFE of 2nd transistor: "))
        beta = beta * b2
        Vbe = 1.4
        print("Darlington: hFE = hFE1 x hFE2 = " + str(rd(beta)))
        print("Vbe = about 1.4 V (2 junctions)")
    else:
        Vbe = 0.7
        print("Vbe = about 0.7 V")
    Ib = Ic / beta
    print("Ib(min) = Ic/hFE = " + str(rd(Ib)) + " A")
    Ibd = Ib * od
    print("Ib(drive) = Ib x " + str(od) + " = " + str(rd(Ibd)) + " A")
    Rb = (Vin - Vbe) / Ibd
    print("Rb = (Vin - Vbe)/Ib")
    print("= (" + str(Vin) + " - " + str(Vbe) + ")/" + str(rd(Ibd)))
    print("= " + str(rd(Rb)) + " ohm")
    print("Pick the next standard value DOWN.")
else:
    Vcc = eval(input("Vcc (V): "))
    Rc = eval(input("Rc (ohm): "))
    Rb = eval(input("Rb (ohm): "))
    beta = eval(input("hFE: "))
    Vbe = 0.7
    Ib = (Vcc - Vbe) / Rb
    print("Ib = (Vcc - Vbe)/Rb = " + str(rd(Ib)) + " A")
    Ic = beta * Ib
    print("Ic = hFE x Ib = " + str(rd(Ic)) + " A")
    Vce = Vcc - Ic * Rc
    print("Vce = Vcc - Ic Rc = " + str(rd(Vce)) + " V")
    icsat = Vcc / Rc
    print("Load line ends:")
    print("Ic(sat) = Vcc/Rc = " + str(rd(icsat)) + " A (Vce=0)")
    print("Vce(off) = Vcc = " + str(Vcc) + " V (Ic=0)")
    if Vce < 0.2:
        print("SATURATED: Q point is past the line.")
        print("Ic ~ " + str(rd((Vcc - 0.2) / Rc)) + " A, Vce ~ 0.2 V")
    elif Vce > Vcc - 0.01:
        print("Transistor is OFF")
    else:
        print("In the active region.")
    try:
        import ti_plotlib as plt
        plt.cls()
        plt.window(0, Vcc * 1.1, 0, icsat * 1.1)
        plt.axes("on")
        plt.title("Load line (Vce, Ic)")
        plt.line(0, icsat, Vcc, 0, "solid")
        plt.plot([max(0.2, Vce)], [min(Ic, icsat)], "o")
        plt.show_plot()
    except:
        pass
