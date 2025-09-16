import { registerManifoldTypes } from './registerManifoldTypes';
import * as vscode from 'vscode';
import * as path from 'path';
import { sendScriptToGenerate } from './utils';

export function activate(context: vscode.ExtensionContext) {
  // Register .mfc/.manifoldcad as TypeScript with Manifold types
  registerManifoldTypes(context);
  let panel: vscode.WebviewPanel | undefined;

  const openEditor = vscode.commands.registerCommand('manifold.openEditor', () => {
    if (panel) {
      panel.reveal();
      return;
    }
    panel = vscode.window.createWebviewPanel(
      'manifoldEditor',
      'Manifold 3D Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'media')),
          vscode.Uri.file(path.join(context.extensionPath, 'media', 'assets'))
        ],
        retainContextWhenHidden: true
      }
    );

    // Find hashed worker, wasm, and icon files in media/assets and media
    const fs = require('fs');
    const assetsDir = path.join(context.extensionPath, 'media', 'assets');
    const mediaDir = path.join(context.extensionPath, 'media');
    const assetFiles = fs.readdirSync(assetsDir);
    const mediaFiles = fs.readdirSync(mediaDir);
    const workerFile = assetFiles.find((f: string) => f.startsWith('worker-wrapper') && f.endsWith('.js'));
    const wasmFile = assetFiles.find((f: string) => f.startsWith('manifold') && f.endsWith('.wasm'));
    // Find play/pause icons in media (built by Vite)
    const playIconFile = mediaFiles.find((f: string) => f.startsWith('play') && f.endsWith('.png'));
    const pauseIconFile = mediaFiles.find((f: string) => f.startsWith('pause') && f.endsWith('.png'));
    if (!workerFile || !wasmFile || !playIconFile || !pauseIconFile) {
      vscode.window.showErrorMessage('Could not find worker, wasm, or icon files in media/assets.');
      return;
    }
    const mainJsUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'media', 'main.js'))
    );
    const mainCssUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(assetsDir, 'index.css'))
    );
    const workerUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(assetsDir, workerFile))
    );
    const wasmUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(assetsDir, wasmFile))
    );
    const playIconUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(mediaDir, playIconFile))
    );
    const pauseIconUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(mediaDir, pauseIconFile))
    );

    // Inject the URIs as global JS variables
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manifold 3D Preview</title>
    <link rel="stylesheet" href="${mainCssUri}">
    <script>
      window.MANIFOLD_WORKER_URL = "${workerUri}";
      window.MANIFOLD_WASM_URL = "${wasmUri}";
      window.MANIFOLD_PLAY_ICON_URL = "${playIconUri}";
      window.MANIFOLD_PAUSE_ICON_URL = "${pauseIconUri}";
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${mainJsUri}"></script>
  </body>
</html>`;

    console.log(`Generated HTML:\n${html}\n    `);

    panel.webview.html = html;

    panel.onDidDispose(() => {
      panel = undefined;
    });

    // Wait for webview to signal it's ready before sending script
    panel.webview.onDidReceiveMessage((message) => {
      if (message && message.type === 'ready') {
        let doc: vscode.TextDocument | undefined = undefined;
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && /\.(mfc|manifoldcad)$/.test(activeEditor.document.fileName)) {
          doc = activeEditor.document;
        } else {
          // Fallback: find the first visible .mfc/.manifoldcad file
          doc = vscode.window.visibleTextEditors.find(d => /\.(mfc|manifoldcad)$/.test(d.document.fileName))?.document;
        }
        if (doc) {
          sendScriptToGenerate(panel as vscode.WebviewPanel, doc);
        }
      }
    });
  });

  context.subscriptions.push(openEditor);

  // Listen for file saves and send code to the webview
  vscode.workspace.onDidSaveTextDocument((doc) => {
    if (!panel) return;
    if (!/\.(mfc|manifoldcad)$/.test(doc.fileName)) return;
    sendScriptToGenerate(panel, doc);
  });
}

export function deactivate() { }
