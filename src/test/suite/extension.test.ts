import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { commands, ConfigurationTarget, window, workspace } from "vscode";
import { Patterns } from "../../extension";

describe("Alternate", () => {
  window.showInformationMessage("Start all tests.");

  afterEach(() => clearConfig());

  // TODO: add test for multiple path alternate files (/src/file.test.ts and /test/file.test.ts)
  // TODO: add test for jumping back to original file (file.ts -> file.test.ts -> file.ts)
  // TODO: add test to avoid jumping back to original file when current open text document has changed
  // TODO: add test for key binding configuration
  // TODO: add test for multiple alternate files fast switching (alt + a, alt + 1)
  // TODO: add test for bi-directional alternate (file.test.ts -> file.ts)
  // TODO: add test for invalid configuration (regex)

  context("when alternate.patterns config is missing", () => {
    it("should no throw", async () => {
      await commands.executeCommand("alternate.run");
    });
  });

  context("when alternate.patterns main regex is invalid", () => {
    it("should not throw", async () => {
      await setConfig<Patterns>("alternate.patterns", [
        { main: "\\", alternates: [] },
      ]);
      await commands.executeCommand("alternate.run");
    });
  });

  it("switches to file.test.ts", async function () {
    await setConfig<Patterns>("alternate.patterns", [
      {
        main: "(.*).(js)$",
        alternates: ["$1.test.$2"],
      },
    ]);
    const [file] = await workspace.findFiles("alternate/file.js");
    assert.strictEqual(Boolean(file), true);
    const document = await workspace.openTextDocument(file);
    await window.showTextDocument(document);
    assert.strictEqual(window.activeTextEditor?.document.fileName, file.path);
    await commands.executeCommand("alternate.run");
    const [testFile] = await workspace.findFiles("alternate/file.test.js");
    assert.strictEqual(Boolean(testFile), true);
    assert.strictEqual(
      window.activeTextEditor?.document.fileName,
      testFile.path
    );
  });

  it("multiple: switches to file.integration.test.ts", async function () {
    const config = workspace.getConfiguration();
    await config.update(
      "alternate.patterns",
      [
        {
          main: "(.*).js$",
          alternates: ["$1.unit.test.js", "$1.integration.test.js"],
        },
      ],
      ConfigurationTarget.Global
    );
    const [file] = await workspace.findFiles("multiple/file.js");
    assert.strictEqual(Boolean(file), true);
    const document = await workspace.openTextDocument(file);
    await window.showTextDocument(document);
    assert.strictEqual(window.activeTextEditor?.document.fileName, file.path);
    (window.showQuickPick as any) = function () {
      return Promise.resolve("file.integration.test.js");
    };
    await commands.executeCommand("alternate.run");
    const [testFile] = await workspace.findFiles(
      "multiple/file.integration.test.js"
    );
    assert.strictEqual(Boolean(testFile), true);
    assert.strictEqual(
      window.activeTextEditor?.document.fileName,
      testFile.path
    );
  });

  it("fallback: switches to file.unit.test.ts", async function () {
    const config = workspace.getConfiguration();
    await config.update(
      "alternate.patterns",
      [
        {
          main: "(.*).js$",
          alternates: ["$1.unit.test.js", "$1.integration.test.js"],
        },
      ],
      ConfigurationTarget.Global
    );
    const [file] = await workspace.findFiles("multiple/file.js");
    assert.strictEqual(Boolean(file), true);
    const document = await workspace.openTextDocument(file);
    await window.showTextDocument(document);
    assert.strictEqual(window.activeTextEditor?.document.fileName, file.path);
    (window.showQuickPick as any) = function () {
      return Promise.resolve(undefined);
    };
    await commands.executeCommand("alternate.run");
    const [testFile] = await workspace.findFiles("multiple/file.unit.test.js");
    assert.strictEqual(Boolean(testFile), true);
    assert.strictEqual(
      window.activeTextEditor?.document.fileName,
      testFile.path
    );
  });
});

async function setConfig<T>(key: string, value: T) {
  const config = workspace.getConfiguration();
  await config.update(key, value, ConfigurationTarget.Global);
}

async function clearConfig() {
  await setConfig("alternate.patterns", []);
}
