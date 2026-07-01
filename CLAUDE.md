# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Four standalone, single-file HTML applications ("Pandora") for a small math-tutoring workflow. There is no build system, no package.json, no bundler, and no test suite — each file is plain HTML/CSS/vanilla JS (no React, no framework) that a teacher or student opens directly in a browser.

- **pandora_main.html** — Teacher tool: problem bank browser/editor + quiz generator. Picks grade/unit/problems, calls the Claude API to check problem consistency and suggest tags, then produces a JSON blob + a prompt template that the teacher copies and pastes into Claude.ai to have Claude generate the actual student-facing quiz HTML (that generated file is **not** part of this repo — it's downloaded/created externally each time).
- **pandora_grading.html** — Teacher tool: fetches student `submissions` from Supabase, lets the teacher grade each problem (✓正解/△式のみ/△計算ミス/✗不正解), red-pen-annotate the student's canvas answers, leave a handwritten teacher comment, run AI auto-grading, and view cross-submission analytics (per-student, per-unit, per-tag).
- **result_view.html** — Student-facing, **read-only** page. Takes `?id=<submission_id>`, fetches the matching `submissions` + `results` rows from Supabase, and renders the graded result (no editing, no writes).
- **text_themed.html** — A finished, self-contained printable worksheet (no Supabase/API calls at all). Not part of the data pipeline — just an example of the kind of static material the workflow produces.

## Commands

There is no build/lint/test tooling. Development is: edit the HTML file, open it in a browser, exercise the feature manually.

The one useful automated check is a **JS syntax check on the inline `<script>` block**, since a broken edit inside a giant string-concatenated `<script>` fails silently in the browser otherwise:

```bash
python3 -c "
import re
html = open('pandora_grading.html', encoding='utf-8').read()
scripts = re.findall(r'<script(?:(?! src=)[^>]*)>(.*?)</script>', html, re.S)
open('/tmp/_chk.js','w',encoding='utf-8').write(scripts[0])
"
node --check /tmp/_chk.js
```

Run this after any edit to `pandora_main.html`, `pandora_grading.html`, or `result_view.html` (each has exactly one non-`src` inline `<script>` block containing all of its logic).

## Architecture / data flow

```
pandora_main.html  --(copy JSON+prompt)-->  Claude.ai (external, manual)  --(download)-->  student_quiz_*.html
                                                                                                  |
                                                                                     (student fills in, clicks submit)
                                                                                                  v
                                                                                     Supabase `submissions` table
                                                                                                  |
                                                        +----------------------- read/write ------+
                                                        v                                          v
                                            pandora_grading.html (teacher)              result_view.html (student, read-only)
                                                        |
                                                        v
                                              Supabase `results` table
```

Because the quiz-generation → quiz-submission step happens outside this repo (via Claude.ai, per teacher-written prompts), **the actual submitted-data shape only exists in the generated quiz's `handleSubmit`, which nobody here can `grep`**. When adding features that read `submission_data`, always defensively fall back across the field-name variants that have shown up in practice (see below) rather than assuming one canonical shape.

### Supabase (shared across all four files)

Same project, same public/anon key, hardcoded identically in every file that needs it:
```js
const SUPABASE_URL = 'https://upmflhdbhbyzoeldrvvw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_...';
```
This is a Supabase *publishable* key — intentionally client-embedded, not a secret to scrub.

**There are no migration files in this repo.** Any new column referenced in JS (e.g. `red_pen_canvas`, `grade_result`, added in past sessions) must be added manually in the Supabase dashboard first, or the corresponding `POST`/insert will fail at runtime with no local way to catch it.

Known tables and the fields actually read/written by this codebase:
- `submissions`: `id`, `student_name`, `student_id`, `mode` (`domestic`|`overseas`), `subject`, `assignment_id`, `submitted_at` (⚠️ not `created_at` — that was a recurring bug fixed in this repo's history; always use `submitted_at` for timestamps), `submission_data` (jsonb: `{ problems: [...], kanji: [...], name_canvas }`).
- `results`: `submission_id`, `assignment_id`, `student_id`, `problem_id`, `problem_number`, `unit_name`, `chapter_name`, `level`, `tags`, `equation_correct`, `answer_correct`, `grade_result` (raw grade string, source of truth — `equation_correct`/`answer_correct` are a derived/legacy 2-boolean encoding that **cannot** distinguish all 4 grade states, so always prefer `grade_result` and fall back to the booleans only for rows saved before that column existed), `ai_feedback`, `teacher_canvas`, `red_pen_canvas` (`{equation, answer}` dataURLs), `teacher_verified`.

### Canonical grading states

The only four valid values for a graded problem, used consistently across `pandora_grading.html`, `pandora_main.html` (review-corner), and `result_view.html`:
```
'correct' | 'partial' (式のみ正解) | 'calc' (計算ミス) | 'incorrect'
```
Do not introduce ad-hoc variants (e.g. a past bug referenced a non-existent `'partial_calc'` in two places) — grep all four files for a state name before trusting it exists.

### Field-name inconsistencies to watch for

`submission_data.problems[i]` has shown up with **different field names depending on which part of the code produced it**:
- Quiz-submission shape (from generated quiz HTML, most common in practice): `id`/`problem_id`, `unit`, `chapter`, `level`, `question`, `answer`, `tags`, `equation_canvas`, `answer_canvas`.
- Review-corner regeneration shape (`generateReviewProblems` in `pandora_main.html`): `unit_name`, `diff` instead of `unit`/`level`.

`pandora_grading.html`'s analytics tab (`renderAnalytics`) reads `p.unit_name`/`p.unit_id`/`p.diff` — this matches the review-corner shape but **not** the everyday quiz-submission shape, so per-unit/per-difficulty breakdowns are known to under-populate for ordinary submissions. Grading and `problem_id` lookups elsewhere defensively use `p.problem_id || p.id` — follow that pattern for anything new.

### AI integration

- `pandora_main.html` calls the Anthropic API directly from the browser using a user-supplied key (`anthropic-dangerous-direct-browser-access: true` header). The key is entered once and kept in `localStorage` under `pandora_api_key` (see `getApiKey()`/`apiHeaders()`) — never committed, never sent anywhere but Anthropic. Model used is mostly `claude-haiku-4-5-20251001`, with `claude-sonnet-4-6` for a couple of heavier calls.
- `pandora_grading.html`'s `aiGrade()` (Claude Vision auto-grading of student canvas answers) is **intentionally left unimplemented**, not broken: it calls `https://api.anthropic.com/v1/messages` directly from the browser with **no `x-api-key` header**, because a direct browser call to the Claude Vision API hits CORS restrictions. Implementing this for real will require routing the call through a local server or proxy rather than calling `api.anthropic.com` straight from client JS — don't assume AI auto-grading works until that's built.

### Dead-code history

`pandora_main.html` used to contain an in-app quiz-HTML generator (`generateQuizHTML`/`buildBaseTemplate`/`buildCoreComponents`, ~300 lines of a React-based template string) that had zero call sites — the real workflow is the copy-JSON-and-paste-into-Claude.ai flow described above. It was removed. If similar large "build a whole page as a string" functions show up unreferenced, check call sites before assuming they're load-bearing.
