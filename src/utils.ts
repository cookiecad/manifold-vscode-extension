import * as vscode from 'vscode';

const manifoldTypeFile = 'manifold-types.d.ts';

/**
 * Generate a triple-slash reference to the types file, using a relative path from the doc's folder.
 */
export function generateManifoldTypesComment(doc: vscode.TextDocument): string {
  const wsFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
  if (!wsFolder) return '';
  // Use Uri manipulation for web compatibility
  const wsRoot = wsFolder.uri;
  const typesFile = vscode.Uri.joinPath(wsRoot, '.vscode', manifoldTypeFile);
  const docDir = vscode.Uri.joinPath(doc.uri, '..');
  // Compute relative path manually (since path.relative is not available)
  let relPath = relativeUriPath(docDir, typesFile);
  return `/// <reference path="${relPath}" />`;
}

// Helper to compute relative path between two vscode.Uri (using only forward slashes)
function relativeUriPath(from: vscode.Uri, to: vscode.Uri): string {
  const fromParts = from.path.split('/').filter(Boolean);
  const toParts = to.path.split('/').filter(Boolean);
  // Find common prefix
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
  const up = fromParts.length - i;
  const down = toParts.slice(i);
  return `${'../'.repeat(up)}${down.join('/')}`;
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

/**
 * Send the contents of a text document to the webview panel to generate a new Manifold model
 */
export function sendScriptToGenerate(panel: vscode.WebviewPanel, doc: vscode.TextDocument) {
  panel.webview.postMessage({
    type: 'updateScript',
    code: doc.getText(),
    fileName: doc.fileName
  });
}