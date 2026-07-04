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

// Chrome/Edge report their voice list asynchronously — the first call to
// getVoices() right after page load returns an empty array, so naive code
// falls through to whatever the OS default is (on Windows that's a low
// quality "Desktop" SAPI voice, which is what sounded robotic/unprofessional).
// This caches the real list once the browser fires voiceschanged.
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!synthesisSupported()) return Promise.resolve([]);
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    const onChange = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        window.speechSynthesis.removeEventListener("voiceschanged", onChange);
        resolve(voices);
      }
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    // Some browsers never fire voiceschanged if voices were already cached
    // internally; fall back to a short poll so we don't wait forever.
    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      cachedVoices = voices;
      resolve(voices);
    }, 1200);
  });
  return voicesReady;
}

// Common voice names across Windows/Chrome/Edge, since "male"/"female" rarely
// appears literally in the voice name itself. Every RUDRA employee is male,
// so this steers away from the well-known female defaults (Zira, Hazel,
// Susan, most "Google US English") even when no explicit gender is exposed.
const KNOWN_MALE = /\b(david|mark|guy|ryan|christopher|george|ravi|hemant|prabhat|madhur)\b/i;
const KNOWN_FEMALE = /\b(zira|hazel|susan|aria|jenny|heera|kalpana|swara|neerja)\b/i;
// Windows' bundled SAPI5 voices (David/Mark/Zira/Hazel...) are the classic
// robotic offline engine and are the most likely source of a visitor
// complaining the English voice sounds "unprofessional" — deprioritize them
// hard so any network voice (Google/Natural/Online) wins whenever present.
const KNOWN_LEGACY_ROBOTIC = /\b(david|mark|zira|hazel|george|susan)\b/i;

// Rank voices for a target language: prefer high-quality network/neural
// engines (Google, Microsoft "Online"/"Natural") over robotic offline
// "Desktop"/"Compact" ones, and prefer a male-sounding voice since every
// RUDRA employee is male.
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.split("-")[0];
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (candidates.length === 0) return null;

  const score = (v: SpeechSynthesisVoice): number => {
    const name = v.name;
    let s = 0;
    if (v.lang.toLowerCase() === lang.toLowerCase()) s += 5; // exact region match
    if (/google/i.test(name)) s += 8;
    if (/natural|online|neural/i.test(name)) s += 10;
    if (/desktop|compact/i.test(name)) s -= 6; // robotic offline voices
    if (KNOWN_LEGACY_ROBOTIC.test(name)) s -= 3;
    if (KNOWN_MALE.test(name) || /\bmale\b/i.test(name)) s += 4;
    if (KNOWN_FEMALE.test(name) || /\bfemale\b/i.test(name)) s -= 3;
    if (v.localService) s -= 1; // network voices are usually higher quality
    return s;
  };

  return candidates.slice().sort((a, b) => score(b) - score(a))[0];
}

// Speak a reply aloud. Cancels anything already speaking. Reports start/end
// so the UI can animate the speaking waveform.
export async function speak(text: string, onStart: () => void, onEnd: () => void): Promise<void> {
  if (!synthesisSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = DEVANAGARI.test(text) ? "hi-IN" : "en-IN";
  utterance.lang = lang;
  utterance.rate = 0.98;
  utterance.pitch = 0.92; // slightly lower pitch reads as more male, less shrill

  const voices = cachedVoices.length > 0 ? cachedVoices : await loadVoices();
  const best = pickVoice(voices, lang) ?? pickVoice(voices, "en");
  if (best) utterance.voice = best;

  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}

// Call once on app mount so the voice list is warm before the first reply.
export function warmUpVoices(): void {
  void loadVoices();
}
