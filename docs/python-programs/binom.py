# Binomial probability with working (Maths Methods)
from math import *
def ask(p):
    return eval(input(p + " "))
def C(n, k):
    r = 1
    for i in range(1, k + 1):
        r = r * (n - k + i) // i
    return r
def rd(x):
    return round(x, 6)
n = int(ask("n (trials)?"))
p = ask("p (P(success))?")
q = 1 - p
def pmf(k):
    return C(n, k) * p ** k * q ** (n - k)
print("X ~ Bi(" + str(n) + ", " + str(p) + ")")
print("mean = np = " + str(rd(n * p)))
print("sd = sqrt(npq) = " + str(rd(sqrt(n * p * q))))
print("1: P(X=k)  2: P(X<=k)")
print("3: P(X>=k) 4: P(a<=X<=b)")
m = int(ask("Choose 1-4:"))
def term(k):
    return "C(" + str(n) + "," + str(k) + ")*" + str(p) + "^" + str(k) + "*" + str(rd(q)) + "^" + str(n - k)
def total(lo, hi):
    s = 0
    for k in range(lo, hi + 1):
        s += pmf(k)
    return s
if m == 1:
    k = int(ask("k?"))
    print("P(X=k) = C(n,k) p^k q^(n-k)")
    print("= " + term(k))
    print("= " + str(rd(pmf(k))))
else:
    if m == 2:
        lo = 0
        hi = int(ask("k?"))
        print("P(X<=" + str(hi) + ") = P(0)+...+P(" + str(hi) + ")")
    elif m == 3:
        lo = int(ask("k?"))
        hi = n
        print("P(X>=" + str(lo) + ") = 1 - P(X<=" + str(lo - 1) + ")")
        print("= 1 - " + str(rd(total(0, lo - 1))))
    else:
        lo = int(ask("a?"))
        hi = int(ask("b?"))
        print("P(" + str(lo) + "<=X<=" + str(hi) + ") = sum of P(k)")
    shown = 0
    for k in range(lo, hi + 1):
        if shown < 6:
            print("P(" + str(k) + ") = " + str(rd(pmf(k))))
        shown += 1
    if shown > 6:
        print("... (" + str(shown - 6) + " more terms)")
    print("Answer = " + str(rd(total(lo, hi))))
