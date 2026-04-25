/**
 * Tiny wrapper around the Web Speech API. We treat it as a singleton: only one
 * thing is "speaking" at a time across the app. Components subscribe to know
 * which utterance is currently playing.
 */

let currentToken = 0;
let currentUtterance = null;
const listeners = new Set();

function emit() {
  for (const cb of listeners) cb();
}

function pickVoice(lang) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const want = lang === 'ru' ? 'ru' : 'en';
  // Prefer the highest-quality voice available for the lang
  const preferred = voices.find((v) => v.lang.startsWith(want) && /Google|Microsoft|Yandex|Premium/i.test(v.name));
  return preferred || voices.find((v) => v.lang.startsWith(want)) || voices[0];
}

export function isTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text, { lang = 'en', rate = 1, onEnd } = {}) {
  if (!isTtsSupported() || !text) return null;
  const synth = window.speechSynthesis;
  // Cancel any ongoing speech
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = lang === 'ru' ? 'ru-RU' : 'en-US';
  u.rate = rate;
  u.pitch = 1;

  const token = ++currentToken;
  currentUtterance = u;
  emit();

  u.onend = () => {
    if (token === currentToken) {
      currentUtterance = null;
      emit();
      onEnd?.();
    }
  };
  u.onerror = () => {
    if (token === currentToken) {
      currentUtterance = null;
      emit();
    }
  };

  synth.speak(u);
  return token;
}

export function stop() {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  currentToken += 1;
  emit();
}

export function isSpeaking() {
  return Boolean(currentUtterance);
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Voices on Chrome/Safari load asynchronously — preload by triggering getVoices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Touch once so the voice list begins populating
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    /* re-emit so any cached pickVoice gets the new list */
    emit();
  };
}
