import {
  useState,
  type FocusEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * A field is a label row (optionally carrying a control on its right), the
 * control itself, and either an error or a hint underneath. `onChange` hands
 * over the value rather than the event so call sites read as
 * `onChange={setName}`; everything else is a plain input attribute and passes
 * straight through.
 *
 * Focus is drawn by the global `:focus-visible` ring in index.css — no field
 * here sets its own outline.
 */
export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className'> {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
  /** Optional so `readOnly` fields, which have nothing to report, can omit it. */
  onChange?: (value: string) => void;
}

export function TextField({
  label, hint, error, trailing, onChange, readOnly, ...input
}: TextFieldProps) {
  return (
    <Frame label={label} hint={hint} error={error} trailing={trailing}>
      <input
        {...input}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={recenterOnFocus}
        autoCorrect="off"
        spellCheck={false}
        readOnly={readOnly}
        disabled={readOnly}
        aria-invalid={!!error}
        className={cn(controlClass(!!error), readOnly && 'cursor-not-allowed text-muted')}
      />
    </Frame>
  );
}

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'className'> {
  label: string;
  error?: string | null;
  onChange: (value: string) => void;
}

/** Same frame and control skin as `TextField`, for prose-length answers. */
export function TextArea({ label, error, onChange, ...textarea }: TextAreaProps) {
  return (
    <Frame label={label} error={error}>
      <textarea
        {...textarea}
        onChange={(e) => onChange(e.target.value)}
        onFocus={recenterOnFocus}
        aria-invalid={!!error}
        className={cn(controlClass(!!error), 'resize-y')}
      />
    </Frame>
  );
}

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'trailing'> {
  autoComplete: 'current-password' | 'new-password';
  /** Already-translated aria-labels for the reveal toggle. */
  showLabel: string;
  hideLabel: string;
}

/** Visibility is per-field state — two password fields toggle independently. */
export function PasswordField({ showLabel, hideLabel, ...field }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...field}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? hideLabel : showLabel}
          // The label row is 20px tall; the negative margins let the button
          // reach a 36px hit area without pushing the row apart.
          className="-my-2 -mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    />
  );
}

function Frame({ label, hint, error, trailing, children }: {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {trailing}
      </div>
      {children}
      {error
        ? <span className="mt-1.5 block text-[12px] text-coral">{error}</span>
        : hint && <span className="mt-1.5 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

const controlClass = (hasError: boolean): string => cn(
  'w-full rounded-md border bg-paper px-3 py-2.5 text-[15px] text-ink',
  'placeholder:text-muted-2 transition-colors',
  hasError ? 'border-coral/50' : 'border-rule/15 focus:border-rule/30',
);

// Re-center the focused field on phones — iOS often hides it behind the
// virtual keyboard otherwise.
const recenterOnFocus = (e: FocusEvent<HTMLElement>): void => {
  const target = e.currentTarget;
  setTimeout(() => {
    try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    catch { /* older Safari */ }
  }, 250);
};
