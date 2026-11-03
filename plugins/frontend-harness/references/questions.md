# Asking the user

How the plugin's skills ask questions. A skill says which questions to ask; this file says how. The "Questions" section of `modules/workflow/feature-workflow/all/.claude/rules/feature-workflow.md` says the same for projects: change both together.

- Every question that has answer options goes through `AskUserQuestion`, in the user's language, never as plain text at the end of a reply. That includes offers ("run setup now?") and what to do when something fails. Only a question with no sensible options stays in text.
- The tool takes 2–4 options per question, up to 4 questions per call, a header of at most 12 characters and a label of 1–5 words; headers are plain words in the user's language, not abbreviations ("Швидкодія", not "React perf"). It adds "Other" itself; do not add one.
- More options or questions than fit: split them evenly over more questions or calls (5: 3 and 2), so no question is left with one option. Never merge two items into one option to make them fit.
- Picking any number from a list (modules, findings): `multiSelect: true`, one option per item.
- Choosing one of several ways (a framework, how to fix): `multiSelect: false`, the recommended option first with "(recommended)" after its label. Offer only ways a reasonable person could really pick; never make one up to fill the question. With one sensible way, do not ask how.
- One item on its own: `multiSelect: false` with "Fix" (or what will happen) and "Skip".
- The dialog may hide what you wrote before it: each question names what it is about, and each option says enough to decide without the chat.
