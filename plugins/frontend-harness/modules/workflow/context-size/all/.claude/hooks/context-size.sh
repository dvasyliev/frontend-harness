#!/bin/bash
# UserPromptSubmit hook: above LIMIT tokens, warns before every message that the
# session is big, since each message re-reads the whole context.
# Size = tokens of the last model call in the transcript.

LIMIT=200000
input=$(cat)
transcript=$(jq -r '.transcript_path // empty' <<<"$input")

tokens=0
if [ -f "$transcript" ]; then
  tokens=$(tail -n 300 "$transcript" \
    | jq -r 'select(.message.usage) | .message.usage
             | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)' 2>/dev/null \
    | tail -n 1)
fi
tokens=${tokens:-0}

if [ "$tokens" -gt "$LIMIT" ]; then
  jq -n --arg k "$((tokens / 1000))" --arg l "$((LIMIT / 1000))" \
    '{systemMessage: ("Session at " + $k + "K tokens (recommended under " + $l + "K): /compact or /clear.")}'
fi
exit 0
