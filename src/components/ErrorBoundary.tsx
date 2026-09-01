/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRITICAL APPLICATION ERROR CAUGHT BY ERROR BOUNDARY]:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoToLogin = () => {
    window.location.hash = '#/login';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen bg-[#FAF6F0] neo-grid-bg flex items-center justify-center p-4 font-body"
          id="app-error-boundary"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl neo-border neo-shadow-lg p-6 md:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#FF8B7B] neo-border flex items-center justify-center text-3xl mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8 text-gray-900" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#FF8B7B] block font-display">
                EMKAIN SYSTEM RECOVERY
              </span>
              <h1 className="text-2xl font-black text-gray-900 font-display uppercase tracking-tight">
                Terjadi Kendala Tampilan
              </h1>
              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Aplikasi mendeteksi adanya kendala saat memuat modul antarmuka. Anda dapat menyegarkan halaman atau kembali ke halaman login.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-left overflow-x-auto max-h-32 text-xs font-mono text-red-800">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-[#FFD166] text-gray-900 neo-border rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
                id="btn-error-reload"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                onClick={this.handleGoToLogin}
                className="w-full py-3 px-4 bg-[#B4D3FF] text-gray-900 neo-border rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
                id="btn-error-login"
              >
                <LogIn className="w-4 h-4" />
                <span>Ke Halaman Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
