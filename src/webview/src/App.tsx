import { useEffect, useRef, useState } from 'react'

// Import the worker as a URL so Vite bundles it as an asset, but do not use directly
import manifoldWorkerUrl from 'manifold-3d/lib/worker.bundled.js?url';
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url';
import esbuildWasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import type {Message, MessageToWorker, MessageFromWorker} from 'manifold-3d/lib/worker.js';

import { Viewer } from './components/Viewer';
import { Console } from './components/Console';
import { signalAppIsReady } from './signalAppIsReady';

export default function App() {
  const workerRef = useRef<Worker>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const log = (msg:string) => setLogs((prev) => [...prev, msg])

  // Prevent tree-shaking by referencing the ManifoldWorker in a dummy way
  if (typeof manifoldWorkerUrl === 'string' || typeof manifoldWasmUrl === 'string' || typeof esbuildWasmUrl === 'string') {
    // This block will never run, but Vite will keep the asset
  }

  useEffect(() => {
    // Get the injected worker and wasm URLs from the global window
    const workerUrl = (window as any).MANIFOLD_WORKER_URL;
    const manifoldWasmUrl = (window as any).MANIFOLD_WASM_URL;
    const esbuildWasmUrl = (window as any).ESBUILD_WASM_URL

    let cancelled = false;
    let worker: null | Worker = null;

    (async () => {
      if (cancelled) return;
      try {
        // Fetch the worker script and create a blob URL
        // As per https://code.visualstudio.com/api/extension-guides/webview#using-web-workers
        // Workers cannot use 'import' even if they are modules.  They must be bundled before use.
        const workerScript = await fetch(workerUrl).then(r => r.text());
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob),{type: 'module'});
        workerRef.current = worker;
      } catch (e) {
        console.error(e);
        log((e as any).toString());
        return;
      }

      worker.onmessage = (e) => {
        const message = e.data as Message;
        console.log("Worker posted to [App]", message);
        if (message.type === 'ready') {
          log("Manifold worker ready.");
        } else if (message.type === 'error') {
          log((message as MessageFromWorker.Error).message);
        } else if (message.type === 'log') {
          log((message as MessageFromWorker.Log).message);
        } else if (message.type === 'done') {
          workerRef.current?.postMessage({type: 'export', extension: 'glb'} as MessageToWorker.Export);
        } else if (message.type === 'blob') {
          const { blobURL, extension } = (message as MessageFromWorker.Blob);
          if (extension == 'glb') setGlbUrl(blobURL);
        }
      };
      // Pass the wasm URL to the worker for use in evaluate.ts
      worker.postMessage({ type: 'initialize', manifoldWasmUrl, esbuildWasmUrl} as MessageToWorker.Initialize);
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'updateScript') {
          setLogs([]);
          setGlbUrl(null);
          const {fileName: filename, code} = event?.data;
          console.log('[App] posting code to worker', {filename, code});
          workerRef.current?.postMessage({ type: 'evaluate', filename, code, jsCDN: 'jsDelivr'} as MessageToWorker.Evaluate);
        }
      });
      // Signal to vscode that app is ready
      signalAppIsReady();
    })();
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#222',
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <Viewer glbUrl={glbUrl} />
      </div>
      <div style={{ height: '30vh', width: '100vw', flex: '0 0 auto' }}>
        <Console logs={logs} />
      </div>
    </div>
  );
}
