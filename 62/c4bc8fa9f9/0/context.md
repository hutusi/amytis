# Session Context

## User Prompts

### Prompt 1

Please add some configuration for the RSS feed output, such as how many items to output, whether to use RSS, Atom, or both, and whether to output full text or an excerpt. and other configs. What do you think?

### Prompt 2

[Request interrupted by user for tool use]

### Prompt 3

I think full can be default.

### Prompt 4

Base directory for this skill: /Users/hutusi/.claude/skills/commit

Create a git commit for the current changes. Follow these steps:

1. Run these commands in parallel to understand the current state:
   - `git status` (never use -uall flag)
   - `git diff` to see both staged and unstaged changes
   - `git log --oneline -5` to see recent commit message style

2. Analyze all changes and draft a commit message:
   - Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,...

