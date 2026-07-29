import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    function pickVoice() {
      const voices = synth.getVoices();
      if (voices.length === 0) return;

      // Priority list — checked IN ORDER, first match wins.
      // Exact names from your Chrome voice list:
      const preferred = [
        "Google UK English Female",          // Chrome — best female voice
        "Microsoft Zira - English (United States)", // Windows fallback female
        "Samantha",                           // macOS
        "Victoria",                           // macOS alt
        "Karen",                              // macOS/iOS
        "Google US English",                  // Chrome — neutral, not male-named
      ];

      // Iterate preferred list in order — first voice found in browser wins
      let chosen = null;
      for (const name of preferred) {
        const match = voices.find((v) => v.name === name);
        if (match) { chosen = match; break; }
      }

      // Broader fallbacks if none of the above exist
      if (!chosen) {
        chosen =
          voices.find((v) => v.name.toLowerCase().includes("female") && v.lang.startsWith("en")) ||
          voices.find((v) => v.lang === "en-GB") ||
          voices.find((v) => v.lang === "en-US" && !v.name.toLowerCase().includes("david") && !v.name.toLowerCase().includes("mark")) ||
          voices.find((v) => v.lang.startsWith("en"));
      }

      voiceRef.current = chosen || null;
      setVoicesReady(true);
    }

    pickVoice();
    synth.addEventListener("voiceschanged", pickVoice);
    return () => synth.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.rate = 0.92;   // slightly slower — easier to follow
    utterance.pitch = 1.08;  // slightly higher — sounds warmer/more feminine
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  return { speak, stop, isSpeaking, voicesReady };
}