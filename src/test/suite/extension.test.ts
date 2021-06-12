import * as assert from "assert";
import * as path from "path";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  // TODO: add test for single alternate (file.test.ts)
  // TODO: add test for multiple alternate files (file.unit.test.ts and file.integration.test.ts)
  // TODO: add test for multiple path alternate files (/src/file.test.ts and /test/file.test.ts)
  // TODO: add test for multiple alternate quick pick selection
  // TODO: add test for jumping back to original file (file.ts -> file.test.ts -> file.ts)
  // TODO: add test to avoid jumping back to original file when current open text document has changed
  // TODO: add test for regex patterns configuration
  // TODO: add test for key binding configuration
  // TODO: add test for multiple alternate files fast switching (alt + a, alt + 1)
  // TODO: add test for bi-directional alternate (file.test.ts -> file.ts)
  // TODO: add test for invalid configuration (regex)

  test("switches to file.test.ts", async function () {
    const config = vscode.workspace.getConfiguration();
    await config.update(
      "alternate.patterns",
      [
        {
          main: "(.*).(js)$",
          alternates: ["$1.test.$2"],
        },
      ],
      vscode.ConfigurationTarget.Global
    );
    const [file] = await vscode.workspace.findFiles("alternate/file.js");
    assert.strictEqual(Boolean(file), true);
    const document = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(document);
    assert.strictEqual(
      vscode.window.activeTextEditor?.document.fileName,
      file.path
    );
    await vscode.commands.executeCommand("alternate.helloWorld");
    const [testFile] = await vscode.workspace.findFiles(
      "alternate/file.test.js"
    );
    assert.strictEqual(Boolean(testFile), true);
    assert.strictEqual(
      vscode.window.activeTextEditor?.document.fileName,
      testFile.path
    );
  });
});
