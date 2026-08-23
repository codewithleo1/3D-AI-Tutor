import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState(0);
  const [voicesReady, setVoicesReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const voiceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    function pickVoice() {
      const voices = synth.getVoices();
      if (voices.length === 0) return;

      const preferred = [
        "Google UK English Female",
        "Microsoft Zira - English (United States)",
        "Samantha",
        "Victoria",
        "Karen",
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

  function cleanForSpeech(text) {
    return text
      .replace(/`/g, "")                        // backticks
      .replace(/\*\*/g, "")                      // bold markdown
      .replace(/\*/g, "")                        // italic markdown
      .replace(/_/g, "")                         // underscores
      .replace(/<([^>]+)>/g, " $1 ")             // <variable> → variable
      .replace(/[<>]/g, "")                      // stray angle brackets
      .replace(/\(\)/g, "")                      // empty parens: range() → range
      .replace(/\(([^)]+)\)/g, " $1 ")           // range(5) → range 5
      .replace(/\[([^\]]+)\]/g, " $1 ")          // [item] → item
      .replace(/\{([^}]+)\}/g, " $1 ")           // {key} → key
      .replace(/→|->|=>|<-/g, " to ")            // arrows → "to"
      .replace(/!=/g, " not equal to ")          // != 
      .replace(/==/g, " equals ")                // ==
      .replace(/>=|<=/g, " or equal to ")        // >= <=
      .replace(/[#@$%^&]/g, "")                  // misc symbols
      .replace(/\s+/g, " ")                      // collapse extra spaces
      .trim()
  }

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;

    synth.cancel();

    // Split into sentences for natural pacing with pauses between
    const cleaned = cleanForSpeech(text)
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned]

    sentences.forEach((sentence, idx) => {
      const utterance = new SpeechSynthesisUtterance(sentence.trim())

      if (voiceRef.current) utterance.voice = voiceRef.current

      // Slightly slower for longer sentences (harder content)
      const wordCount = sentence.trim().split(" ").length
      utterance.rate = wordCount > 15 ? 0.85 : 0.92
      utterance.pitch = 1.08
      utterance.volume = 1.0

      if (idx === 0) utterance.onstart = () => setIsSpeaking(true)

      // Reset viseme to 0 at end of EVERY sentence — closes mouth during gaps
      utterance.onend = () => {
        setCurrentViseme(0)
        if (idx === sentences.length - 1) {
          setIsSpeaking(false)
        }
      }
      utterance.onerror = () => { setIsSpeaking(false); setCurrentViseme(0) }

      // Open mouth only on word boundaries — closes between words
      utterance.onboundary = (e) => {
        if (e.name === "word") {
          setCurrentViseme(prev => (prev % 14) + 1)
          // Reset after 300ms — mouth closes between words
          setTimeout(() => setCurrentViseme(0), 300)
        }
      }

      synth.speak(utterance)
    })
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) return resolve(null);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }, []);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    voicesReady,
    currentViseme,
    isRecording,
    startRecording,
    stopRecording,
  };
}