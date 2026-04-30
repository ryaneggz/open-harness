---
title: "Skills"
sidebar_position: 5
---


The Slack bot can create and use custom CLI tools called skills. Skills are stored as directories containing a `SKILL.md` file with usage instructions and any supporting scripts.

## Scope

Skills can be defined at two locations, giving you control over availability across channels.

| Location | Scope |
|----------|-------|
| `skills/` | Global -- available in all channels |
| `<channel-id>/skills/` | Channel-specific -- only available in that channel |

When the bot responds to a message, it is given the names, descriptions, and file paths of all available skills from both locations. It reads the full `SKILL.md` only when it decides to use a particular skill, keeping context lean for requests that do not need it.

## SKILL.md format

Each skill directory contains a `SKILL.md` file. The file uses YAML frontmatter to define the skill's name and a brief description, followed by full usage instructions in the body.

```markdown
---
name: gmail
description: Read, search, and send Gmail via IMAP/SMTP
---

# Gmail Skill
...usage instructions...
```

Use `{baseDir}` as a placeholder for the skill's directory path in any commands or script invocations within the usage instructions. The bot substitutes the real path at runtime.

## Creating skills

You can ask the bot to create skills for your workflows. For example:

> "Create a skill that lets me manage a simple notes file"

The bot creates a `SKILL.md` with usage instructions and any supporting scripts (e.g., `note.sh`). It also installs standard CLI tools as needed — GitHub CLI, npm packages, and similar dependencies — without requiring manual setup.

An example `SKILL.md` the bot might produce:

```markdown
---
name: note
description: Add and read notes from a persistent notes file
---

# Note Skill

Add a note:
\`\`\`bash
bash {baseDir}/note.sh add "Buy groceries"
\`\`\`

Read all notes:
\`\`\`bash
bash {baseDir}/note.sh read
\`\`\`
```

Along with the `SKILL.md`, the bot writes the backing script — in this case `note.sh` — so the skill is immediately usable. Once created, the skill is available for any future request in its configured scope without re-explaining how it works.
