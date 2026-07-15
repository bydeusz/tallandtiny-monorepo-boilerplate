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
- **generate-docs** (`.claude/skills/project/skills/generate-docs/SKILL.md`) - after building a feature, write a thorough Fumadocs page (how it works, usage, dependencies) into the docs app (apps/docs), grounded in the real code, and ship it as a draft PR. Trigger: `/project:generate-docs`
When the user types `/project:generate-docs`, invoke the Skill tool with `skill: "project:generate-docs"` before doing anything else.

# project:clean-slate
- **clean-slate** (`.claude/skills/project/skills/clean-slate/SKILL.md`) - safely tear down the isolated git worktrees under .claude/worktrees/ and remove the docs/superpowers scratch folder, skipping any worktree that's active or holds unsaved/unpushed work. Trigger: `/project:clean-slate`
When the user types `/project:clean-slate`, invoke the Skill tool with `skill: "project:clean-slate"` before doing anything else.
