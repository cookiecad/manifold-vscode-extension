import { registerManifoldTypes } from './registerManifoldTypes';
import * as vscode from 'vscode';
import { sendScriptToGenerate } from './utils';

export function activate(context: vscode.ExtensionContext) {
  // Register .mfc/.manifoldcad as TypeScript with Manifold types
  registerManifoldTypes(context);
  let panel: vscode.WebviewPanel | undefined;

  const openViewer = vscode.commands.registerCommand('manifold.openViewer', async () => {
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
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          vscode.Uri.joinPath(context.extensionUri, 'media', 'assets')
        ],
        retainContextWhenHidden: true
      }
    );

    // Read asset manifest
    const manifestUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'assets', 'assets-manifest.json');
    let manifest: any;
    try {
      const manifestBytes = await vscode.workspace.fs.readFile(manifestUri);
      const manifestText = new TextDecoder('utf-8').decode(manifestBytes);
      manifest = JSON.parse(manifestText);
    } catch (e) {
      vscode.window.showErrorMessage('Could not read assets-manifest.json.');
      return;
    }

    // Get asset filenames from manifest
    const workerFile = manifest.worker;
    const wasmFile = manifest.wasm;
    const mainJsFile = manifest.mainJs;
    const mainCssFile = manifest.mainCss;
    const playIconFile = manifest.playIcon;
    const pauseIconFile = manifest.pauseIcon;

    // Build URIs
    const mainJsUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', mainJsFile)
    );
    const mainCssUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'assets', mainCssFile)
    );
    const workerUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'assets', workerFile)
    );
    const wasmUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'assets', wasmFile)
    );
    const playIconUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', playIconFile)
    );
    const pauseIconUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', pauseIconFile)
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

  context.subscriptions.push(openViewer);

  // Listen for file saves and send code to the webview
  vscode.workspace.onDidSaveTextDocument((doc) => {
    if (!panel) return;
    if (!/\.(mfc|manifoldcad)$/.test(doc.fileName)) return;
    sendScriptToGenerate(panel, doc);
  });
}

export function deactivate() { }
