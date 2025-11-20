import * as vscode from 'vscode';
import { addManifoldTypesComment, isTypeInjectionEnabledForFile } from './utils';

export function registerManifoldTypes(context: vscode.ExtensionContext) {
  // Only generate .vscode/manifold-types.d.ts when a .mfc or .manifoldcad file is opened
  async function ensureManifoldTypesFile() {
    const wsFolders = vscode.workspace.workspaceFolders;
    if (wsFolders && wsFolders.length > 0) {
      const wsRoot = wsFolders[0].uri;
      const vscodeDir = vscode.Uri.joinPath(wsRoot, '.vscode');
      const manifoldCADTypes = vscode.Uri.joinPath(context.extensionUri, 'media', 'types', 'manifoldCAD.d.ts');
      const manifoldCADGlobalTypes = vscode.Uri.joinPath(context.extensionUri, 'media', 'types', 'manifoldCADGlobal.d.ts');
      const topLevelTypeFile = vscode.Uri.joinPath(vscodeDir, 'manifold-types.d.ts');

      try {
        // Create .vscode dir if it doesn't exist
        try {
          await vscode.workspace.fs.stat(vscodeDir);
        } catch {
          await vscode.workspace.fs.createDirectory(vscodeDir);
        }
        // Only write if file doesn't exist
        let fileExists = false;
        try {
          await vscode.workspace.fs.stat(topLevelTypeFile);
          fileExists = true;
        } catch { }
        if (!fileExists) {
          // Generate types file
          let manifoldCAD = '', manifoldCADGlobal = '';
          const decoder = new TextDecoder('utf-8');
          try { manifoldCAD = decoder.decode(await vscode.workspace.fs.readFile(manifoldCADTypes)); } catch (e) { console.log(e); }
          try { manifoldCADGlobal = decoder.decode(await vscode.workspace.fs.readFile(manifoldCADGlobalTypes)); } catch (e) { console.log(e); }

          manifoldCAD = manifoldCAD.replace(/^export /gm, '');
          manifoldCAD += '\n';
          manifoldCAD += manifoldCADGlobal.replace(/^export /gm, '');

          await vscode.workspace.fs.writeFile(topLevelTypeFile, new TextEncoder().encode(manifoldCAD));
        }
      } catch (err) {
        vscode.window.showErrorMessage('Failed to set up Manifold types: ' + err);
      }
    }
  }

  // On open, if .mfc/.manifoldcad, ensure type file and auto-insert triple-slash reference if missing
  vscode.workspace.onDidOpenTextDocument(async (doc: vscode.TextDocument) => {
    if (isTypeInjectionEnabledForFile(doc.fileName)) {
      await ensureManifoldTypesFile();
      addManifoldTypesComment(doc);
    }
  });

  // On save, ensure triple-slash reference is present (and type file exists)
  vscode.workspace.onDidSaveTextDocument(async (doc: vscode.TextDocument) => {
    if (isTypeInjectionEnabledForFile(doc.fileName)) {
      await ensureManifoldTypesFile();
      addManifoldTypesComment(doc);
    }
  });
}
