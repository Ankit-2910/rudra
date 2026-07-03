# One en-IN recognizer + dual-script keyword matching covers English and Hindi

Confirmed approach for bilingual voice commands without two recognizers:
`SpeechRecognition` runs with `lang = "en-IN"`, which transcribes both English
and most Hinglish/Hindi command words (sometimes in Devanagari). Matching then
happens in `lib/rooms.ts` against keyword lists that include English, Roman
Hindi, and Devanagari forms per room ("finance", "फाइनेंस", "paisa"...), plus
global "go back"/"वापस" and "proposal"/"प्रस्ताव" commands. All alternatives
from `maxAlternatives: 3` are joined into one string before matching, which
raises the hit rate on short utterances.

For speech output, the utterance language is chosen per reply: a Devanagari
regex on the text picks `hi-IN`, otherwise `en-IN`.
