# Unit converter and significant figures checker (Physics lab write-ups)
from math import *
F = {
    "m": 1.0, "cm": 0.01, "mm": 0.001, "km": 1000.0, "in": 0.0254, "ft": 0.3048,
    "kg": 1.0, "g": 0.001, "mg": 1e-6, "lb": 0.45359237,
    "s": 1.0, "ms": 0.001, "min": 60.0, "h": 3600.0,
    "m/s": 1.0, "km/h": 1 / 3.6,
    "J": 1.0, "kJ": 1000.0, "kWh": 3.6e6, "cal": 4.184,
    "Pa": 1.0, "kPa": 1000.0, "atm": 101325.0,
    "W": 1.0, "kW": 1000.0,
}
KIND = {"m": "L", "cm": "L", "mm": "L", "km": "L", "in": "L", "ft": "L",
        "kg": "M", "g": "M", "mg": "M", "lb": "M", "s": "T", "ms": "T", "min": "T", "h": "T",
        "m/s": "V", "km/h": "V", "J": "E", "kJ": "E", "kWh": "E", "cal": "E",
        "Pa": "P", "kPa": "P", "atm": "P", "W": "W", "kW": "W", "C": "K", "K": "K", "F": "K"}
def sigfigs(s):
    s = s.strip().lower()
    if "e" in s:
        s = s.split("e")[0]
    s = s.replace("-", "").replace("+", "")
    digits = s.replace(".", "")
    if "." in s:
        digits = digits.lstrip("0")
    else:
        digits = digits.strip("0")
    return max(1, len(digits))
def round_sf(x, n):
    if x == 0:
        return 0.0
    d = int(floor(log10(abs(x)))) + 1
    return round(x, n - d)
print("1: convert units")
print("2: count sig figs")
print("3: round to n sig figs")
m = int(input("Choose 1-3: "))
if m == 1:
    print("Units: m cm mm km in ft | kg g mg lb")
    print("s ms min h | m/s km/h | J kJ kWh cal")
    print("Pa kPa atm | W kW | C K F")
    x = eval(input("value: "))
    a = input("from unit: ").strip()
    b = input("to unit: ").strip()
    if a not in KIND or b not in KIND or KIND[a] != KIND[b]:
        print("Units do not match.")
    elif KIND[a] == "K":
        if a == "C":
            c = x
        elif a == "K":
            c = x - 273.15
        else:
            c = (x - 32) * 5 / 9
        if b == "C":
            y = c
        elif b == "K":
            y = c + 273.15
        else:
            y = c * 9 / 5 + 32
        print(str(x) + " " + a + " = " + str(round(y, 6)) + " " + b)
    else:
        y = x * F[a] / F[b]
        print(str(x) + " " + a + " x " + str(F[a]) + " / " + str(F[b]))
        print("= " + str(y) + " " + b)
elif m == 2:
    s = input("number as typed, e.g. 0.00450: ")
    print("Significant figures: " + str(sigfigs(s)))
else:
    x = eval(input("number: "))
    n = int(input("sig figs: "))
    print(round_sf(x, n))
