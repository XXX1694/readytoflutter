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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="text-center mb-4">
              <span className="text-5xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
              {t.somethingWentWrong}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center">
              {t.unexpectedError}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer mb-2">
                  {t.errorDetails}
                </summary>
                <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-flutter-blue hover:bg-[#0168c1] text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {t.refreshPage}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-lg transition-colors"
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
