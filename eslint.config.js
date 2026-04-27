import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".claude/**", "supabase/.temp/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Codebase is intentionally loose-typed (tsconfig has noImplicitAny: off,
      // strictNullChecks: off). Downgrade pre-existing style debt to warnings
      // so CI doesn't fail — fix opportunistically, not in bulk.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "react-hooks/rules-of-hooks": "warn",
    },
  },

  // ─── Editor adapter boundary (Phase 0) ────────────────────────────────
  // Fabric.js may only be imported from `src/features/editor/adapter/`.
  // Every other surface goes through the EditorAdapter interface (see
  // `src/features/editor/adapter/EditorAdapter.ts`).
  //
  // Patterns covered: static imports, namespace imports, dynamic
  // `import('fabric')`, `require('fabric')`, and re-exports.
  //
  // The legacy paths in `ignores` below are pre-existing fabric users
  // that pre-date the adapter pattern. They are tracked for migration
  // (see `src/features/editor/core/README.md` §3 — adoption status).
  // This list MUST shrink as editors migrate to the adapter; never add
  // new entries.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/features/editor/adapter/**",
      // Legacy editor surfaces — must shrink, never grow.
      "src/features/design-ai/**",
      "src/features/logo-maker/flow/**",
      "src/features/brandkit/components/editor/**",
      "src/features/editor/components/**",
      "src/shared/templates/renderers/FabricRenderer.ts",
      // The `[slug]` segment is glob-special; use ** to match the literal route folder.
      "src/pages/dashboard/brand/**/design-ai.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "fabric",
              message:
                "Import from `@/features/editor/adapter` instead. Fabric.js is an implementation detail of the EditorAdapter — see src/features/editor/adapter/EditorAdapter.ts. Covers static imports, namespace imports, dynamic import('fabric'), and re-exports.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='require'][arguments.0.value='fabric']",
          message:
            "require('fabric') is forbidden outside src/features/editor/adapter/. Use the EditorAdapter interface.",
        },
        {
          selector: "ImportExpression[source.value='fabric']",
          message:
            "Dynamic import('fabric') is forbidden outside src/features/editor/adapter/. Use the EditorAdapter interface.",
        },
      ],
    },
  },
);
