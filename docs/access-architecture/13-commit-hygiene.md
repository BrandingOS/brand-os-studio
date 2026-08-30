# Access Architecture — 13 · Commit Hygiene Note

Two commits on this branch used `git add -A` and swept in work that was ALREADY
uncommitted in the working tree when the branch was created (it came from the
`feat/brand-kit-simplification` session: the image-eval harness, imagePrompt changes,
the Generate panel, CLAUDE.md edits).

**Nothing was altered or lost** — every swept file is byte-identical to what was in the
tree. The only cost is reviewability: these files sit under commit messages about
security work. History has deliberately NOT been rewritten.

## 16cfafd9 — `fix(security): type-safe error reason…`
```
CLAUDE.md
evals/image/README.md
evals/image/record.ts
evals/image/run.ts
evals/image/runs/.gitignore
evals/image/runs/ab-fix/images/post-with-copy--google_nano-banana--candidate.jpg
evals/image/runs/ab-fix/prompts.md
evals/image/runs/ab-fix/records.jsonl
evals/image/runs/ab-fix/summary.json
evals/image/runs/ab-nano/images/ad-no-copy--google_nano-banana--baseline.jpg
evals/image/runs/ab-nano/images/ad-no-copy--google_nano-banana--candidate.jpg
evals/image/runs/ab-nano/images/post-with-copy--google_nano-banana--baseline.jpg
evals/image/runs/ab-nano/images/post-with-copy--google_nano-banana--candidate.jpg
evals/image/runs/ab-nano/prompts.md
evals/image/runs/ab-nano/records.jsonl
evals/image/runs/ab-nano/summary.json
evals/image/runs/diversity/images/candidate-1.jpg
evals/image/runs/diversity/images/candidate-2.jpg
evals/image/score/heuristic.ts
evals/image/tasks/ab.json
evals/image/tasks/default.json
evals/image/transport.ts
geom.json
src/shared/ai/anthropicProxy.ts
```

## 369142a7 — `feat(edge): an authz kernel…`
```
src/core/adapters/preferences/__tests__/preferencesShape.test.ts
src/core/adapters/preferences/preferencesShape.ts
src/core/types/services.ts
src/features/editor/__tests__/e2e/aiImageStudio.flows.browser.test.tsx
src/features/editor/__tests__/e2e/aiModes.flows.browser.test.tsx
src/features/editor/ai/imagePrompt/artDirection.test.ts
src/features/editor/ai/imagePrompt/artDirection.ts
src/features/editor/ai/imagePrompt/brandImageContext.ts
src/features/editor/ai/imagePrompt/brandReferences.test.ts
src/features/editor/ai/imagePrompt/brandReferences.ts
src/features/editor/ai/imagePrompt/compileImagePrompt.test.ts
src/features/editor/ai/imagePrompt/compileImagePrompt.ts
src/features/editor/ai/imagePrompt/critique.test.ts
src/features/editor/ai/imagePrompt/critique.ts
src/features/editor/ai/imagePrompt/formatBriefs.ts
src/features/editor/ai/imagePrompt/variants.ts
src/features/editor/shell/v2/panels/generate/CountStepper.tsx
src/features/editor/shell/v2/panels/generate/GeneratePanel.tsx
src/features/editor/shell/v2/panels/generate/ReferenceStrip.tsx
src/features/editor/shell/v2/panels/generate/ResultsStrip.tsx
src/features/editor/shell/v2/panels/generate/TallSelect.tsx
src/features/editor/shell/v2/panels/generate/formats.ts
src/features/editor/shell/v2/panels/generate/generatePrefs.ts
src/features/editor/shell/v2/panels/generate/useImageGeneration.ts
src/features/logo-maker/components/AILogoSuggestions.tsx
src/features/onboarding/brief/__tests__/strategyCoverage.test.ts
src/features/onboarding/brief/parseBrief.ts
src/features/onboarding/brief/prompt.ts
src/features/onboarding/understanding/interpret.ts
src/pages/settings/preferences.tsx
src/shared/ai/anthropicProxy.ts
src/shared/preferences/preferenceBridge.ts
```

To split them later: `git rebase -i c29bc062~1`, edit those two commits, `git reset HEAD^`
the listed paths into their own commit. Requires a force-push of this branch.
