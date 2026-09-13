---
title: 🏗️ VS Code Workspace
tagline: How to set up a workspace in vs code
---

## The correct solution: Multi-root workspace

You keep opening `Src`, but VS Code internally treats each repo as its own root with its own interpreter.

This is exactly what multi-root workspaces are for.

### 1. Create a workspace folder in `Src/`

From VS Code (WSL Session):

```text
File -> Save Workspace As...
```

Save it as:

```text
Src.code-workspace
```

Location:

```text
~/Src/Src.code-workspace
```

### 2. Define each repo as a workspace folder

Edit `Src.code-workspace` like this:

```json
{
  "folders": [
    {"path": "automation-hub-2.0"},
    {"path": "repo-b"},
    {"path": "repo-c"},
  ]
}
```