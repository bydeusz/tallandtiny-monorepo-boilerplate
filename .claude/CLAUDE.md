# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# project:create-story
- **create-story** (`.claude/skills/project/skills/create-story/SKILL.md`) - turn a feature or bug described in chat into a researched Trello ticket in the Backlog. Trigger: `/project:create-story`
When the user types `/project:create-story`, invoke the Skill tool with `skill: "project:create-story"` before doing anything else.

# project:start-ticket
- **start-ticket** (`.claude/skills/project/skills/start-ticket/SKILL.md`) - pull a named ticket from Trello, move it to To Do, stamp this chat on the card, and set up a branch (or hand off to superpowers for a worktree) before development. Trigger: `/project:start-ticket`
When the user types `/project:start-ticket`, invoke the Skill tool with `skill: "project:start-ticket"` before doing anything else.

# project:test-ticket
- **test-ticket** (`.claude/skills/project/skills/test-ticket/SKILL.md`) - verify a built ticket end-to-end with the Playwright MCP: a scenario-writer, runner, and fixer agent loop the ticket's acceptance criteria to all-green. Trigger: `/project:test-ticket`
When the user types `/project:test-ticket`, invoke the Skill tool with `skill: "project:test-ticket"` before doing anything else.

# project:generate-docs
- **generate-docs** (`.claude/skills/project/skills/generate-docs/SKILL.md`) - after building a feature, write a thorough Fumadocs page (how it works, usage, dependencies) in plain language non-coders can follow, grounded in the real code, in every language the docs app is configured for (English + Dutch — one `<slug>.mdx` + `<slug>.nl.mdx`), and ship it as a draft PR. Trigger: `/project:generate-docs`
When the user types `/project:generate-docs`, invoke the Skill tool with `skill: "project:generate-docs"` before doing anything else.

# project:update-docs
- **update-docs** (`.claude/skills/project/skills/update-docs/SKILL.md`) - reconcile existing Fumadocs pages with code that has since drifted: audit every page, re-verify each claim against current code (grounding in reverse), patch only the stale spans in place (both language siblings in lockstep, `last-updated` bumped on changed pages only), defer undocumented features to generate-docs, and ship the diffs as a draft PR. Trigger: `/project:update-docs`
When the user types `/project:update-docs`, invoke the Skill tool with `skill: "project:update-docs"` before doing anything else.

# project:clean-slate
- **clean-slate** (`.claude/skills/project/skills/clean-slate/SKILL.md`) - tear down git worktrees (you pick which from a numbered list showing each worktree's status/warning — including worktrees that are in use) and remove the superpowers folders (tracked docs/superpowers via git rm + gitignored .superpowers scratch via rm -rf), never touching the current session's own worktree and never force-removing without a per-item warning. Trigger: `/project:clean-slate`
When the user types `/project:clean-slate`, invoke the Skill tool with `skill: "project:clean-slate"` before doing anything else.
