# Table of values to see a limit (Maths Methods)
from math import *
print("Type f(x) using x, e.g. sin(x)/x")
fs = input("f(x) = ")
a = eval(input("limit as x -> a, a = "))
def f(x):
    try:
        return eval(fs)
    except:
        return None
def val(y):
    if y is None:
        return "undefined"
    return str(round(y, 6))
print("x      from left    from right")
l = None
r = None
for k in (1, 2, 3, 4, 5, 6):
    h = 10.0 ** (-k)
    l = f(a - h)
    r = f(a + h)
    print(str(h) + "  " + val(l) + "  " + val(r))
print("f(a) = " + val(f(a)))
if l is None or r is None:
    print("Cannot tell: f undefined nearby")
elif abs(l) > 1e5 or abs(r) > 1e5:
    if (l > 0) == (r > 0):
        print("Both sides head to " + ("+inf" if l > 0 else "-inf"))
    else:
        print("Sides go opposite ways: limit does not exist")
elif abs(l - r) < 1e-3 * (1 + abs(l)):
    print("Limit ~ " + str(round((l + r) / 2, 4)))
else:
    print("Left and right limits differ:")
    print("the limit does not exist")
