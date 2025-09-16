import React, { useEffect, useState, RefObject } from 'react';


export function AnimationBar({
  modelRef,
}: {
  modelRef: RefObject<any>;
}) {
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasAnim, setHasAnim] = useState(false);
  
  // Get icon URIs from injected globals
  const playIconUrl = (window as any).MANIFOLD_PLAY_ICON_URL;
  const pauseIconUrl = (window as any).MANIFOLD_PAUSE_ICON_URL;

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    function onLoad() {
      // eslint-disable-next-line no-console
      console.log('AnimationBar: model-viewer loaded:', model);
      const hasAnimation = Array.isArray(model.availableAnimations) && model.availableAnimations.length > 0;
      setHasAnim(hasAnimation);
      if (hasAnimation) {
        model.play();
        setPaused(false);
        setDuration(model.duration || 0);
        setCurrentTime(model.currentTime || 0);
      } else {
        setDuration(0);
        setCurrentTime(0);
        setPaused(false);
      }
    }

    model.addEventListener('load', onLoad);
    return () => {
      model.removeEventListener('load', onLoad);
    };
  }, [modelRef]);

  const handlePlayPause = () => {
    const model = modelRef.current;
    if (!model) return;
    if (paused) {
      model.play();
      setPaused(false);
    } else {
      model.pause();
      setPaused(true);
      setDuration(model.duration || 0);
      setCurrentTime(model.currentTime || 0);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const model = modelRef.current;
    const value = parseFloat(e.target.value);
    if (model) {
      model.currentTime = value;
      setCurrentTime(value);
    }
  };

  if (!hasAnim) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'absolute',
        width: '100%',
        bottom: '30vh',
        margin: 2,
        background: 'none',
        zIndex: 2,
      }}
    >
      <button
        onClick={handlePlayPause}
        className={paused ? 'play' : 'pause'}
        style={{
          position: 'relative',
          backgroundColor: '#ccc',
          margin: 8,
          width: 36,
          height: 36,
          border: 'none',
          borderRadius: 18,
          backgroundImage: paused
            ? `url(${playIconUrl})`
            : `url(${pauseIconUrl})`,
          backgroundSize: '20px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          cursor: 'pointer',
          outline: 'none',
        }}
        aria-label={paused ? 'Play' : 'Pause'}
      />
      {paused && (
        <>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={handleScrub}
            className="slider"
            style={{
              position: 'relative',
              appearance: 'none',
              width: '100%',
              height: 10,
              borderRadius: 5,
              marginRight: 16,
              background: '#ffffff55',
              outline: 'none',
              flex: 1,
            }}
          />
          <span style={{ color: '#fff', marginLeft: 12, fontSize: 14, fontWeight: 100, lineHeight: '20px' }}>
            {currentTime.toFixed(2)} / {duration.toFixed(2)}s
          </span>
        </>
      )}
    </div>
  );
}
