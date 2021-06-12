// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Uri } from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "alternate" is now active!');

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      console.log(`Current file changed: ${editor.document.fileName}`);
    }
  });

  interface Pattern {
    main: string;
    alternates: string[];
  }

  type Patterns = Pattern[];

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "alternate.helloWorld",
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const editor = vscode.window.activeTextEditor;
      const fileName = editor?.document.fileName || "";
      const config = vscode.workspace.getConfiguration("alternate");
      const patterns = config.inspect<Patterns>("patterns")?.globalValue;
      if (!patterns) {
        return;
      }
      const mapping = new Map(
        patterns.map(({ main, alternates }) => [new RegExp(main), alternates])
      );
      if (fileName) {
        for (const re of mapping.keys()) {
          const match = fileName.match(re);
          if (match) {
            console.log(match);
            const replacements = mapping.get(re);
            if (replacements) {
              const alternates = replacements.map((replacement) =>
                match
                  .slice(1)
                  .reduce((xs, x, i) => xs.replace(`$${i + 1}`, x), replacement)
              );
              console.log(alternates);

              const exists = (file: string) =>
                new Promise<string | null>((resolve, reject) =>
                  fs.stat(file, (err, stats) => {
                    if (err) {
                      resolve(null);
                    } else {
                      resolve(file);
                    }
                  })
                );

              const existing = (
                await Promise.all(alternates.map(exists))
              ).filter(Boolean) as string[];
              if (existing.length === 0) {
                console.log("Alternate files not found");
                const prev = context.globalState.get<string>("prev");
                if (prev) {
                  const doc = await vscode.workspace.openTextDocument(
                    Uri.file(prev)
                  );
                  await vscode.window.showTextDocument(doc);
                  context.globalState.update("prev", undefined);
                } else {
                  console.log("Previous doc not found");
                }
                continue;
              }

              if (existing.length > 1) {
                const picked = await vscode.window.showQuickPick(
                  existing.map((item) => path.basename(item))
                );
                console.log(`Picked: ${picked}`);
                if (picked) {
                  const baseToFilename = new Map(
                    existing.map((item) => [path.basename(item), item])
                  );
                  const file = baseToFilename.get(picked)!;
                  await switchToFile(context, file);
                  return;
                }
              }
              for (const file of existing) {
                if (!file) {
                  continue;
                }
                await switchToFile(context, file);
                break;
              }
            } else {
              console.log("Replacement not found");
            }
          } else {
            console.log("Match not found");
          }
        }
      } else {
        console.log("Filename not found");
      }
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function switchToFile(context: vscode.ExtensionContext, file: string) {
  console.log(`Switching to file ${file}`);
  const prev = vscode.window.activeTextEditor?.document?.fileName;
  if (prev) {
    console.log("Setting previous doc");
    context.globalState.update("prev", prev);
  }
  const doc = await vscode.workspace.openTextDocument(Uri.file(file));
  await vscode.window.showTextDocument(doc);
}
