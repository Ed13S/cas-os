# Constant acceleration (SUVAT) solver with working (Physics)
from math import *
def rd(x):
    return round(x, 5)
print("Enter 3 known values, press")
print("Enter on the 2 unknown ones.")
names = ("u", "v", "a", "s", "t")
k = {}
for n in names:
    s = input(n + " = ")
    if s.strip() != "":
        k[n] = eval(s)
if len(k) != 3:
    print("Need exactly 3 known values.")
else:
    have = ""
    for n in names:
        if n in k:
            have += n
    print("Known: " + have)
    r = {}
    u = k.get("u")
    v = k.get("v")
    a = k.get("a")
    s = k.get("s")
    t = k.get("t")
    def quad(A, B, C):
        D = B * B - 4 * A * C
        if D < 0:
            return []
        return [(-B + sqrt(D)) / (2 * A), (-B - sqrt(D)) / (2 * A)]
    if have == "uva":
        print("t = (v-u)/a")
        r["t"] = (v - u) / a
        print("s = (v^2-u^2)/(2a)")
        r["s"] = (v * v - u * u) / (2 * a)
    elif have == "uvt":
        print("a = (v-u)/t")
        r["a"] = (v - u) / t
        print("s = (u+v)t/2")
        r["s"] = (u + v) * t / 2
    elif have == "uvs":
        print("a = (v^2-u^2)/(2s)")
        r["a"] = (v * v - u * u) / (2 * s)
        print("t = 2s/(u+v)")
        r["t"] = 2 * s / (u + v)
    elif have == "uat":
        print("v = u + at")
        r["v"] = u + a * t
        print("s = ut + 1/2 a t^2")
        r["s"] = u * t + 0.5 * a * t * t
    elif have == "uas":
        print("v^2 = u^2 + 2as")
        vv = u * u + 2 * a * s
        if vv < 0:
            print("No real solution (v^2 < 0)")
        else:
            r["v"] = sqrt(vv)
            print("v = +/- " + str(rd(sqrt(vv))))
            print("1/2 a t^2 + u t - s = 0")
            ts = quad(0.5 * a, u, -s)
            ts = [x for x in ts if x >= 0]
            print("t = " + " or ".join([str(rd(x)) for x in ts]))
            if ts:
                r["t"] = ts
    elif have == "ust":
        print("a = 2(s-ut)/t^2")
        r["a"] = 2 * (s - u * t) / (t * t)
        print("v = u + at")
        r["v"] = u + r["a"] * t
    elif have == "vat":
        print("u = v - at")
        r["u"] = v - a * t
        print("s = vt - 1/2 a t^2")
        r["s"] = v * t - 0.5 * a * t * t
    elif have == "vas":
        print("u^2 = v^2 - 2as")
        uu = v * v - 2 * a * s
        if uu < 0:
            print("No real solution (u^2 < 0)")
        else:
            r["u"] = sqrt(uu)
            print("u = +/- " + str(rd(sqrt(uu))))
            print("1/2 a t^2 - v t + s = 0")
            ts = quad(0.5 * a, -v, s)
            ts = [x for x in ts if x >= 0]
            print("t = " + " or ".join([str(rd(x)) for x in ts]))
            if ts:
                r["t"] = ts
    elif have == "vst":
        print("u = 2s/t - v")
        r["u"] = 2 * s / t - v
        print("a = (v-u)/t")
        r["a"] = (v - r["u"]) / t
    else:
        print("a,s,t known:")
        print("u = s/t - 1/2 a t")
        r["u"] = s / t - 0.5 * a * t
        print("v = u + at")
        r["v"] = r["u"] + a * t
    print("Results:")
    for n in names:
        if n in r:
            if isinstance(r[n], list):
                print(n + " = " + " or ".join([str(rd(x)) for x in r[n]]))
            else:
                print(n + " = " + str(rd(r[n])))
