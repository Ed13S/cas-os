/*
 * TI-Nspire .tns constants (generated - do not edit by hand).
 *
 * These byte strings come from Luna (https://github.com/ndless-nspire/Luna,
 * Mozilla Public License 1.1, (C) Olivier Armand), the open-source tool that
 * builds .tns files which real TI-Nspire calculators accept:
 *   keystream       3DES keystream Luna XORs over the deflated XML (1024 blocks x 8 bytes)
 *   tienHeader      the 40-byte header Luna puts in front of every encrypted Problem XML
 *   defaultDocument Luna's stock Document.xml entry (already encrypted)
 *   luaHeader/Footer  the XML wrapper around a Lua script (a Lua-only TNS document)
 * All are base64.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TNS_CONSTANTS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  return {
    keystream:
    "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" +
    "UlbkkqE0NVDZ4+q5kMdNd3s=",
    tienHeader:
    "D87Y0oEGhluZ3aI92elL1DG7ULZNsykkcGBJOBww+JkAS5Jk5FjmvA==",
    defaultDocument:
    "D87Y0oEGhltKSsXOqRby1R2oL24AIvLwwaYGd01+psA68Fx0uqpEYM1Y5nDXQPacF9zwlHe/yt73AgnJYrFd7yL6UTeggZFI4YNN" +
    "rQgxLdDT4y1gqxPCmCvtOVsJJDmSLwx6TJV0kTsM9GDMcyfLB35/qReH4qyiO8ygxOOOifDAUZ/Cvs4oRcPUEZCm7FOg+1tGa0Gt" +
    "6VO7l9ux0mji9jYPJjZ1m+kfSK3pKWcAWBnDwBJ2oEpz87HTCRjWBt2XJFM+IqT7glB7fBKITn1BgP5ykimH6FxWcv8pFoxCW4ub" +
    "p9IIbdOY/5GpnvOTqC4csqlrat/2zi0VF85uwE+anA7fGY0t+mmfEdIgEuB5FAROYo8KKhhyWouAszyb1WdZS1FN4MM4KMPczTki" +
    "EoxAVQ==",
    luaHeader:
    "VElYQzAxMDAtMS4wPz48cHJvYiB4bWxucz0idXJuOlRJLlCoX1sfCiIgdmVyPSIxLjAiIHBibmFtZT0iIj48c3ltPg4BPGNhcmQg" +
    "Y2xheT0iMCIgaDE9IvEAAP8iIGgyPSLxAAD/IiB3MT0i8QAA/yIgdzI9IvEAAP8iPjxpc0R1bW15Q2FyZD4wDgM8ZmxhZz4wDgQ8" +
    "d2RndCB4bWxuczpzYz0idXJuOlRJLlOshPIqQXBwIiB0eXBlPSJUSS5TrITyKkFwcCIgdmVyPSIxLjAiPjxzYzptRmxhZ3M+MA4G" +
    "PHNjOnZhbHVlPi0xDgc8c2M6c2NyaXB0IHZlcnNpb249IjUxMiIgaWQ9IjAiPjwhW0NEQVRBWw==",
    luaFooter:
    "XV0+DggOBQ4CDgA=",
  };
});
