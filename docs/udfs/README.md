# Calculator UDFs (user-defined functions)

`udfs.txt` is one `Define` line per function. To use them:

1. Open a Calculator page in the TI-Nspire software (or on the handheld).
2. Copy a line (or all of them) from `udfs.txt` and paste it into the Calculator page, then press Enter.
   The function now works in that document: `disc(1,-5,6)` gives `1`.
3. To keep them for every document: save the document in the MyLib folder, then use
   Menu > Functions & Programs > Library > Refresh Libraries and call them as `docname\disc(1,-5,6)`.

| Group | Functions |
|---|---|
| Methods | disc, qroot1, qroot2, vertx, verty, zscore, xfromz, binmean, binsd, rsf (round to n sig figs) |
| Physics | vfin, sdist, vsol, ke, pe, range_ / maxh / tflight (angle in degrees), rser, rpar, efield, gfield |
| Systems | ohmv, ohmi, pwr, vdiv, tau, vcharge, tcharge, rled, ibase, rbase, darl, gearr, rpmout, torq, pwrrot, ma |

Angles in `range_`, `maxh` and `tflight` are degrees. `g` is 9.8. Each formula is checked on a computer
(`npm test`) but the lines have not been pasted into a real calculator yet. If one is rejected, tell me which and I'll fix it.
