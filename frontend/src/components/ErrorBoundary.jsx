import { Component } from 'react';
import { UI } from '../i18n/ui.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const lang = localStorage.getItem('lang') || 'en';
      const t = UI[lang] || UI.en;

      return (
        <div className="bg-page min-h-dvh flex items-center justify-center px-4">
          <div className="relative max-w-md w-full overflow-hidden rounded-2xl border border-rule/8 bg-paper-2 p-8 shadow-[0_2px_4px_0_rgb(var(--shadow)/0.06),0_24px_64px_-12px_rgb(var(--shadow)/0.16)]">
            {/* Coral aurora glow */}
            <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-coral/20 via-amber/10 to-transparent blur-3xl" />
            <div className="relative">
              <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-coral/20 to-coral/5 ring-1 ring-coral/30">
                <span className="font-display text-2xl">!</span>
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-2 text-center">
                {t.somethingWentWrong}
              </h1>
              <p className="text-sm text-muted mb-5 text-center">
                {t.unexpectedError}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-5">
                  <summary className="text-[11px] font-mono uppercase tracking-wider text-muted cursor-pointer mb-2">
                    {t.errorDetails}
                  </summary>
                  <pre className="text-xs bg-paper p-3 rounded-xl border border-rule/12 overflow-auto max-h-48 text-ink-2 font-mono">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white text-sm px-4 py-2.5 font-medium shadow-[0_1px_2px_0_rgb(var(--brand)/0.30),0_8px_24px_-6px_rgb(var(--brand)/0.40)] transition-all hover:-translate-y-px"
                >
                  {t.refreshPage}
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 rounded-xl bg-paper-2 text-ink text-sm px-4 py-2.5 font-medium border border-rule/15 transition-all hover:bg-rule/5 hover:border-rule/25"
                >
                  {t.goHome}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
