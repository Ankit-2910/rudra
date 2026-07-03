# thinkingConfig is 2.5-only — sending it to 1.5 models breaks the fallback chain

The `generationConfig.thinkingConfig: { thinkingBudget: 0 }` field is only
accepted by Gemini 2.5-series models; gemini-1.5-flash and gemini-1.5-pro
return HTTP 400 when it is present. Since 1.5 models exist in our chain purely
as fallbacks, including the field unconditionally would have made every
fallback attempt fail exactly when it was needed. `/api/employee` therefore
adds `thinkingConfig` only when `model.startsWith("gemini-2.5")`.

Related budget decision (confirmed approach): Vercel Hobby caps functions at
10s, so the route keeps an overall 8.5s budget across all three attempts, a 7s
cap per attempt, and skips remaining models when under 1.2s is left — the
scripted in-character fallback line then answers instead of a platform timeout.
