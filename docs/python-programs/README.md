# Calculator Python programs

Plain `.py` files for the TI-Nspire CX II (Maths Methods, Physics, Systems Engineering). Open one, select all, copy,
and paste it into a Python page in the TI-Nspire software (or into CAS OS: Add page > TI-Nspire file (advanced) > Add Python script).

binom, normal, clt, deriv, limit, poly (Methods) | kinematics, projectile, circuits, units (Physics) |
electrical, transistor, mechanical, logic, pid (Systems) | quiz, working (all)

They are tested in CPython (`npm test`) against known answers, but not yet on a calculator. They avoid f-strings and
math.comb/erf so they should also run on the calculator's MicroPython. Plots use `ti_plotlib` and are skipped if it is missing.
