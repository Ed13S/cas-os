# Numeric derivative at a point and the tangent line (Maths Methods)
from math import *
print("Type f(x) using x, e.g. x**3-2*x")
print("(use ** for powers, sin(x), exp(x))")
fs = input("f(x) = ")
def f(x):
    return eval(fs)
a = eval(input("at x = a, a = "))
print("Central difference:")
print("f'(a) ~ (f(a+h)-f(a-h))/(2h)")
for h in (0.1, 0.01, 0.001, 0.0001):
    d = (f(a + h) - f(a - h)) / (2 * h)
    print("h=" + str(h) + "  " + str(round(d, 8)))
h = 1e-5
m = (f(a + h) - f(a - h)) / (2 * h)
y0 = f(a)
print("f(a) = " + str(round(y0, 6)))
print("gradient m ~ " + str(round(m, 6)))
print("Tangent: y - f(a) = m(x - a)")
print("y = " + str(round(m, 6)) + "x + " + str(round(y0 - m * a, 6)))
if abs(m) > 1e-9:
    print("Normal gradient = -1/m = " + str(round(-1 / m, 6)))
    print("Normal: y = " + str(round(-1 / m, 6)) + "x + " + str(round(y0 + a / m, 6)))
else:
    print("Gradient 0: normal is x = " + str(a))
