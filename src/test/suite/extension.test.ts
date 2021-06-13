import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { commands, ConfigurationTarget, window, workspace } from "vscode";
import { Patterns } from "../../extension";

describe("Alternate", () => {
  window.showInformationMessage("Start all tests.");
  const originalQuickPickStub = window.showQuickPick;

  afterEach(() => clearConfig());
  afterEach(() => (window.showQuickPick = originalQuickPickStub.bind(window)));

  // TODO: add test to avoid jumping back to original file when current open text document has changed
  // TODO: add test for key binding configuration
  // TODO: add test for multiple alternate files fast switching (alt + a, alt + 1)
  // TODO: add test for bi-directional alternate (file.test.ts -> file.ts)

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

  context("when there is only one alternate file", () => {
    it("should switch to that file", async () => {
      await configureForSingleAlternate();
      await openFile("alternate/file.js");
      await expectFileToBeActive("alternate/file.js");
      await commands.executeCommand("alternate.run");
      await expectFileToBeActive("alternate/file.test.js");
    });

    context("and alternating again", () => {
      it("should jump back to the main file", async () => {
        await configureForSingleAlternate();
        await openFile("alternate/file.js");
        await commands.executeCommand("alternate.run");
        await expectFileToBeActive("alternate/file.test.js");
        await commands.executeCommand("alternate.run");
        await expectFileToBeActive("alternate/file.js");
      });
    });
  });

  context("when there are many alternate files", () => {
    it("should switch to the selected file", async () => {
      await configureForMultipleAlternates();
      await openFile("multiple/file.js");
      await expectFileToBeActive("multiple/file.js");
      setQuickPickStub(function () {
        return Promise.resolve("file.integration.test.js");
      });
      await commands.executeCommand("alternate.run");
      await expectFileToBeActive("multiple/file.integration.test.js");
    });

    it("should switch to the first match if no file is selected", async () => {
      await configureForMultipleAlternates();
      await openFile("multiple/file.js");
      await expectFileToBeActive("multiple/file.js");
      setQuickPickStub(function () {
        return Promise.resolve(undefined);
      });
      await commands.executeCommand("alternate.run");
      await expectFileToBeActive("multiple/file.unit.test.js");
    });
  });
});

async function expectFileToBeActive(file: string) {
  const [found] = await workspace.findFiles(file);
  assert.strictEqual(Boolean(found), true);
  assert.strictEqual(
    window.activeTextEditor?.document.fileName.endsWith(file),
    true
  );
}

async function openFile(file: string) {
  const [found] = await workspace.findFiles(file);
  if (!found) {
    return;
  }
  const document = await workspace.openTextDocument(found);
  await window.showTextDocument(document);
}

async function configureForSingleAlternate() {
  await setConfig<Patterns>("alternate.patterns", [
    {
      main: "(.*).(js)$",
      alternates: ["$1.test.$2"],
    },
  ]);
}

async function configureForMultipleAlternates() {
  await setConfig<Patterns>("alternate.patterns", [
    {
      main: "(.*).js$",
      alternates: ["$1.unit.test.js", "$1.integration.test.js"],
    },
  ]);
}

async function setQuickPickStub(stubFunction: Function) {
  (window.showQuickPick as any) = stubFunction;
}

async function setConfig<T>(key: string, value: T) {
  const config = workspace.getConfiguration();
  await config.update(key, value, ConfigurationTarget.Global);
}

async function clearConfig() {
  await setConfig("alternate.patterns", []);
}
