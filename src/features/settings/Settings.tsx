import { useState, useEffect } from 'react';
import { Settings2, User, Shield, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const F = "'Special Gothic', sans-serif";

const ROLE_CSS: Record<UserRole, string> = {
  admin:  'bg-purple-50 text-purple-700 border-purple-200',
  editor: 'bg-blue-50 text-blue-700 border-blue-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface ProfileRow {
  id: string; display_name: string; display_title: string | null;
  role: UserRole; avatar_url: string | null; created_at: string;
  email?: string;
}

export default function Settings() {
  const { profile, isAdmin } = useAuth();

  const [users,   setUsers]   = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [name,    setName]    = useState(profile?.display_name ?? '');
  const [title,   setTitle]   = useState(profile?.display_title ?? '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    supabase.from('profiles').select('*').order('created_at').then(({ data }) => {
      setUsers((data as ProfileRow[]) ?? []);
      setLoading(false);
    });
  }, [isAdmin]);

  const saveProfile = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError(null);
    const { error: err } = await db.from('profiles')
      .update({ display_name: name, display_title: title || null })
      .eq('id', profile?.id ?? '');
    if (err) { setError(err.message); } else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const changeRole = async (userId: string, role: UserRole) => {
    await db.from('profiles').update({ role }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="px-6 py-5 flex items-center justify-between backdrop-blur-md border-b shadow-sm shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(250,252,255,0.84),rgba(255,249,232,0.70))', borderColor: 'rgba(184,149,30,0.24)' }}
      >
        <h1 className="text-xl font-bold text-[#0A2463] flex items-center gap-2" style={{ fontFamily: F }}>
          <Settings2 className="text-[#D4AF37]" size={18} />
          Configuración
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">

          {/* Mi perfil */}
          <div className="luxury-glass rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
              <User size={16} className="text-[#D4AF37]" />
              <p className="font-bold text-[#0A2463] text-sm" style={{ fontFamily: F }}>Mi perfil</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-[0.08em]">Nombre visible</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-base mt-1" placeholder="Tu nombre completo" />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-[0.08em]">Cargo / Título</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-base mt-1" placeholder="Ej: Administrador IT" />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#0A2463]/50 uppercase tracking-[0.08em]">Rol actual</label>
                <div className="mt-1">
                  <span className={`inline-block text-xs font-black uppercase tracking-[0.08em] px-3 py-1 rounded-full border ${ROLE_CSS[profile?.role ?? 'viewer']}`}>
                    {profile?.role}
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={14} className="shrink-0" />{error}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button className="btn-primary" onClick={saveProfile} disabled={saving || saved}>
                  {saved ? <Check size={14} /> : saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

          {/* Usuarios (solo admin) */}
          {isAdmin && (
            <div className="luxury-glass rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(184,149,30,0.15)' }}>
                <Shield size={16} className="text-[#D4AF37]" />
                <p className="font-bold text-[#0A2463] text-sm" style={{ fontFamily: F }}>Gestión de usuarios</p>
              </div>
              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#D4AF37]" size={20} /></div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(184,149,30,0.08)' }}>
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: 'linear-gradient(135deg,#0A2463,#1B3564)', color: '#D4AF37' }}>
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0A2463] truncate">{u.display_name}</p>
                        <p className="text-xs text-[#0A2463]/50 truncate">{u.display_title ?? 'Sin cargo asignado'}</p>
                      </div>
                      {u.id === profile?.id ? (
                        <span className={`text-[10px] font-black uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border ${ROLE_CSS[u.role]}`}>{u.role} (tú)</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value as UserRole)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-[#0A2463] outline-none focus:border-[#D4AF37]"
                        >
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(184,149,30,0.10)', background: 'rgba(10,36,99,0.02)' }}>
                <p className="text-xs text-[#0A2463]/40">Los nuevos usuarios se crean desde Supabase Authentication → New User.</p>
              </div>
            </div>
          )}

          {/* Sobre la aplicación */}
          <div className="luxury-glass rounded-xl border p-5 shadow-sm" style={{ borderColor: 'rgba(184,149,30,0.20)' }}>
            <p className="text-xs font-black text-[#0A2463]/40 uppercase tracking-[0.08em] mb-3">Sobre la aplicación</p>
            <div className="space-y-1.5 text-xs text-[#0A2463]/60">
              <p>Alamex Encuestas de Satisfacción · v1.0</p>
              <p>React 19 + TypeScript + Tailwind CSS v4 + Supabase</p>
              <p>Envío de correos: ZeptoMail · Hospedaje: Netlify</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
