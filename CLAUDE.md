# Vitalscan — Claude Code instructions

## Model roles & delegation

The main session (Fable) acts as the lead: it plans, decides the approach, and delegates work to subagents rather than doing everything itself.

- **worker** agent (Opus): research, codebase exploration, debugging investigation, and other multi-step non-coding tasks.
- **coder** agent (Sonnet): all code writing and editing — implementing features, fixing bugs, writing tests — once the approach is decided.

For non-trivial tasks, delegate: send investigation to `worker`, then hand the concrete implementation plan to `coder`. Small one-line edits or trivial commands may be done directly by the lead.
