// Thin wrappers around the browser Web Speech API. All feature-detected:
// callers must handle the unsupported case (Firefox, iOS Safari) by showing
// on-screen buttons instead.

export function recognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function synthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
}

// One-shot recognizer tuned for short navigation commands. en-IN picks up
// both English and Romanised Hindi; Devanagari keywords are matched from
// whatever the engine returns.
export function createRecognizer(
  onResult: (transcript: string) => void,
  onStateChange: (listening: boolean) => void
): Recognizer | null {
  if (!recognitionSupported()) return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = "en-IN";
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  rec.onstart = () => onStateChange(true);
  rec.onend = () => onStateChange(false);
  rec.onerror = () => onStateChange(false);
  rec.onresult = (event: any) => {
    const alternatives: string[] = [];
    for (let i = 0; i < event.results[0].length; i++) {
      alternatives.push(event.results[0][i].transcript);
    }
    onResult(alternatives.join(" | "));
  };

  return {
    start: () => {
      try {
        rec.start();
      } catch {
        // start() throws if already running — harmless.
      }
    },
    stop: () => rec.stop(),
  };
}

const DEVANAGARI = /[ऀ-ॿ]/;

// Speak a reply aloud. Cancels anything already speaking. Reports start/end
// so the UI can animate the speaking waveform.
export function speak(text: string, onStart: () => void, onEnd: () => void): void {
  if (!synthesisSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = DEVANAGARI.test(text) ? "hi-IN" : "en-IN";
  utterance.rate = 1.02;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang === utterance.lang);
  if (preferred) utterance.voice = preferred;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}
