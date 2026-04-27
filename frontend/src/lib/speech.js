/**
 * Thin wrapper around the Web Speech API recognition side. Mirrors `tts.js`:
 * a tiny singleton-style module so only one mic session is active at a time.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionCtor());
}

function langTag(lang) {
  return lang === 'ru' ? 'ru-RU' : 'en-US';
}

/**
 * useSpeechRecognition — append-style mic. `onFinal(text)` fires for each
 * finalized chunk; `interim` is the live partial transcript for UI feedback.
 */
export function useSpeechRecognition({ lang = 'en', onFinal } = {}) {
  const [supported] = useState(isSpeechRecognitionSupported);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const recognizerRef = useRef(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const stop = useCallback(() => {
    const r = recognizerRef.current;
    if (!r) return;
    try { r.stop(); } catch { /* noop */ }
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) { setError('unsupported'); return; }
    // Cancel any prior session before opening a new one.
    if (recognizerRef.current) {
      try { recognizerRef.current.abort(); } catch { /* noop */ }
      recognizerRef.current = null;
    }
    const r = new Ctor();
    r.lang = langTag(lang);
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => { setListening(true); setError(null); };
    r.onerror = (e) => {
      setError(e?.error || 'error');
      setListening(false);
      setInterim('');
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      recognizerRef.current = null;
    };
    r.onresult = (e) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        const txt = res[0]?.transcript || '';
        if (res.isFinal) finalChunk += txt;
        else interimChunk += txt;
      }
      if (interimChunk) setInterim(interimChunk);
      if (finalChunk) {
        setInterim('');
        onFinalRef.current?.(finalChunk);
      }
    };

    recognizerRef.current = r;
    try { r.start(); }
    catch (err) {
      setError(err?.message || 'start_failed');
      recognizerRef.current = null;
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  // Always release the mic when the host component unmounts.
  useEffect(() => () => {
    const r = recognizerRef.current;
    if (r) { try { r.abort(); } catch { /* noop */ } }
    recognizerRef.current = null;
  }, []);

  return { supported, listening, interim, error, start, stop, toggle };
}
