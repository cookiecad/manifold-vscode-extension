import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { addManifoldTypesComment, ensureFileAssociations } from './utils';


export function registerManifoldTypes(context: vscode.ExtensionContext) {
  // Ensure .mfc/.manifoldcad are associated with TypeScript
  ensureFileAssociations();

  // Only generate .vscode/manifold-types.d.ts when a .mfc or .manifoldcad file is opened
  async function ensureManifoldTypesFile() {
    const wsFolders = vscode.workspace.workspaceFolders;
    if (wsFolders && wsFolders.length > 0) {
      const wsRoot = wsFolders[0].uri.fsPath;
      const vscodeDir = path.join(wsRoot, '.vscode');
      const topLevelTypeFile = path.join(vscodeDir, 'manifold-types.d.ts');
      const globalTypes = path.join(context.extensionPath, 'src', 'webview', 'src', 'wasm', 'manifold-global-types.d.ts');
      const encapsulatedTypes = path.join(context.extensionPath, 'src', 'webview', 'src', 'wasm', 'manifold-encapsulated-types.d.ts');
      const editorTypes = path.join(context.extensionPath, 'src', 'webview', 'src', 'wasm', 'examples', 'public', 'editor.d.ts');
      try {
        if (!fs.existsSync(vscodeDir)) {
          fs.mkdirSync(vscodeDir);
        }
        if (!fs.existsSync(topLevelTypeFile)) {
          // Generate types file
          const global = fs.existsSync(globalTypes) ? fs.readFileSync(globalTypes, 'utf8') : '';
          const encapsulated = fs.existsSync(encapsulatedTypes) ? fs.readFileSync(encapsulatedTypes, 'utf8') : '';
          const editor = fs.existsSync(editorTypes) ? fs.readFileSync(editorTypes, 'utf8') : '';

          // Apply the same transformations as editor.js
          const importableEditorTypes = editor.replace(/^import.*$/gm, '');

          const manifoldToplevel = `
${global.replaceAll('export', '')}
${encapsulated.replace(/^import.*$/gm, '').replaceAll('export', 'declare')}
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

          fs.writeFileSync(topLevelTypeFile, `${manifoldToplevel}\n\n${importableEditorTypes}`);
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
