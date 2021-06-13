// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { workspace, window, commands, ExtensionContext } from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Uri } from "vscode";

interface Pattern {
  main: string;
  alternates: string[];
}

export type Patterns = Pattern[];

class GlobalState {
  static previousFile = "previousFile";
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  const logger = new Logger();

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        logger.log(`Current file changed: ${editor.document.fileName}`);
      }
    })
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = commands.registerCommand("alternate.run", async () => {
    logger.log("Running === >");
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    const currentFile = window.activeTextEditor?.document.fileName;
    logger.log("currentFile ok");
    const config = workspace.getConfiguration("alternate");
    logger.log("config ok");
    const patterns = config.inspect<Patterns>("patterns")?.globalValue;
    logger.log("patterns ok");
    if (!patterns) {
      logger.log("No patterns configured");
      return;
    }
    const validPatterns = patterns.filter((pattern) => {
      try {
        return Boolean(new RegExp(pattern.main));
      } catch (error) {
        logger.log(error);
        return false;
      }
    });
    const patternsMap = new Map(
      validPatterns.map(({ main, alternates }) => [
        new RegExp(main),
        alternates,
      ])
    );
    logger.log("pattern map ok");
    if (!currentFile) {
      logger.log("Current file not found");
      return;
    }
    for (const pattern of patternsMap.keys()) {
      const match = currentFile.match(pattern);
      if (!match) {
        logger.log("Match not found");
        continue;
      }
      const replacements = patternsMap.get(pattern);
      if (!replacements) {
        logger.log(`Replacaments not found for pattern ${pattern}`);
        continue;
      }
      const alternates = replacements.map((replacement) =>
        match.reduce((xs, x, i) => xs.replace(`$${i}`, x), replacement)
      );

      const alternateFiles = (await Promise.all(alternates.map(exists))).filter(
        Boolean
      ) as string[];
      if (alternateFiles.length === 0) {
        logger.log("Multiple alternate files not found");
        const previousFile = getPreviousFile();
        if (previousFile) {
          logger.log(`Found previous file ${previousFile}`);
          await switchToFile(previousFile);
          await clearPreviousFile();
        } else {
          logger.log("Previous file not found");
        }
        continue;
      }

      // multiple options, show quick pick
      if (alternateFiles.length > 1) {
        const pickedFile = await window.showQuickPick(
          alternateFiles.map((item) => path.basename(item))
        );
        logger.log(`Picked file ${pickedFile}`);
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
      await switchToFile(alternateFiles[0]);
    }
  });

  const getPreviousFile = () =>
    context.globalState.get<string>(GlobalState.previousFile);

  const updatePreviousFile = async () => {
    const file = window.activeTextEditor?.document?.fileName;
    if (file) {
      logger.log(`Setting previous file to ${file}`);
      await context.globalState.update(GlobalState.previousFile, file);
    }
  };

  const clearPreviousFile = async () =>
    context.globalState.update(GlobalState.previousFile, undefined);

  const switchToFile = async (file: string) => {
    await updatePreviousFile();
    logger.log(`Switching to file ${file}`);
    const doc = await workspace.openTextDocument(Uri.file(file));
    await window.showTextDocument(doc);
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

class Logger {
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
