import { Component, type ErrorInfo, type ReactNode } from 'react';
import { UI } from '../i18n/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  override render() {
    if (this.state.hasError) {
      const lang = (localStorage.getItem('lang') === 'ru' ? 'ru' : 'en') as 'en' | 'ru';
      const t = UI[lang] || UI.en;

      return (
        <div className="bg-page flex min-h-dvh items-center justify-center px-4">
          <div className="w-full max-w-md rounded-lg border border-rule/12 bg-paper-2 p-8">
            <p className="eyebrow mb-3">{t.errorDetails}</p>
            <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
              {t.somethingWentWrong}
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-muted">{t.unexpectedError}</p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6">
                <summary className="mb-2 cursor-pointer text-[12px] text-muted">
                  {t.errorDetails}
                </summary>
                <pre className="max-h-48 overflow-auto rounded border border-rule/12 bg-paper p-3 font-mono text-xs text-ink-2">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink-2"
              >
                {t.refreshPage}
              </button>
              {/* BASE_URL, not '/': on a sub-path deploy (GitHub Pages serves
                  this app under /<repo>/) a bare '/' navigates out of the app
                  entirely and lands on the user's Pages root. */}
              <button
                onClick={() => { window.location.href = import.meta.env.BASE_URL; }}
                className="flex-1 rounded border border-rule/15 bg-paper-2 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-rule/25 hover:bg-rule/5"
              >
                {t.goHome}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
