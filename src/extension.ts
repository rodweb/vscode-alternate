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

  class GlobalState {
    static previousFile = "previousFile";
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "alternate.helloWorld",
    async () => {
      console.log("Running === >");
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const currentFile = vscode.window.activeTextEditor?.document.fileName;
      const config = vscode.workspace.getConfiguration("alternate");
      const patterns = config.inspect<Patterns>("patterns")?.globalValue;
      if (!patterns) {
        console.log("No patterns configured");
        return;
      }
      const patternsMap = new Map(
        patterns.map(({ main, alternates }) => [new RegExp(main), alternates])
      );
      if (!currentFile) {
        console.log("Current file not found");
        return;
      }
      for (const pattern of patternsMap.keys()) {
        const match = currentFile.match(pattern);
        if (!match) {
          console.log("Match not found");
          continue;
        }
        const replacements = patternsMap.get(pattern);
        if (!replacements) {
          console.log(`Replacaments not found for pattern ${pattern}`);
          continue;
        }
        const alternates = replacements.map((replacement) =>
          match.reduce((xs, x, i) => xs.replace(`$${i}`, x), replacement)
        );

        const alternateFiles = (
          await Promise.all(alternates.map(exists))
        ).filter(Boolean) as string[];
        if (alternateFiles.length === 0) {
          console.log("Multiple alternate files not found");
          const previousFile = getPreviousFile();
          if (previousFile) {
            console.log(`Found previous file ${previousFile}`);
            await switchToFile(previousFile);
            await clearPreviousFile();
          } else {
            console.log("Previous file not found");
          }
          continue;
        }

        // multiple options, show quick pick
        if (alternateFiles.length > 1) {
          const pickedFile = await vscode.window.showQuickPick(
            alternateFiles.map((item) => path.basename(item))
          );
          console.log(`Picked file ${pickedFile}`);
          if (pickedFile) {
            const baseToFilename = new Map(
              alternateFiles.map((item) => [path.basename(item), item])
            );
            const file = baseToFilename.get(pickedFile)!;
            await switchToFile(file);
            return;
          }
        }

        // select first file as fallback
        for (const file of alternateFiles) {
          if (!file) {
            continue;
          }
          await switchToFile(file);
          return;
        }
      }
    }
  );

  const getPreviousFile = () =>
    context.globalState.get<string>(GlobalState.previousFile);

  const updatePreviousFile = async () => {
    const file = vscode.window.activeTextEditor?.document?.fileName;
    if (file) {
      console.log(`Setting previous file to ${file}`);
      await context.globalState.update(GlobalState.previousFile, file);
    }
  };

  const clearPreviousFile = async () =>
    context.globalState.update(GlobalState.previousFile, undefined);

  const switchToFile = async (file: string) => {
    await updatePreviousFile();
    console.log(`Switching to file ${file}`);
    const doc = await vscode.workspace.openTextDocument(Uri.file(file));
    await vscode.window.showTextDocument(doc);
  };

  const exists = (file: string) =>
    new Promise<string | null>((resolve) =>
      fs.stat(file, (err) => {
        if (err) {
          resolve(null);
        } else {
          resolve(file);
        }
      })
    );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
