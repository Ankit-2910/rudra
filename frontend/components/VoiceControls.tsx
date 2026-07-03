"use client";
import { useEffect, useRef, useState } from "react";
import { createRecognizer, recognitionSupported, type Recognizer } from "../lib/voice";

// Push-to-talk mic button. Renders nothing when SpeechRecognition is
// unavailable (Firefox/iOS) — the on-screen room buttons remain the fallback.
export default function VoiceControls({ onTranscript }: { onTranscript: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<Recognizer | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (!recognitionSupported()) return;
    setSupported(true);
    recognizerRef.current = createRecognizer(
      (t) => onTranscriptRef.current(t),
      setListening
    );
    return () => recognizerRef.current?.stop();
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() =>
        listening ? recognizerRef.current?.stop() : recognizerRef.current?.start()
      }
      title='Voice commands — try "Show Finance", "Reception", "Go back"'
      className={
        "flex h-11 w-11 items-center justify-center rounded-full border text-lg transition-colors " +
        (listening
          ? "mic-live border-accent bg-accent/20"
          : "border-edge bg-panel/90 hover:border-accent/60")
      }
      aria-label={listening ? "Stop listening" : "Start voice command"}
    >
      🎙️
    </button>
  );
}
