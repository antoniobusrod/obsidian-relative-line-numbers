import { EventRef, Plugin } from "obsidian";
import { Extension } from "@codemirror/state";
import { lineNumbersRelative } from "./extension";

// Undocumented Vault API that Obsidian uses for its own editor settings.
declare module "obsidian" {
  interface Vault {
    getConfig(key: "showLineNumber"): boolean | undefined;
    on(name: "config-changed", callback: () => void): EventRef;
  }
}

interface Settings {
  enabled: boolean;
}

export default class RelativeLineNumbers extends Plugin {
  private editorExtension: Extension[] = [];
  settings: Settings = { enabled: true };

  async onload() {
    this.settings = { ...this.settings, ...((await this.loadData()) as Partial<Settings> | null) };
    this.registerEditorExtension(this.editorExtension);
    this.registerEvent(this.app.vault.on("config-changed", () => this.refresh()));

    this.addCommand({
      id: "toggle-relative-line-numbers",
      name: "Toggle",
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveData(this.settings);
        this.refresh();
      },
    });

    this.refresh();
  }

  // The extension replaces the formatter of Obsidian's own line number gutter,
  // so it must only be active while "Show line number" is on. Otherwise it
  // would add a gutter of its own.
  private refresh() {
    const active = this.settings.enabled && !!this.app.vault.getConfig("showLineNumber");
    if (active === this.editorExtension.length > 0) {
      return;
    }

    this.editorExtension.length = 0;
    if (active) {
      this.editorExtension.push(lineNumbersRelative());
    }
    this.app.workspace.updateOptions();
  }
}
