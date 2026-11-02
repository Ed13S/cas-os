# Normal distribution probabilities and inverse normal, with working (Maths Methods)
from math import *
def ask(p):
    return eval(input(p + " "))
def rd(x):
    return round(x, 5)
def phi(z):
    if z < -8:
        return 0.0
    if z > 8:
        return 1.0
    t = z
    s = z
    k = 0
    while abs(t) > 1e-17:
        k += 1
        t = t * z * z / (2 * k + 1)
        s += t
    return 0.5 + exp(-z * z / 2) / sqrt(2 * pi) * s
def inv(pr):
    lo = -10.0
    hi = 10.0
    for i in range(80):
        mid = (lo + hi) / 2
        if phi(mid) < pr:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
mu = ask("mean mu?")
sd = ask("std dev sigma?")
print("X ~ N(" + str(mu) + ", " + str(sd) + "^2)")
print("1: P(X<b)  2: P(X>a)")
print("3: P(a<X<b) 4: inverse")
m = int(ask("Choose 1-4:"))
def z(x):
    return (x - mu) / sd
if m == 1:
    b = ask("b?")
    print("z = (b-mu)/sigma = " + str(rd(z(b))))
    print("P(X<b) = P(Z<" + str(rd(z(b))) + ")")
    print("= " + str(rd(phi(z(b)))))
elif m == 2:
    a = ask("a?")
    print("z = (a-mu)/sigma = " + str(rd(z(a))))
    print("P(X>a) = 1 - P(Z<" + str(rd(z(a))) + ")")
    print("= 1 - " + str(rd(phi(z(a)))))
    print("= " + str(rd(1 - phi(z(a)))))
elif m == 3:
    a = ask("a?")
    b = ask("b?")
    print("za = " + str(rd(z(a))) + ", zb = " + str(rd(z(b))))
    print("P = P(Z<zb) - P(Z<za)")
    print("= " + str(rd(phi(z(b)))) + " - " + str(rd(phi(z(a)))))
    print("= " + str(rd(phi(z(b)) - phi(z(a)))))
else:
    pr = ask("P(X<k) = ?")
    zz = inv(pr)
    print("z = invNorm(" + str(pr) + ") = " + str(rd(zz)))
    print("k = mu + z*sigma")
    print("k = " + str(mu) + " + " + str(rd(zz)) + "*" + str(sd))
    print("k = " + str(rd(mu + zz * sd)))
