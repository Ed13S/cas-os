# "Show your working" helper: formula, substitution, answer with units (method marks)
from math import *
def sf(x, n):
    if x == 0:
        return 0.0
    d = int(floor(log10(abs(x)))) + 1
    return round(x, n - d)
# name, formula text, inputs (symbol, unit), function, answer symbol, answer unit
T = [
    ("v = u + at", "v = u + a t", (("u", "m/s"), ("a", "m/s^2"), ("t", "s")), lambda u, a, t: u + a * t, "v", "m/s"),
    ("s = ut + 1/2 at^2", "s = u t + 1/2 a t^2", (("u", "m/s"), ("a", "m/s^2"), ("t", "s")), lambda u, a, t: u * t + 0.5 * a * t * t, "s", "m"),
    ("v^2 = u^2 + 2as", "v = sqrt(u^2 + 2 a s)", (("u", "m/s"), ("a", "m/s^2"), ("s", "m")), lambda u, a, s: sqrt(u * u + 2 * a * s), "v", "m/s"),
    ("F = ma", "F = m a", (("m", "kg"), ("a", "m/s^2")), lambda m, a: m * a, "F", "N"),
    ("KE = 1/2 m v^2", "KE = 1/2 m v^2", (("m", "kg"), ("v", "m/s")), lambda m, v: 0.5 * m * v * v, "KE", "J"),
    ("V = IR", "V = I R", (("I", "A"), ("R", "ohm")), lambda I, R: I * R, "V", "V"),
    ("P = VI", "P = V I", (("V", "V"), ("I", "A")), lambda V, I: V * I, "P", "W"),
    ("Vout divider", "Vout = Vin R2/(R1+R2)", (("Vin", "V"), ("R1", "ohm"), ("R2", "ohm")), lambda a, b, c: a * c / (b + c), "Vout", "V"),
    ("tau = RC", "tau = R C", (("R", "ohm"), ("C", "F")), lambda R, C: R * C, "tau", "s"),
    ("LED resistor", "R = (Vs - Vf)/I", (("Vs", "V"), ("Vf", "V"), ("I", "A")), lambda a, b, c: (a - b) / c, "R", "ohm"),
    ("Gear ratio", "ratio = driven/driver", (("driven", "teeth"), ("driver", "teeth")), lambda a, b: a / b, "ratio", ""),
    ("E = kQ/r^2", "E = k Q/r^2, k=8.99e9", (("Q", "C"), ("r", "m")), lambda Q, r: 8.99e9 * Q / (r * r), "E", "N/C"),
    ("g = GM/r^2", "g = G M/r^2, G=6.67e-11", (("M", "kg"), ("r", "m")), lambda M, r: 6.67e-11 * M / (r * r), "g", "N/kg"),
    ("Discriminant", "D = b^2 - 4 a c", (("a", ""), ("b", ""), ("c", "")), lambda a, b, c: b * b - 4 * a * c, "D", ""),
    ("z-score", "z = (x - mu)/sigma", (("x", ""), ("mu", ""), ("sigma", "")), lambda x, m, s: (x - m) / s, "z", ""),
]
print("Pick a formula:")
for i in range(len(T)):
    print(str(i + 1) + ": " + T[i][0])
t = T[int(input("Number: ")) - 1]
vals = []
for sym, unit in t[2]:
    s = input(sym + (" (" + unit + ")" if unit else "") + " = ")
    vals.append((s.strip(), eval(s)))
n = int(input("Significant figures [3]: ") or "3")
ans = t[3](*[v[1] for v in vals])
def substitute(f, names, vals):
    eq = f.index("=")
    lhs = f[:eq + 1]
    rhs = f[eq + 1:]
    tail = ""
    if "," in rhs:
        tail = rhs[rhs.index(","):]
        rhs = rhs[:rhs.index(",")]
    out = ""
    word = ""
    for ch in rhs + " ":
        if ch.isalpha() or (word != "" and ch.isdigit()):
            word += ch
        else:
            if word in names:
                out += "(" + vals[names.index(word)] + ")"
            else:
                out += word
            word = ""
            out += ch
    return lhs + out.rstrip() + tail
print("--- working ---")
print("Formula:")
print("  " + t[1])
print("Substitute:")
print("  " + substitute(t[1], [x[0] for x in t[2]], [v[0] for v in vals]))
print("  given " + ", ".join([t[2][i][0] + " = " + vals[i][0] + (" " + t[2][i][1] if t[2][i][1] else "") for i in range(len(vals))]))
print("Calculate:")
print("  " + t[4] + " = " + str(ans))
print("Answer (" + str(n) + " s.f.):")
print("  " + t[4] + " = " + str(sf(ans, n)) + (" " + t[5] if t[5] else ""))
