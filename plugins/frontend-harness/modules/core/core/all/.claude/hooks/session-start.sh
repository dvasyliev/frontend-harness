#!/usr/bin/env bash
# Tells Claude the project state when a session starts.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "Project state at session start:"

# The dev server port: PORT if set, else the framework default from .claude/harness.json.
port=${PORT:-$(jq -r '.port // 3000' .claude/harness.json 2>/dev/null || echo 3000)}

# Warn if packages are not installed.
if [ -f package.json ] && [ ! -d node_modules ]; then
  echo "- WARNING: dependencies are not installed. Install them first."
else
  echo "- Dependencies: installed."
fi

# Warn if a dev server already runs, so Claude does not start a second one.
if nc -z localhost "$port" >/dev/null 2>&1; then
  echo "- WARNING: a dev server is already running on port $port. Do not start another one."
else
  echo "- Dev server: port $port is free."
fi

# Count uncommitted changes, so Claude does not overwrite them.
changed=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "- Uncommitted files: $changed. Do not discard or overwrite them."

exit 0
