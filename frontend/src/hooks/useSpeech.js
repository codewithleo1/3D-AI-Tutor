import { useState, useEffect, useRef, useCallback } from "react";

// Rough grapheme -> viseme index map (matches VISEME_MAP in Avatar.jsx).
// Web Speech gives no phonemes, so we approximate lip shapes from letters.
const CHAR_VISEME = {
  a: 10, e: 11, i: 12, o: 13, u: 14,
  p: 1, b: 1, m: 1,
  f: 2, v: 2,
  t: 4, d: 4,
  k: 5, g: 5, c: 5, q: 5, x: 5,
  j: 6,
  s: 7, z: 7,
  n: 8, l: 8,
  r: 9,
  h: 10, y: 12, w: 14,
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [currentViseme, setCurrentViseme] = useState(0);
  const voiceRef = useRef(null);
  const textRef = useRef("");
  const cursorRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    function pickVoice() {
      const voices = synth.getVoices();
      if (voices.length === 0) return;
      const preferred = [
        "Google UK English Female",
        "Microsoft Zira - English (United States)",
        "Samantha", "Victoria", "Karen",
        "Google US English",
      ];
      let chosen = null;
      for (const name of preferred) {
        const match = voices.find((v) => v.name === name);
        if (match) { chosen = match; break; }
      }
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

  function stopVisemeLoop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentViseme(0);
  }

  function startVisemeLoop() {
    stopVisemeLoop();
    // Step through characters, mapping each to an approximate mouth shape.
    intervalRef.current = setInterval(() => {
      const text = textRef.current;
      if (!text) return;
      // advance to the next letter
      let idx = cursorRef.current;
      let guard = 0;
      while (idx < text.length && !/[a-z]/i.test(text[idx]) && guard < 40) { idx++; guard++; }
      if (idx >= text.length) idx = 0; // loop within the utterance
      const ch = (text[idx] || "").toLowerCase();
      const v = CHAR_VISEME[ch] ?? 0;
      setCurrentViseme(v);
      cursorRef.current = idx + 1;
    }, 85);
  }

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;

    synth.cancel();
    stopVisemeLoop();

    textRef.current = text;
    cursorRef.current = 0;

    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1.0;

    // Keep the mouth roughly in sync with the spoken word position.
    utterance.onboundary = (e) => {
      if (typeof e.charIndex === "number") cursorRef.current = e.charIndex;
    };
    utterance.onstart = () => { setIsSpeaking(true); startVisemeLoop(); };
    utterance.onend = () => { setIsSpeaking(false); stopVisemeLoop(); };
    utterance.onerror = () => { setIsSpeaking(false); stopVisemeLoop(); };

    synth.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    stopVisemeLoop();
  }, []);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); stopVisemeLoop(); };
  }, []);

  return { speak, stop, isSpeaking, voicesReady, currentViseme };
}
