
declare global {
  interface Window {
    acquireVsCodeApi?: () => { postMessage: (msg: any) => void };
  }
}

export const signalAppIsReady = () => {
  if (window.acquireVsCodeApi) {
    const vscode = window.acquireVsCodeApi();
    // Let the extension know that the webview is ready
    vscode.postMessage({ type: "ready" });
  }
}
