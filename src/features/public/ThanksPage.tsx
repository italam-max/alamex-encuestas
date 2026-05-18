import { CheckCircle } from 'lucide-react';

const F = "'Special Gothic', sans-serif";

export default function ThanksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F7F2] relative overflow-hidden">
      <div className="absolute inset-0 arabesque-pattern opacity-20 pointer-events-none" />

      {/* Header */}
      <div
        className="relative z-10 flex items-center px-6 py-3 shrink-0"
        style={{ background: 'linear-gradient(to right,#051338,#0A2463,#051338)', borderBottom: '1px solid rgba(212,175,55,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#D4AF37] font-black text-base" style={{ background: 'rgba(212,175,55,0.15)', fontFamily: F }}>A</div>
          <span className="text-white font-bold text-sm" style={{ fontFamily: F }}>ALAMEX</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md animate-bounce-in">
          <div className="relative inline-flex mb-8">
            <div className="absolute -inset-4 bg-[#D4AF37] rounded-full blur-xl opacity-20 animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center relative z-10">
              <CheckCircle size={48} className="text-emerald-500" />
            </div>
          </div>

          <h1 className="text-4xl font-black text-[#0A2463] mb-3" style={{ fontFamily: F }}>
            ¡Gracias!
          </h1>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
            <p className="text-sm font-bold text-[#D4AF37] tracking-[0.15em] uppercase whitespace-nowrap">
              Respuesta registrada
            </p>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
          </div>

          <div className="luxury-glass rounded-2xl border p-7 text-left space-y-3 shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.25)' }}>
            <p className="text-[#0A2463]/80 text-sm leading-relaxed">
              Tu opinión ha sido registrada exitosamente. En <strong>Alamex Elevadores</strong> valoramos profundamente
              cada retroalimentación que recibimos — nos ayuda a mejorar continuamente nuestros servicios.
            </p>
            <p className="text-[#0A2463]/60 text-sm">
              Si tienes alguna duda o comentario adicional, no dudes en contactarnos.
            </p>
          </div>

          <p className="text-xs text-[#0A2463]/30 mt-8 uppercase tracking-[0.2em] font-medium">
            Puedes cerrar esta ventana
          </p>
        </div>
      </div>

      <p className="relative z-10 text-center text-[10px] text-[#0A2463]/25 py-4 font-medium uppercase tracking-[0.3em]">
        © {new Date().getFullYear()} Alamex Elevadores
      </p>
    </div>
  );
}
