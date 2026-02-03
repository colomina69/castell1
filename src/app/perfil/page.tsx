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

export default function PerfilPage() {
    const [socio, setSocio] = useState<SocioData | null>(null);
    const [quota, setQuota] = useState<Quota | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
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
            }
            setLoading(false);
        };

        fetchSocioData();
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    if (loading) return (
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

                {/* History Panel */}
                <div className="mt-12 bg-white rounded-[40px] shadow-2xl border border-fila-gold/10 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fila-dark flex items-center justify-center text-white">
                                <Calendar size={18} />
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
                                <p className="text-gray-400 font-medium Italics">No hay movimientos registrados.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Event Panel (Placeholder) */}
                <div className="mt-8">
                    <button className="w-full bg-white text-fila-dark p-8 rounded-[40px] text-left hover:border-fila-gold/30 border border-fila-gold/10 shadow-xl group relative overflow-hidden transition-all">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-fila-gold">
                            <ShieldCheck size={100} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-fila-gold">Lotería y Eventos</h3>
                        <p className="text-gray-400 text-sm">Reserva tu plaza para cenas y consulta tus décimos de lotería.</p>
                    </button>
                </div>
            </div>
        </main>
    );
}
