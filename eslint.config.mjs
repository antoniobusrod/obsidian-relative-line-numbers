import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  globalIgnores(["main.js", "node_modules"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs"],
        },
      },
    },
  },
  {
    // Build scripts run in Node, not in the Obsidian app.
    files: ["*.mjs"],
    languageOptions: { globals: globals.node },
    rules: { "obsidianmd/no-nodejs-modules": "off" },
  },
]);
