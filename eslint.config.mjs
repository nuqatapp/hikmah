import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/functions/hikmah-api/index.js",
    ".sites-runtime/**",
  ]),
  {
    files:["app/hikmah.tsx","backend/{game-route,index}.ts","components/hikmah/{admin,journey,leaderboard,lobby,play}.tsx","db/raw.ts","lib/game/service.ts"],
    rules:{"@typescript-eslint/no-explicit-any":"warn"},
  },
  {
    files:["app/hikmah.tsx","components/hikmah/{admin,auth-form,journey,leaderboard,lobby,play,storage-notice,use-locale}.tsx"],
    rules:{"react-hooks/set-state-in-effect":"warn","react-hooks/purity":"warn"},
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      // These components come from the shadcn registry. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
