# Real user feedback overrides gender-matching assumptions for TTS voice choice

First fix attempt ranked voices to prefer a male-sounding voice (matching the
male AI employee identities) plus network/neural engines over legacy SAPI5
ones. The user tested it live and reported the male voices (David/Mark on
Windows) still sounded bad, while the female voice (Zira) sounded very good —
the opposite of what "match the character's gender" would predict. Their
hardware/browser apparently only has the classic robotic SAPI5 engine for
male English voices, while its female voice happens to be a better-sounding
one.

Fix in `lib/voice.ts`: flipped the scoring to prefer female voices
(Zira/Hazel/Susan/Kalpana/Heera/...) regardless of the persona's narrative
gender, and only penalize the specific male legacy voices confirmed bad
(David/Mark/George) rather than penalizing "male" broadly. The AI employees
stay male in text and Hindi grammar — only the synthesized audio timbre
changed. Also nudged pitch to 1.04 and rate to 0.96 for warmth/clarity per
the user's "enhance it further" ask. Verified live: `speechSynthesis.speak()`
was monkey-patched to capture the chosen voice, confirming Zira was selected.

**Lesson:** don't assume "match persona gender" is what sounds best — TTS
engine quality varies wildly per voice regardless of gender, and differs per
user's OS/browser. When a user reports a specific voice sounds good, trust
that over a theory-based heuristic, and keep the character identity (text)
decoupled from the audio voice choice (sound).

**Ceiling that remains:** if the visitor's browser has no good voice in
either gender for a language, no ranking heuristic fixes the underlying
engine — the durable fix past that point is a paid TTS API (ElevenLabs,
Google Cloud TTS), not attempted here since it needs a new paid key.
