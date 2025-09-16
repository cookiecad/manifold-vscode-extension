import '@google/model-viewer';
import { useEffect, useRef, useState } from 'react';
import { AnimationBar } from './AnimationBar';

export function Viewer({ glbUrl }: { glbUrl: string | null }) {
  const modelRef = useRef<any>(null);
  const [hasAnimation, setHasAnimation] = useState(false);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    function onLoad() {
      const hasAnim = Array.isArray(model.availableAnimations) && model.availableAnimations.length > 0;
      setHasAnimation(hasAnim);
    }

    model.addEventListener('load', onLoad);
    return () => {
      model.removeEventListener('load', onLoad);
    };
  }, [glbUrl]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', flexDirection: 'column' }}>
      <model-viewer
        ref={modelRef}
        src={glbUrl || ''}
        camera-controls
        shadow-intensity="1"
        tone-mapping="neutral"
        interaction-prompt="none"
        alt="3D output"
        style={{ width: '100%', height: hasAnimation ? 'calc(100% - 48px)' : '100%', background: '#222' }}
      />
      <AnimationBar
        modelRef={modelRef}
      />
    </div>
  );
}