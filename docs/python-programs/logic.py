# Truth table and simplified Boolean expression (Systems Engineering)
print("Variables A B C D (up to 4).")
print("Use: and  or  not  ^ (XOR)")
print("e.g.  (A and B) or not C")
ex = input("F = ")
vs = []
for ch in "ABCD":
    if ch in ex:
        vs.append(ch)
n = len(vs)
def F(bits):
    env = {}
    for i in range(n):
        env[vs[i]] = bool(bits[i])
    return int(bool(eval(ex, {}, env)))
rows = []
for i in range(2 ** n):
    bits = []
    for j in range(n):
        bits.append((i >> (n - 1 - j)) & 1)
    rows.append((bits, F(bits)))
print(" ".join(vs) + " | F")
for bits, f in rows:
    print(" ".join([str(b) for b in bits]) + " | " + str(f))
mins = []
for i in range(len(rows)):
    if rows[i][1]:
        mins.append(i)
print("Minterms: " + str(mins))
def pi_list(mins, n):
    terms = []
    for m in mins:
        terms.append((m, 0))
    primes = []
    cur = terms
    while cur:
        used = []
        nxt = []
        for i in range(len(cur)):
            for j in range(i + 1, len(cur)):
                a, ma = cur[i]
                b, mb = cur[j]
                if ma == mb:
                    d = a ^ b
                    if d and (d & (d - 1)) == 0:
                        t = (a & b, ma | d)
                        if t not in nxt:
                            nxt.append(t)
                        if cur[i] not in used:
                            used.append(cur[i])
                        if cur[j] not in used:
                            used.append(cur[j])
        for t in cur:
            if t not in used and t not in primes:
                primes.append(t)
        cur = nxt
    return primes
def covers(p, m):
    return (m & ~p[1]) == p[0]
def text(p):
    s = ""
    for i in range(n):
        bit = 1 << (n - 1 - i)
        if not (p[1] & bit):
            s += vs[i] if (p[0] & bit) else vs[i] + "'"
    return s if s else "1"
if len(mins) == 0:
    print("F = 0")
elif len(mins) == 2 ** n:
    print("F = 1")
else:
    primes = pi_list(mins, n)
    chosen = []
    left = list(mins)
    for m in mins:
        c = [p for p in primes if covers(p, m)]
        if len(c) == 1 and c[0] not in chosen:
            chosen.append(c[0])
    for p in chosen:
        left = [m for m in left if not covers(p, m)]
    while left:
        best = None
        bc = -1
        for p in primes:
            cnt = len([m for m in left if covers(p, m)])
            if cnt > bc:
                best = p
                bc = cnt
        chosen.append(best)
        left = [m for m in left if not covers(best, m)]
    print("Simplified (X' means NOT X):")
    print("F = " + " + ".join([text(p) for p in chosen]))
