import * as vscode from 'vscode';
import * as path from 'path';
import ts from 'typescript';

const manifoldTypeFile = 'manifold-types.d.ts';

/**
 * Generate a triple-slash reference to the types file, using a relative path from the doc's folder.
 */
export function generateManifoldTypesComment(doc: vscode.TextDocument): string {
  const wsFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
  if (!wsFolder) return '';
  const wsRoot = wsFolder.uri.fsPath;
  const typesFile = path.join(wsRoot, '.vscode', manifoldTypeFile);
  const docDir = path.dirname(doc.uri.fsPath);
  let relPath = path.relative(docDir, typesFile);
  // Always use forward slashes for triple-slash reference
  relPath = relPath.split(path.sep).join('/');
  return `/// <reference path="${relPath}" />`;
}

export const addManifoldTypesComment = async (doc: vscode.TextDocument) => {
  if ((doc.languageId === 'typescript' || doc.languageId === 'plaintext') && (doc.fileName.endsWith('.mfc') || doc.fileName.endsWith('.manifoldcad'))) {
    const tripleSlash = generateManifoldTypesComment(doc);
    const text = doc.getText();
    const hasTripleSlash = text.includes(tripleSlash);
    if (!hasTripleSlash) {
      // Remove any existing triple-slash references to manifold-types.d.ts
      const tripleSlashRegex = /^\s*\/\/\/\s*<reference\s+path=["'][^"']*manifold-types\.d\.ts["']\s*\/>(\r?\n)?/gm;
      let newText = text.replace(tripleSlashRegex, '');
      // Insert the new triple-slash at the top
      newText = tripleSlash + '\n\n' + newText.trimStart();
      const edit = new vscode.WorkspaceEdit();
      edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), newText);
      await vscode.workspace.applyEdit(edit);
      // Optionally, save the file after edit
      await doc.save();
    }
  }
}

// Ensure files.associations includes .mfc/.manifoldcad -> typescript
export async function ensureFileAssociations() {
  const config = vscode.workspace.getConfiguration();
  const associations = config.get<{ [key: string]: string }>('files.associations') || {};
  let changed = false;
  if (associations['*.mfc'] !== 'typescript') {
    associations['*.mfc'] = 'typescript';
    changed = true;
  }
  if (associations['*.manifoldcad'] !== 'typescript') {
    associations['*.manifoldcad'] = 'typescript';
    changed = true;
  }
  if (changed) {
    await config.update('files.associations', associations, vscode.ConfigurationTarget.Workspace);
  }
}

export function transpileTypeScript(code: string): string {
  return ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext }
  }).outputText;
}

/**
 * Send the contents of a text document to the webview panel to generate a new Manifold model
 */
export function sendScriptToGenerate(panel: vscode.WebviewPanel, doc: vscode.TextDocument) {
  panel.webview.postMessage({
    type: 'updateScript',
    code: transpileTypeScript(doc.getText()),
    fileName: doc.fileName
  });
}