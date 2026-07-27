import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const voiceRef = useRef(null); // stores the chosen SpeechSynthesisVoice

  // --- 1. Load voices ---
  // Browsers load voices async. We listen for voiceschanged, then pick the best one.
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return; // browser doesn't support it

    function pickVoice() {
      const voices = synth.getVoices();
      if (voices.length === 0) return; // not ready yet

      // Priority order for a clear, natural English female voice:
      // 1. Google UK English Female (Chrome)
      // 2. Google US English (Chrome fallback)
      // 3. Samantha (macOS/iOS)
      // 4. Any en-GB female
      // 5. Any en-US female
      // 6. First English voice available
      const preferred = [
        "Google UK English Female",
        "Google US English",
        "Samantha",
      ];

      let chosen =
        voices.find((v) => preferred.includes(v.name)) ||
        voices.find((v) => v.lang === "en-GB" && v.name.toLowerCase().includes("female")) ||
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("female")) ||
        voices.find((v) => v.lang.startsWith("en"));

      voiceRef.current = chosen || null;
      setVoicesReady(true);
    }

    // Try immediately (Firefox often has voices on first call)
    pickVoice();

    // Also listen for async load (Chrome/Edge need this)
    synth.addEventListener("voiceschanged", pickVoice);
    return () => synth.removeEventListener("voiceschanged", pickVoice);
  }, []);

  // --- 2. speak(text) ---
  // Cancels any current speech, creates a new utterance, speaks it.
  const speak = useCallback(
    (text) => {
      const synth = window.speechSynthesis;
      if (!synth || !text) return;

      // Always cancel first — avoids queuing multiple utterances
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Apply the chosen voice if we have one
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      // Tuning — these feel natural for a tutor:
      utterance.rate = 0.95;   // slightly slower than default (1.0) — easier to follow
      utterance.pitch = 1.05;  // very slightly higher — sounds warmer
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synth.speak(utterance);
    },
    [] // voiceRef is a ref, not state — no dependency needed
  );

  // --- 3. stop() ---
  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // --- 4. Cleanup on unmount ---
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { speak, stop, isSpeaking, voicesReady };
}