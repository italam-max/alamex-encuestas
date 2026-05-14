import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

const F = "'Special Gothic', sans-serif";

export default function PublicLinkPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate     = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;

    const fn = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-survey?surveyId=${surveyId}`,
          { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        if (!res.ok || !data.token) throw new Error(data.error ?? 'No disponible');
        navigate(`/s/${data.token}`, { replace: true });
      } catch {
        setError('Esta encuesta no está disponible o ya fue cerrada.');
      }
    };

    fn();
  }, [surveyId, navigate]);

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F7F2] p-6 text-center">
      <AlertCircle size={40} className="text-red-400 mb-4" />
      <h2 className="text-xl font-bold text-[#0A2463]" style={{ fontFamily: F }}>Enlace no disponible</h2>
      <p className="text-sm text-[#0A2463]/60 mt-2 max-w-sm">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F7F2]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-[#D4AF37] font-black text-xl"
          style={{ background: 'rgba(212,175,55,0.12)', fontFamily: F }}
        >A</div>
        <Loader2 className="animate-spin text-[#D4AF37]" size={28} />
        <p className="text-sm text-[#0A2463]/50">Preparando tu encuesta…</p>
      </div>
    </div>
  );
}
