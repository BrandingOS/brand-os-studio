---
name: Push and notify after finishing work
description: Always push to main on GitHub and send a push notification after completing any task
type: feedback
---

After finishing any work:
1. Push to GitHub on the main branch
2. Send a push notification to the user that the work is done

**Why:** User may be offline/asleep. They want completed work on the remote repo immediately and a notification so they know to check.

**How to apply:** After any implementation task is complete and verified (build passes, no errors), run `git add`, `git commit`, `git push origin main`, then use the RemoteTrigger or notification mechanism to alert the user. Never ask for confirmation before pushing or notifying.
