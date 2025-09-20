import * as vscode from 'vscode';
import { addManifoldTypesComment } from './utils';


export function registerManifoldTypes(context: vscode.ExtensionContext) {
  // Only generate .vscode/manifold-types.d.ts when a .mfc or .manifoldcad file is opened
  async function ensureManifoldTypesFile() {
    const wsFolders = vscode.workspace.workspaceFolders;
    if (wsFolders && wsFolders.length > 0) {
      const wsRoot = wsFolders[0].uri;
      const vscodeDir = vscode.Uri.joinPath(wsRoot, '.vscode');
      const topLevelTypeFile = vscode.Uri.joinPath(vscodeDir, 'manifold-types.d.ts');
      const globalTypes = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'src', 'wasm', 'manifold-global-types.d.ts');
      const encapsulatedTypes = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'src', 'wasm', 'manifold-encapsulated-types.d.ts');
      const editorTypes = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'src', 'wasm', 'examples', 'public', 'editor.d.ts');
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
          let global = '', encapsulated = '', editor = '';
          const decoder = new TextDecoder('utf-8');
          try { global = decoder.decode(await vscode.workspace.fs.readFile(globalTypes)); } catch { }
          try { encapsulated = decoder.decode(await vscode.workspace.fs.readFile(encapsulatedTypes)); } catch { }
          try { editor = decoder.decode(await vscode.workspace.fs.readFile(editorTypes)); } catch { }

          // Apply the same transformations as editor.js
          const importableEditorTypes = editor.replace(/^import.*$/gm, '');

          const manifoldToplevel = `
${global.replace(/export/g, '')}
${encapsulated.replace(/^import.*$/gm, '').replace(/export/g, 'declare')}
declare interface ManifoldToplevel {
  CrossSection: typeof CrossSection;
  Manifold: typeof Manifold;
  Mesh: typeof Mesh;
  triangulate: typeof triangulate;
  setMinCircularAngle: typeof setMinCircularAngle;
  setMinCircularEdgeLength: typeof setMinCircularEdgeLength;
  setCircularSegments: typeof setCircularSegments;
  getCircularSegments: typeof getCircularSegments;
  resetToCircularDefaults: typeof resetToCircularDefaults;
  setup: () => void;
}
declare const module: ManifoldToplevel;
`;

          await vscode.workspace.fs.writeFile(topLevelTypeFile, new TextEncoder().encode(`${manifoldToplevel}\n\n${importableEditorTypes}`));
        }
      } catch (err) {
        vscode.window.showErrorMessage('Failed to set up Manifold types: ' + err);
      }
    }
  }

  // Register a TypeScript language feature for .mfc/.manifoldcad
  const selector = [
    { language: 'typescript', pattern: '**/*.mfc' },
    { language: 'typescript', pattern: '**/*.manifoldcad' },
  ];

  // Provide the type definitions as in-memory extra libraries
  const disposables: vscode.Disposable[] = [];
  for (const sel of selector) {
    disposables.push(vscode.languages.registerCompletionItemProvider(sel, {
      provideCompletionItems() {
        // No-op, just to trigger language activation
        return undefined;
      },
    }));
  }


  // On open, if .mfc/.manifoldcad, ensure type file and auto-insert triple-slash reference if missing
  vscode.workspace.onDidOpenTextDocument(async (doc: vscode.TextDocument) => {
    if (doc.fileName.endsWith('.mfc') || doc.fileName.endsWith('.manifoldcad')) {
      await ensureManifoldTypesFile();
      addManifoldTypesComment(doc);
    }
  });

  // On save, ensure triple-slash reference is present (and type file exists)
  vscode.workspace.onDidSaveTextDocument(async (doc: vscode.TextDocument) => {
    if (doc.fileName.endsWith('.mfc') || doc.fileName.endsWith('.manifoldcad')) {
      await ensureManifoldTypesFile();
      addManifoldTypesComment(doc);
    }
  });

  context.subscriptions.push(...disposables);
}
