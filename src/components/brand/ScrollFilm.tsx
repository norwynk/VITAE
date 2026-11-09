'use client';
import { useEffect, useRef, useState } from 'react';

interface ScrollFilmProps {
  src: string;
  poster: string;
  width: number;
  height: number;
  className: string;
  label: string;
  /** How long the film runs, as shown on the button, like 0:50. */
  length: string;
}

/**
 * A film that starts by itself once it is half on screen and pauses when it
 * scrolls away. Nothing downloads until then. Browsers refuse to start a film
 * with sound by itself, so it starts silent with a button for the sound.
 * It only plays through once, and stays put if they paused it themselves.
 */
export function ScrollFilm({ src, poster, width, height, className, label, length }: ScrollFilmProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'waiting' | 'playing' | 'refused' | 'ended'>('waiting');
  const [muted, setMuted] = useState(true);
  const stayStill = useRef(false);
  const scrolledAway = useRef(false);

  useEffect(() => {
    const film = video.current;
    if (!film) return;
    film.muted = true;
    // People who asked for less motion or less data get a Play button instead.
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const holdBack = window.matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(saveData);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (stayStill.current || !film.paused) return;
          if (holdBack) {
            setState('refused');
            return;
          }
          film.play().catch((e: DOMException) => {
            // Low power mode and the like. A quick scroll past is an AbortError and needs nothing.
            if (e.name === 'NotAllowedError') setState('refused');
          });
        } else if (!film.paused) {
          scrolledAway.current = true;
          film.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(film);
    return () => observer.disconnect();
  }, []);

  const playWithSound = () => {
    const film = video.current;
    if (!film) return;
    film.muted = false;
    void film.play();
  };
  const soundOn = () => {
    if (video.current) video.current.muted = false;
  };

  return (
    <>
      <video
        ref={video}
        className={className}
        src={src}
        poster={poster}
        preload="none"
        playsInline
        controls={state === 'playing'}
        onPlay={() => {
          stayStill.current = false;
          setState('playing');
        }}
        onPause={(e) => {
          if (e.currentTarget.ended || document.hidden) return;
          if (scrolledAway.current) scrolledAway.current = false;
          else stayStill.current = true;
        }}
        onEnded={() => {
          stayStill.current = true;
          setState('ended');
        }}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        width={width}
        height={height}
        aria-label={label}
      />
      {state === 'playing' && muted && (
        <button type="button" className="film-sound" onClick={soundOn}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15 8.5a5 5 0 0 1 0 7M17.5 6a8.5 8.5 0 0 1 0 12" />
          </svg>
          Tap for sound
        </button>
      )}
      {(state === 'refused' || state === 'ended') && (
        <button type="button" className="explainer__play" onClick={playWithSound} aria-label="Play the film with sound">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          <span>
            {state === 'ended' ? 'Watch again' : 'Play'} · {length}
          </span>
        </button>
      )}
    </>
  );
}
