import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,ts}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.node },
    },
    tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "no-extra-boolean-cast": "off",
        },
    },
    // server/ và client/ là package riêng (tsconfig strict + toolchain riêng), không lint bằng config của thư viện core
    globalIgnores(["dist/*", "server/**", "client/**", "docs/**"]),
]);
