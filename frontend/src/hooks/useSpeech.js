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

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); setCurrentViseme(0); };
    utterance.onerror = () => { setIsSpeaking(false); setCurrentViseme(0); };
    utterance.onboundary = (e) => {
      if (e.name === "word") {
        setCurrentViseme(prev => (prev % 14) + 1);
      }
    };

    synth.speak(utterance);
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