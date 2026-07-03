# Never call browser feature detection during render — decide in useEffect

Calling `synthesisSupported()` (checks `window.speechSynthesis`) directly in
ChatPanel's JSX rendered the 🔊 toggle on the client but not in the
server-rendered HTML, causing React hydration errors ("Text content did not
match") on every load. Fix: hold the result in state initialised to `false`
and set it in a mount `useEffect`, so server and first client render agree and
the button appears after hydration.

Rule of thumb for this codebase: any `typeof window`/API-availability check
that affects rendered output must go through state + `useEffect`, never inline
in JSX. `VoiceControls` already followed this pattern (its `supported` state)
and never had the problem.
