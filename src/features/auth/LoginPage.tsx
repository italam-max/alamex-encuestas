import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2, Sparkles, ArrowRight, Moon, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { user, signIn, loading: authLoading } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  if (!authLoading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center font-sans text-white relative overflow-hidden bg-[#020A1A]">

      {/* Dot grid estático */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-10"
        style={{
          backgroundImage:  'radial-gradient(#D4AF37 0.5px, transparent 0.5px), radial-gradient(#D4AF37 0.5px, transparent 0.5px)',
          backgroundSize:   '30px 30px',
          backgroundPosition: '0 0, 15px 15px',
        }}
      />

      {/* Blobs animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-[#D4AF37]/10 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-[20%] -right-[10%] w-[50vw] h-[50vw] bg-[#0A2463]/30 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[20%] left-[20%] w-[40vw] h-[40vw] bg-[#D4AF37]/5 rounded-full blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">

        {/* Logo con glow pulsante */}
        <div className="text-center mb-10">
          <div className="inline-flex relative group">
            <div className="absolute -inset-4 bg-[#D4AF37] rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 animate-pulse" />
            <div className="bg-black/30 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl border border-white/10 relative z-10 transform group-hover:scale-105 transition-transform duration-500">
              <img
                src="/images/logo-alamex.png"
                alt="Logo Alamex"
                className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                onError={e => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  el.parentElement!.innerHTML =
                    '<span style="font-family:\'Special Gothic\',sans-serif;font-size:36px;font-weight:900;color:#D4AF37;line-height:1">A</span>';
                }}
              />
            </div>
          </div>

          {/* ALAMEX */}
          <h1
            className="text-5xl md:text-6xl font-black text-white tracking-tight mt-8 mb-4 drop-shadow-2xl"
            style={{ fontFamily: "'Special Gothic', sans-serif" }}
          >
            ALAMEX
          </h1>

          {/* — Encuestas de Satisfacción — */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
            <p
              className="text-sm font-bold text-[#D4AF37] tracking-[0.25em] uppercase whitespace-nowrap"
              style={{ textShadow: '0 0 15px rgba(212,175,55,0.6), 0 0 30px rgba(212,175,55,0.2)' }}
            >
              Encuestas de Satisfacción
            </p>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
          </div>
        </div>

        {/* Card glassmorphism */}
        <div className="backdrop-blur-xl bg-black/40 p-8 md:p-10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden">

          {/* Línea dorada superior */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent opacity-70" />

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Moon className="text-[#D4AF37]" size={18} fill="#D4AF37" />
              Acceso Interno
            </h2>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>

            {error && (
              <div className="bg-red-900/40 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 animate-bounce-in">
                <AlertCircle className="text-red-400 shrink-0" size={18} />
                <p className="text-xs font-bold text-red-100">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.08em] pl-1 flex items-center gap-1.5">
                <Sparkles size={10} /> Usuario
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@alam.mx"
                  autoFocus
                  className="block w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium text-white placeholder-white/20 transition-all hover:bg-black/50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.08em] pl-1 flex items-center gap-1.5">
                <Sparkles size={10} /> Clave
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors" />
                </div>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium text-white placeholder-white/20 transition-all hover:bg-black/50"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors z-20 focus:outline-none"
                >
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Botón con shimmer */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-[#D4AF37]/30 rounded-xl shadow-[0_0_20px_-5px_rgba(212,175,55,0.2)] text-sm font-black text-[#0A2463] bg-gradient-to-r from-[#D4AF37] to-[#FBBF24] hover:to-[#D4AF37] transition-all transform hover:-translate-y-0.5 hover:shadow-[0_0_40px_-5px_rgba(212,175,55,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase mt-6 group relative overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="relative z-10">Entrar</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-white/50 mt-8 font-medium uppercase tracking-[0.3em]">
          © {new Date().getFullYear()} Alamex Elevadores
        </p>
      </div>
    </div>
  );
}
