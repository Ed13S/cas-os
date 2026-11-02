"""Runs a calculator Python program under CPython with scripted input() and returns its output.
usage: pyrun.py program.py "line1|line2|..."   (stubs ti_plotlib so plotting calls are recorded)"""
import sys, io, builtins, types, runpy, contextlib
prog, inputs = sys.argv[1], sys.argv[2].split("|") if len(sys.argv) > 2 and sys.argv[2] != "" else []
it = iter(inputs)
def fake_input(prompt=""):
    try:
        v = next(it)
    except StopIteration:
        raise SystemExit("OUT OF INPUT at prompt: " + prompt)
    print(prompt + v)
    return v
builtins.input = fake_input
plt = types.ModuleType("ti_plotlib")
for name in ("cls", "auto_window", "axes", "title", "plot", "show_plot", "window", "line", "scatter", "grid"):
    setattr(plt, name, (lambda n: (lambda *a, **k: print("[plot:" + n + "]")))(name))
sys.modules["ti_plotlib"] = plt
sys.argv = [prog]
runpy.run_path(prog, run_name="__main__")
