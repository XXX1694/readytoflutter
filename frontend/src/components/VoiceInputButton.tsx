import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../lib/speech';
import { Button, type ButtonProps } from '../ui/index';
import { cn } from '../lib/cn';

const labels = {
  ru: { idle: 'Голос', listening: 'Слушаю…', start: 'Голосовой ввод', stop: 'Остановить запись', unsupported: 'Голос недоступен' },
  en: { idle: 'Voice', listening: 'Listening…', start: 'Voice input', stop: 'Stop recording', unsupported: 'Voice unsupported' },
};

/**
 * VoiceInputButton
 *
 * Mounts a mic toggle next to a textarea/input. Calls `onAppend(chunk)` for
 * each finalized phrase so the parent can splice it into its current value.
 * Also shows live interim text inline so the user sees progress.
 */
type SpeechLang = keyof typeof labels;

export interface VoiceInputButtonProps {
  lang?: SpeechLang;
  /** Called once per finalized phrase, so the parent can splice it in. */
  onAppend?: (chunk: string) => void;
  size?: ButtonProps['size'];
  className?: string;
  showInterim?: boolean;
}

export default function VoiceInputButton({
  lang = 'en',
  onAppend,
  size = 'sm',
  className,
  showInterim = true,
}: VoiceInputButtonProps) {
  const { supported, listening, interim, error, toggle } = useSpeechRecognition({
    lang,
    onFinal: (text: string) => {
      const trimmed = text.trim();
      if (trimmed) onAppend?.(trimmed);
    },
  });

  const L = labels[lang] || labels.en;

  if (!supported) {
    return (
      <span
        title={L.unsupported}
        className={cn('inline-flex items-center gap-1 text-[12px] text-muted-2', className)}
      >
        <MicOff className="h-3 w-3" aria-hidden /> {L.unsupported}
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button
        type="button"
        variant={listening ? 'brand' : 'outline'}
        size={size}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? L.stop : L.start}
        title={listening ? L.stop : L.start}
        className={cn(listening && 'border-coral/30 bg-coral/12 text-coral')}
      >
        <Mic className={cn('h-3.5 w-3.5', listening && 'animate-pulse')} aria-hidden />
        <span>{listening ? L.listening : L.idle}</span>
      </Button>
      {/* Screen-reader-only state announcement. */}
      <span role="status" aria-live="polite" className="sr-only">
        {listening ? L.listening : ''}
      </span>
      {showInterim && listening && interim && (
        <span
          role="status"
          aria-live="polite"
          className="hidden truncate text-[12px] text-muted sm:inline"
          title={interim}
        >
          {interim.length > 32 ? `…${interim.slice(-32)}` : interim}
        </span>
      )}
      {error && error !== 'aborted' && error !== 'no-speech' && !listening && (
        <span role="alert" className="text-[12px] text-coral">
          {error}
        </span>
      )}
    </div>
  );
}
