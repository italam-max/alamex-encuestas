import { Component, type ReactNode } from 'react';

interface Props    { children: ReactNode; }
interface State    { hasError: boolean; message: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="h-full flex items-center justify-center bg-[#F9F7F2]">
        <div
          className="luxury-glass rounded-2xl p-10 max-w-md text-center border shadow-lg"
          style={{ borderColor: 'rgba(239,68,68,0.2)' }}
        >
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <h2 className="font-black text-[#0A2463] text-lg mb-2" style={{ fontFamily: "'Special Gothic', sans-serif" }}>
            Algo salió mal
          </h2>
          <p className="text-sm text-[#0A2463]/60 mb-6">{this.state.message}</p>
          <button
            className="btn-primary mx-auto"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
