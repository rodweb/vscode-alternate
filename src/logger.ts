import { window, workspace } from "vscode";

export class Logger {
  private enabled = Boolean(
    workspace.getConfiguration("alternate").get("debug")
  );
  private channel = window.createOutputChannel("Alternate");

  log(message: string) {
    if (this.enabled) {
      this.channel.appendLine(message);
    }
  }
}
