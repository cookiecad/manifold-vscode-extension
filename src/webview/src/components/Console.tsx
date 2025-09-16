
export function Console({ logs }: { logs: string[] }) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#181818',
        color: '#fff',
        padding: 8,
        fontFamily: 'monospace',
        fontSize: '0.95em',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        boxSizing: 'border-box',
        borderTop: '2px solid #333',
      }}
    >
      {logs.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}