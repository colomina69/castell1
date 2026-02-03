'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield } from '@/components/Shield';
import { User, Mail, Phone, Calendar, LogOut, Loader2, Award, ShieldCheck, Euro } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useRouter } from 'next/navigation';

interface SocioData {
    id: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    email: string;
    telefono: string;
    fecha_nacimiento: string;
    cuota_id: string | null;
}

interface Quota {
    nombre: string;
    monto: number;
}

interface Transaction {
    id: string;
    tipo: 'cobro' | 'pago';
    monto: number;
    concepto: string;
    fecha: string;
    estado: 'pendiente' | 'completado' | 'cancelado';
}

interface Evento {
    id: string;
    denominacion: string;
    fecha: string;
    descripcion: string | null;
    ubicacion: string | null;
    precio_socio: number;
    precio_invitado: number;
    desfile: boolean;
    itinerario_desfile: string | null;
    fecha_limite: string;
}

interface Inscripcion {
    evento_id: string;
}

export default function PerfilPage() {
    const [socio, setSocio] = useState<SocioData | null>(null);
    const [quota, setQuota] = useState<Quota | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [misInscripciones, setMisInscripciones] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [registeringEvento, setRegisteringEvento] = useState<Evento | null>(null);
    const [registrationForm, setRegistrationForm] = useState({
        grupo: '',
        numero_invitados: '0'
    });
    const router = useRouter();

    useEffect(() => {
        const fetchSocioData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'admin') setIsAdmin(true);

            // Buscar los datos del socio vinculados por email
            const { data, error } = await supabase
                .from('socios')
                .select('*')
                .eq('email', user.email)
                .single();

            if (data) {
                setSocio(data);

                // Fetch Quota Details
                if (data.cuota_id) {
                    const { data: qData } = await supabase
                        .from('cuotas')
                        .select('nombre, monto')
                        .eq('id', data.cuota_id)
                        .single();
                    if (qData) setQuota(qData);
                }

                // Fetch Transactions
                const { data: tData } = await supabase
                    .from('pagos_cobros')
                    .select('*')
                    .eq('socio_id', data.id)
                    .order('fecha', { ascending: false });
                if (tData) setTransactions(tData);

                // Fetch Events
                const { data: eData } = await supabase
                    .from('eventos')
                    .select('*')
                    .gte('fecha', new Date().toISOString())
                    .order('fecha', { ascending: true });
                if (eData) setEventos(eData);

                // Fetch My Registrations
                const { data: iData } = await supabase
                    .from('inscripciones_eventos')
                    .select('evento_id')
                    .eq('socio_id', data.id);
                if (iData) setMisInscripciones(iData.map(i => i.evento_id));
            }
            setLoading(false);
        };

        fetchSocioData();
    }, [router]);

    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!socio || !registeringEvento) return;

        setLoading(true);
        const { error } = await supabase
            .from('inscripciones_eventos')
            .insert([{
                evento_id: registeringEvento.id,
                socio_id: socio.id,
                grupo: registrationForm.grupo,
                numero_invitados: parseInt(registrationForm.numero_invitados) || 0
            }]);

        if (!error) {
            setMisInscripciones([...misInscripciones, registeringEvento.id]);
            setRegisteringEvento(null);
            setRegistrationForm({ grupo: '', numero_invitados: '0' });
        } else {
            console.error('Error al registrarse:', error.message);
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    if (loading && !socio) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
            <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
            <p className="text-fila-dark font-bold">Cargando tu perfil de socio...</p>
        </div>
    );

    return (
        <main className="min-h-screen bg-fila-light">
            <Navbar showLogout onLogout={handleSignOut} />

            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Profile Card */}
                <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-fila-gold/10">
                    {/* Header Decor */}
                    <div className="h-32 bg-gradient-to-r from-fila-green to-fila-dark relative">
                        <div className="absolute inset-0 opacity-10 flex items-center justify-center overflow-hidden">
                            <div className="scale-150 transform -rotate-12 translate-y-10">
                                <Shield />
                            </div>
                        </div>
                    </div>

                    <div className="px-8 md:px-12 pb-12 relative">
                        {/* Avatar Overlay */}
                        <div className="absolute -top-16 left-8 md:left-12">
                            <div className="w-32 h-32 rounded-[32px] bg-white p-2 shadow-2xl">
                                <div className="w-full h-full bg-fila-light rounded-[24px] flex items-center justify-center text-fila-gold">
                                    <User size={60} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-20 mb-12">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <h1 className="text-4xl font-black text-fila-dark tracking-tighter uppercase mb-2">
                                        {socio?.nombre} <br />
                                        <span className="text-fila-gold">{socio?.primer_apellido} {socio?.segundo_apellido}</span>
                                    </h1>
                                    <div className="inline-flex items-center gap-2 bg-fila-green/10 text-fila-green px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                        <Award size={14} />
                                        <span>Socio Activo</span>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-end">
                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            className="bg-fila-gold text-white px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase shadow-lg shadow-fila-gold/20 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <ShieldCheck size={16} />
                                            Panel Admin
                                        </Link>
                                    )}
                                    <div className="bg-fila-light px-6 py-3 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Cuota</p>
                                        <p className="text-xl font-black text-fila-green leading-none whitespace-nowrap">
                                            {quota ? quota.nombre : 'Sin asignar'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Info Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 bg-fila-light/50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-fila-gold">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email Oficial</p>
                                    <p className="font-bold text-fila-dark">{socio?.email}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-fila-light/50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-fila-gold">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Teléfono</p>
                                    <p className="font-bold text-fila-dark">{socio?.telefono || 'No disponible'}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-fila-light/50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-fila-gold">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Fecha Nacimiento</p>
                                    <p className="font-bold text-fila-dark">{socio?.fecha_nacimiento || 'No disponible'}</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Next Events Panel */}
                <div className="mt-12 bg-white rounded-[40px] shadow-2xl border border-fila-gold/10 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-fila-light/30 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fila-gold flex items-center justify-center text-white">
                                <Calendar size={18} />
                            </div>
                            <h3 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Próximos Eventos</h3>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {eventos.length > 0 ? (
                            eventos.map((e) => (
                                <div key={e.id} className="p-8 hover:bg-fila-light/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black text-fila-dark uppercase tracking-tight">{e.denominacion}</h4>
                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-fila-gold" />
                                                <span>{new Date(e.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-fila-gold" />
                                                <span>{e.ubicacion || 'Por determinar'}</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${new Date(e.fecha_limite) < new Date() ? 'text-red-500' : 'text-orange-500'}`}>
                                                <Clock size={14} />
                                                <span>Límite: {new Date(e.fecha_limite).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {misInscripciones.includes(e.id) ? (
                                            <div className="flex items-center gap-2 bg-green-50 text-green-600 px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase border border-green-100">
                                                <ShieldCheck size={16} />
                                                <span>Inscrito</span>
                                            </div>
                                        ) : new Date(e.fecha_limite) < new Date() ? (
                                            <div className="flex items-center gap-2 bg-gray-100 text-gray-400 px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase border border-gray-200 cursor-not-allowed">
                                                <Clock size={16} />
                                                <span>Plazo Cerrado</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setRegisteringEvento(e)}
                                                className="bg-fila-dark text-white px-8 py-3 rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-black transition-all shadow-lg shadow-fila-dark/20"
                                            >
                                                Apuntarse
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 font-medium italic">No hay eventos próximos programados.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Panel */}
                <div className="mt-12 bg-white rounded-[40px] shadow-2xl border border-fila-gold/10 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fila-dark flex items-center justify-center text-white">
                                <Euro size={18} />
                            </div>
                            <h3 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Historial de Cuotas y Pagos</h3>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {transactions.length > 0 ? (
                            transactions.map((t) => (
                                <div key={t.id} className="p-6 hover:bg-fila-light/30 transition-all flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.tipo === 'pago' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            <Euro size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-fila-dark">{t.concepto}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-lg ${t.tipo === 'pago' ? 'text-green-600' : 'text-fila-dark'}`}>
                                            {t.tipo === 'pago' ? '+' : '-'}{t.monto}€
                                        </p>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${t.estado === 'completado' ? 'bg-green-50 text-green-600' :
                                            t.estado === 'pendiente' ? 'bg-orange-50 text-orange-600' :
                                                'bg-gray-50 text-gray-400'
                                            }`}>
                                            {t.estado}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 font-medium italic">No hay movimientos registrados.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Registration Modal */}
                {registeringEvento && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-fila-gold text-white">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">Inscribirse en Acto</h2>
                                    <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em]">{registeringEvento.denominacion}</p>
                                </div>
                                <button onClick={() => setRegisteringEvento(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleRegistration} className="p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">¿Para qué grupo te apuntas?</label>
                                    <input
                                        required
                                        value={registrationForm.grupo}
                                        onChange={e => setRegistrationForm({ ...registrationForm, grupo: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        placeholder="Escuadra, familia, amigos..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número de invitados adicionales</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={registrationForm.numero_invitados}
                                        onChange={e => setRegistrationForm({ ...registrationForm, numero_invitados: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-black text-xl text-center"
                                    />
                                </div>

                                <div className="bg-fila-light/30 p-5 rounded-3xl space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Tú (Socio)</span>
                                        <span className="font-black text-fila-dark">{registeringEvento.precio_socio}€</span>
                                    </div>
                                    {parseInt(registrationForm.numero_invitados) > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400 font-bold uppercase">Invitados ({registrationForm.numero_invitados})</span>
                                            <span className="font-black text-fila-dark">{(parseInt(registrationForm.numero_invitados) * registeringEvento.precio_invitado).toFixed(2)}€</span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-fila-gold/20 flex justify-between">
                                        <span className="text-xs font-black text-fila-gold uppercase">Total</span>
                                        <span className="font-black text-fila-dark">
                                            {(registeringEvento.precio_socio + (parseInt(registrationForm.numero_invitados) * registeringEvento.precio_invitado)).toFixed(2)}€
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center gap-2 text-sm tracking-widest uppercase"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                    CONFIRMAR REGISTRO
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

const Clock = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const MapPin = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const X = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

