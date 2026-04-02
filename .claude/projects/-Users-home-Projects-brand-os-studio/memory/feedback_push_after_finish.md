---
name: Push and notify after finishing work
description: Always push to main on GitHub after completing work. Only send macOS notification when ALL work is fully complete, not after each milestone.
type: feedback
---

After finishing any work:
1. Push to GitHub on the main branch after each milestone
2. Do NOT send macOS push notifications (osascript) during work — they block the terminal
3. Only send ONE notification when the entire task is 100% complete and all pushes are done

**Why:** osascript display notification commands block the terminal and prevent the user from using it. Push frequently to GitHub but notify only once at the very end.

**How to apply:** Use `git commit && git push` freely. Only use `osascript -e 'display notification...'` as the absolute last action when everything is finished.
