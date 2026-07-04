# Browser TTS voice quality has a hard ceiling the app can't fix alone

A visitor reported the English speech sounded "very poor, unprofessional" while
Hindi sounded fine. Root cause: `speechSynthesis.getVoices()` is populated
asynchronously (empty on the very first call after page load) and the old
code picked whatever `en-IN`/`hi-IN` voice existed with no quality ranking —
on a machine without Chrome's network "Google" voices or Edge's "Online
(Natural)" voices, that falls through to Windows' bundled SAPI5 set (David,
Mark, Zira), which is the classic robotic legacy engine.

Fix applied in `lib/voice.ts`: cache the voice list once `voiceschanged`
fires (with a 1.2s poll fallback), and rank candidates — network/neural
voices (`google`, `natural`, `online`, `neural` in the name) score far above
`desktop`/`compact` ones, with known-robotic legacy names (David/Mark/Zira/
Hazel/George/Susan) penalized further, and a known-name gender lookup steers
toward a male voice since every RUDRA employee is male.

**Ceiling that remains:** if the visitor's browser genuinely has no network
voices registered (offline, or a browser/OS combo without them), all
candidates are the same low-quality tier and no amount of ranking fixes the
underlying engine. The honest fix beyond this point is a paid TTS API
(ElevenLabs, Google Cloud TTS) — flagged to the user as a Phase 3 upgrade,
not attempted here since it needs a new paid key.
