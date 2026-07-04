# Any feature chained off speechSynthesis onend needs a watchdog timeout

The guided tour (page.tsx) advances to the next room only after the current
employee's reply finishes speaking, via `SpeechSynthesisUtterance.onend`.
That event is not guaranteed: backgrounded tabs, missing audio devices, or a
browser silently dropping the utterance can mean `onend` never fires, which
would hang the tour forever with no error visible to the visitor.

Fix in `ChatPanel.tsx`: `send()` starts a `setTimeout` sized to the reply
length (`1500 + reply.length * 70`, capped at 20s) alongside the real
`speak()` call; whichever resolves first calls `onReplyComplete` once (guarded
by a `settled` flag). Confirmed live: a full four-stop tour completed
end-to-end in the dev preview without ever stalling.

Apply the same pattern anywhere else that gates app state on a Web Speech
API callback — treat `onend`/`onresult` as best-effort, not guaranteed.
