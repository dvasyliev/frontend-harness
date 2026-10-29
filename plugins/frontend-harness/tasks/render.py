# Fills in the Jinja of the files apply.mjs copies with `render: true`.
# Reads {"context": {...}, "files": {"<id>": "<path>"}} on stdin, prints {"<id>": "<text>"}.
import json
import sys

from jinja2 import Environment

request = json.load(sys.stdin)
env = Environment(keep_trailing_newline=True)
out = {}
for key, path in request["files"].items():
    with open(path, encoding="utf-8") as f:
        out[key] = env.from_string(f.read()).render(**request["context"])
json.dump(out, sys.stdout)
