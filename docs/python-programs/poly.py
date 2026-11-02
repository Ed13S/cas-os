# Quadratic and cubic helper: intercepts, turning points, discriminant (Maths Methods)
from math import *
def ask(p):
    return eval(input(p + " "))
def rd(x):
    return round(x, 5)
print("1: quadratic ax^2+bx+c")
print("2: cubic ax^3+bx^2+cx+d")
m = int(ask("Choose 1 or 2:"))
if m == 1:
    a = ask("a?")
    b = ask("b?")
    c = ask("c?")
    D = b * b - 4 * a * c
    print("Discriminant D = b^2 - 4ac")
    print("D = (" + str(b) + ")^2 - 4*(" + str(a) + ")*(" + str(c) + ") = " + str(rd(D)))
    if D > 0:
        print("D > 0: two real x-intercepts")
        print("x = (-b +/- sqrt(D))/(2a)")
        print("x = " + str(rd((-b - sqrt(D)) / (2 * a))) + " or " + str(rd((-b + sqrt(D)) / (2 * a))))
    elif D == 0:
        print("D = 0: one x-intercept (touches)")
        print("x = " + str(rd(-b / (2 * a))))
    else:
        print("D < 0: no real x-intercepts")
        print("(graph does not cross the x-axis)")
    xv = -b / (2 * a)
    yv = a * xv * xv + b * xv + c
    print("y-intercept: (0, " + str(rd(c)) + ")")
    print("Turning point at x = -b/(2a)")
    print("(" + str(rd(xv)) + ", " + str(rd(yv)) + ")" + (" minimum" if a > 0 else " maximum"))
else:
    a = ask("a?")
    b = ask("b?")
    c = ask("c?")
    d = ask("d?")
    def f(x):
        return ((a * x + b) * x + c) * x + d
    print("y-intercept: (0, " + str(rd(d)) + ")")
    print("f'(x) = " + str(3 * a) + "x^2 + " + str(2 * b) + "x + " + str(c))
    D = 4 * b * b - 12 * a * c
    print("D of f'(x) = " + str(rd(D)))
    if D > 0:
        print("D > 0: two turning points")
        for s in (-1, 1):
            xt = (-2 * b + s * sqrt(D)) / (6 * a)
            print("(" + str(rd(xt)) + ", " + str(rd(f(xt))) + ")")
    elif D == 0:
        print("D = 0: stationary point of inflection")
        xt = -b / (3 * a)
        print("(" + str(rd(xt)) + ", " + str(rd(f(xt))) + ")")
    else:
        print("D < 0: no turning points")
    print("Inflection at x = -b/(3a) = " + str(rd(-b / (3 * a))))
    roots = []
    x0 = -100.0
    y0 = f(x0)
    while x0 < 100:
        x1 = x0 + 0.01
        y1 = f(x1)
        if y0 == 0:
            roots.append(x0)
        elif y0 * y1 < 0:
            lo = x0
            hi = x1
            for i in range(50):
                mid = (lo + hi) / 2
                if f(lo) * f(mid) <= 0:
                    hi = mid
                else:
                    lo = mid
            roots.append((lo + hi) / 2)
        x0 = x1
        y0 = y1
    print("x-intercepts (numeric):")
    if roots:
        for r in roots:
            print("x = " + str(rd(r)))
    else:
        print("none found between -100 and 100")
