"use client";

import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";

export default function MusicPlayer({ language }: { language: "gu" | "en" }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const manualChoice = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;

    function removeGestureListeners() {
      document.removeEventListener("click", startOnInteraction, true);
      document.removeEventListener("keydown", startOnInteraction, true);
    }

    function startOnInteraction(event: Event) {
      if (manualChoice.current || !audio?.paused) return;
      if (event.target instanceof Element && event.target.closest("[data-music-control]")) return;
      if (event instanceof KeyboardEvent && ["Shift", "Control", "Alt", "Meta", "Escape"].includes(event.key)) return;
      void audio.play().catch(() => {
        // A browser may still require a direct tap on the music button.
      });
    }

    document.addEventListener("click", startOnInteraction, true);
    document.addEventListener("keydown", startOnInteraction, true);
    audio.addEventListener("play", removeGestureListeners);
    // Respect browser autoplay policy; the button is the explicit fallback.
    void audio.play().catch(() => {});

    return () => {
      removeGestureListeners();
      audio.removeEventListener("play", removeGestureListeners);
      audio.pause();
    };
  }, []);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    manualChoice.current = true;
    if (!audio.paused) {
      // Pause retains currentTime, so the next play resumes the same position.
      audio.pause();
      return;
    }
    setFailed(false);
    try {
      if (audio.error) audio.load();
      await audio.play();
    } catch (error) {
      if ((error as Error).name !== "AbortError") setFailed(true);
    }
  }

  const label = language === "gu"
    ? playing ? "સંગીત બંધ કરો" : "સંગીત શરૂ કરો"
    : playing ? "Pause music" : "Play music";
  const errorMessage = language === "gu"
    ? "સંગીત શરૂ થઈ શક્યું નથી. ફરી ક્લિક કરો."
    : "Music could not start. Tap the note to try again.";

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src="/music/nanha-sa-mehmaan.m4a"
        preload="metadata"
        loop
        onPlay={() => { setPlaying(true); setFailed(false); }}
        onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setFailed(true); }}
      />
      <button
        type="button"
        className={`music-control${playing ? " is-playing" : ""}`}
        data-music-control
        aria-label={label}
        aria-pressed={playing}
        aria-describedby={failed ? "music-error" : undefined}
        title={label}
        onClick={() => void toggleMusic()}
      >
        <Music2 size={23} strokeWidth={1.8} aria-hidden="true" />
        {!playing && <svg className="music-off-mark" viewBox="0 0 28 28" aria-hidden="true"><path d="M5 5 23 23" /></svg>}
        <span className="music-control-label" aria-hidden="true">{label}</span>
        {playing && <span className="music-playing-dot" aria-hidden="true" />}
      </button>
      {failed && <p className="music-error" id="music-error" role="status">{errorMessage}</p>}
    </div>
  );
}
