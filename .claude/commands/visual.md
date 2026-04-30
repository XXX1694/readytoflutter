---
description: Open a route in Playwright, screenshot it, and check for visual/accessibility regressions
---

Visually verify a frontend route. Argument: a path like `/topic/widgets` (defaults to `/`).

Requires the Playwright MCP server (already configured in `.mcp.json`). If the dev server isn't running, suggest `/dev` first — don't auto-start it.

1. Navigate to `http://localhost:3000<path>` via Playwright MCP.
2. Take a screenshot at desktop (1280×800) and mobile (390×844) widths.
3. Check the accessibility tree for:
   - Missing alt text on images
   - Buttons/links without accessible names
   - Color-contrast issues on Codex tokens (ink/paper, brand on paper)
   - Focus traps or unreachable interactive elements
4. Report findings as a short bulleted list. Show the user the screenshots inline.

Do not modify code unless the user asks.
