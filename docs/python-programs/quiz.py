# Random formula quiz with instant marking (Maths, Physics, Systems)
from math import *
import random
def rd(x):
    return round(x, 3)
def qs():
    a = random.randint(2, 9)
    b = random.randint(2, 9)
    c = random.randint(1, 5)
    v = random.randint(2, 12)
    r = random.choice((10, 20, 50, 100, 220, 470))
    return [
        ("Methods", "Solve " + str(a) + "x + " + str(b) + " = " + str(a * c + b) + ". x = ?", c, "x = (rhs - b)/a"),
        ("Methods", "Gradient of y = " + str(a) + "x^2 at x = " + str(b) + "?", 2 * a * b, "dy/dx = 2ax"),
        ("Methods", "Discriminant of x^2 + " + str(2 * a) + "x + " + str(b) + "?", 4 * a * a - 4 * b, "D = b^2 - 4ac"),
        ("Methods", "Bi(" + str(10) + ", 0.5): mean np = ?", 5, "mean = np"),
        ("Methods", "X~N(" + str(50) + "," + str(a) + "^2). z for x = " + str(50 + a * c) + "?", c, "z = (x - mu)/sigma"),
        ("Physics", "u=0, a=" + str(a) + ", t=" + str(b) + ". v = ? (m/s)", a * b, "v = u + at"),
        ("Physics", "u=0, a=" + str(a) + ", t=" + str(b) + ". s = ? (m)", 0.5 * a * b * b, "s = ut + 1/2 at^2"),
        ("Physics", "A " + str(a) + " kg mass, g=9.8. Weight (N)?", a * 9.8, "W = mg"),
        ("Physics", str(a) + " kg moving at " + str(v) + " m/s. KE (J)?", 0.5 * a * v * v, "KE = 1/2 m v^2"),
        ("Systems", str(v) + " V across " + str(r) + " ohm. I (mA)?", 1000.0 * v / r, "I = V/R (x1000 for mA)"),
        ("Systems", str(r) + " ohm and " + str(r) + " ohm in series. R (ohm)?", 2 * r, "R = R1 + R2"),
        ("Systems", str(r) + " ohm and " + str(r) + " ohm in parallel. R (ohm)?", r / 2.0, "1/R = 1/R1 + 1/R2"),
        ("Systems", "Divider Vin=" + str(v) + " V, R1=R2. Vout (V)?", v / 2.0, "Vout = Vin R2/(R1+R2)"),
        ("Systems", "Gear 12T drives " + str(12 * a) + "T. Ratio?", a, "ratio = driven/driver"),
        ("Systems", "I=" + str(a) + " A, R=" + str(b) + " ohm. P (W)?", a * a * b, "P = I^2 R"),
    ]
print("Quiz: answer with a number.")
print("Marked within 1%.")
print("1 all  2 Methods  3 Physics  4 Systems")
m = int(input("Choose 1-4: "))
topic = ("", "", "Methods", "Physics", "Systems")[m]
n = int(input("Number of questions: "))
score = 0
for i in range(n):
    pool = [q for q in qs() if topic == "" or q[0] == topic]
    q = random.choice(pool)
    print("Q" + str(i + 1) + " [" + q[0] + "] " + q[1])
    try:
        ans = eval(input("> "))
    except:
        ans = None
    ok = ans is not None and abs(ans - q[2]) <= 0.01 * max(abs(q[2]), 1e-9)
    if ok:
        score += 1
        print("Correct!")
    else:
        print("Answer: " + str(rd(q[2])))
    print("Rule: " + q[3])
print("Score " + str(score) + "/" + str(n))
