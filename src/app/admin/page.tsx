'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Search, UserPlus, Edit2, Trash2, UserCheck, Loader2, ArrowLeft, MoreVertical, X, Check, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Socio {
    id: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    email: string | null;
    telefono: string | null;
    fecha_nacimiento: string | null;
    is_active: boolean;
}

export default function AdminDashboard() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    // Modal State
    const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                router.push('/perfil');
                return;
            }

            setIsAdmin(true);
            fetchSocios();
        };

        checkAdmin();
    }, [router]);

    const fetchSocios = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('socios')
            .select('*')
            .order('primer_apellido', { ascending: true });

        if (data) setSocios(data);
        setLoading(false);
    };

    const handleUpdateSocio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSocio) return;

        const { error } = await supabase
            .from('socios')
            .update({
                nombre: editingSocio.nombre,
                primer_apellido: editingSocio.primer_apellido,
                segundo_apellido: editingSocio.segundo_apellido,
                email: editingSocio.email,
                telefono: editingSocio.telefono,
                fecha_nacimiento: editingSocio.fecha_nacimiento,
            })
            .eq('id', editingSocio.id);

        if (!error) {
            setSocios(socios.map(s => s.id === editingSocio.id ? editingSocio : s));
            setEditingSocio(null);
        }
    };

    const toggleStatus = async (socio: Socio) => {
        const newStatus = !socio.is_active;
        const { error } = await supabase
            .from('socios')
            .update({ is_active: newStatus })
            .eq('id', socio.id);

        if (!error) {
            setSocios(socios.map(s => s.id === socio.id ? { ...s, is_active: newStatus } : s));
        }
    };

    const filteredSocios = socios.filter(s =>
        `${s.nombre} ${s.primer_apellido} ${s.segundo_apellido} ${s.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
                <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
                <p className="text-fila-dark font-bold">Accediendo al Panel de Control...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA]">
            {/* Sidebar / Top Nav */}
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Link href="/perfil" className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-fila-dark">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Shield size={24} className="text-fila-gold" />
                        <h1 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Gestión de Socios</h1>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="relative hidden md:block w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar socio por nombre, apellido o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all text-sm"
                        />
                    </div>
                    <button className="bg-fila-green text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-fila-green/90 transition-all shadow-lg shadow-fila-green/10">
                        <UserPlus size={18} />
                        <span>Nuevo Socio</span>
                    </button>
                </div>
            </nav>

            <div className="p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Socios', val: socios.length, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Activos', val: socios.filter(s => s.is_active).length, icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Registrados en Web', val: socios.filter(s => s.email).length, icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50' },
                        { label: 'Puntos Media (Sim)', val: '12', icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                <stat.icon size={28} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                <p className="text-2xl font-black text-fila-dark leading-none">{stat.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Members Table */}
                <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Socio</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Contacto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSocios.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-all">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-fila-light flex items-center justify-center text-fila-gold font-bold">
                                                    {s.nombre[0]}{s.primer_apellido[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-fila-dark leading-tight">{s.nombre} {s.primer_apellido} {s.segundo_apellido}</p>
                                                    <p className="text-xs text-gray-400">{s.fecha_nacimiento || '--/--/----'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Mail size={14} className="text-gray-300" />
                                                    {s.email || <span className="text-gray-300 italic">No asignado</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Phone size={14} className="text-gray-300" />
                                                    {s.telefono || <span className="text-gray-300 italic">Sin teléfono</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(s)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${s.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    }`}
                                            >
                                                {s.is_active ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingSocio(s)}
                                                    className="p-2 text-gray-400 hover:text-fila-gold hover:bg-fila-gold/10 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingSocio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Editar Socio</h2>
                            <button onClick={() => setEditingSocio(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSocio} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
                                    <input
                                        value={editingSocio.nombre}
                                        onChange={e => setEditingSocio({ ...editingSocio, nombre: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">1er Apellido</label>
                                    <input
                                        value={editingSocio.primer_apellido}
                                        onChange={e => setEditingSocio({ ...editingSocio, primer_apellido: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">2do Apellido</label>
                                <input
                                    value={editingSocio.segundo_apellido}
                                    onChange={e => setEditingSocio({ ...editingSocio, segundo_apellido: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={editingSocio.email || ''}
                                    onChange={e => setEditingSocio({ ...editingSocio, email: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all font-medium text-fila-dark"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                                    <input
                                        value={editingSocio.telefono || ''}
                                        onChange={e => setEditingSocio({ ...editingSocio, telefono: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha Nac.</label>
                                    <input
                                        value={editingSocio.fecha_nacimiento || ''}
                                        onChange={e => setEditingSocio({ ...editingSocio, fecha_nacimiento: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingSocio(null)}
                                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20"
                                >
                                    GUARDAR CAMBIOS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
