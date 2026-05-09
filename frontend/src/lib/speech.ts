/**
 * Thin wrapper around the Web Speech API recognition side. Mirrors `tts`:
 * a tiny singleton-style module so only one mic session is active at a time.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// SpeechRecognition isn't in the standard DOM lib for non-WebKit browsers.
// We'll use a structural any here — the API surface we touch is small
// (start/stop/abort/onresult/onerror/onend) and stable.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionLike) => void) | null;
  onerror: ((this: SpeechRecognitionLike, e: { error?: string }) => void) | null;
  onend: ((this: SpeechRecognitionLike) => void) | null;
  onresult: ((this: SpeechRecognitionLike, e: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [k: number]: { transcript?: string };
  }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

function langTag(lang: 'en' | 'ru'): string {
  return lang === 'ru' ? 'ru-RU' : 'en-US';
}

export interface UseSpeechRecognitionOptions {
  lang?: 'en' | 'ru';
  onFinal?: (text: string) => void;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * useSpeechRecognition — append-style mic. `onFinal(text)` fires for each
 * finalized chunk; `interim` is the live partial transcript for UI feedback.
 */
export function useSpeechRecognition({
  lang = 'en',
  onFinal,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult {
  const [supported] = useState<boolean>(isSpeechRecognitionSupported);
  const [listening, setListening] = useState<boolean>(false);
  const [interim, setInterim] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechRecognitionLike | null>(null);
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
      setError((err as Error)?.message || 'start_failed');
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
