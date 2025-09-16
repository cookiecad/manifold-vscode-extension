import { useEffect, useRef, useState } from 'react'

// Import the worker as a URL so Vite bundles it as an asset, but do not use directly
import ManifoldWorker from './wasm/examples/worker-wrapper.ts?worker';

import { Viewer } from './components/Viewer';
import { Console } from './components/Console';
import { signalAppIsReady } from './signalAppIsReady';

export default function App() {
  const workerRef = useRef<Worker>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Prevent tree-shaking by referencing the ManifoldWorker in a dummy way
  if (typeof ManifoldWorker === 'string') {
    // This block will never run, but Vite will keep the asset
  }

  useEffect(() => {
    // Get the injected worker and wasm URLs from the global window
    const workerUrl = (window as any).MANIFOLD_WORKER_URL;
    const wasmUrl = (window as any).MANIFOLD_WASM_URL;
    let cancelled = false;
    (async () => {
      // Fetch the worker script and create a blob URL
      const workerScript = await fetch(workerUrl).then(r => r.text());
      if (cancelled) return;
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (e) => {
        if (e.data?.log) setLogs((prev) => [...prev, e.data.log]);
        if (e.data?.glbURL) setGlbUrl(e.data.glbURL);
      };
      // Pass the wasm URL to the worker for use in evaluate.ts
      worker.postMessage({ type: 'init', wasmUrl });
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'updateScript') {
          setLogs([]);
          setGlbUrl(null);
          console.log('[App] posting code to worker', event.data.fileName, event.data.code);
          workerRef.current?.postMessage({ code: event.data.code, fileName: event.data.fileName });
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
