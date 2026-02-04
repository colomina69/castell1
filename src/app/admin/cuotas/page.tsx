'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, Edit2, Trash2, Loader2, ArrowLeft, X, Check, Save, Euro, LayoutDashboard, Ticket, LogOut, MoreVertical, Calendar, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Quota {
    id: string;
    nombre: string;
    monto: number;
    descripcion: string | null;
}

export default function QuotasAdmin() {
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuota, setEditingQuota] = useState<Quota | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        monto: '',
        descripcion: ''
    });

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        checkAdmin();
    }, []);

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
        fetchQuotas();
    };

    const fetchQuotas = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cuotas')
            .select('*')
            .order('monto', { ascending: true });

        if (data) setQuotas(data);
        setLoading(false);
    };

    const handleOpenModal = (quota: Quota | null = null) => {
        if (quota) {
            setEditingQuota(quota);
            setFormData({
                nombre: quota.nombre,
                monto: quota.monto.toString(),
                descripcion: quota.descripcion || ''
            });
        } else {
            setEditingQuota(null);
            setFormData({ nombre: '', monto: '', descripcion: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const quotaData = {
            nombre: formData.nombre,
            monto: parseFloat(formData.monto),
            descripcion: formData.descripcion
        };

        let error;
        if (editingQuota) {
            ({ error } = await supabase
                .from('cuotas')
                .update(quotaData)
                .eq('id', editingQuota.id));
        } else {
            ({ error } = await supabase
                .from('cuotas')
                .insert([quotaData]));
        }

        if (!error) {
            setIsModalOpen(false);
            fetchQuotas();
        } else {
            alert('Error al guardar la cuota');
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta cuota?')) return;

        const { error } = await supabase
            .from('cuotas')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchQuotas();
        } else {
            alert('Error al eliminar la cuota. Puede que esté asignada a algún socio.');
        }
    };

    if (!isAdmin || (loading && quotas.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
                <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
                <p className="text-fila-dark font-bold">Cargando Sistema de Cuotas...</p>
            </div>
        );
    }

    const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
        const isActive = pathname === href;
        return (
            <Link
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-fila-gold text-white shadow-lg shadow-fila-gold/20' : 'text-gray-500 hover:bg-fila-light hover:text-fila-dark'}`}
            >
                <Icon size={20} />
                <span>{label}</span>
            </Link>
        );
    };

    const filteredQuotas = quotas.filter(q =>
        q.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.descripcion && q.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <main className="min-h-screen bg-[#F8F9FA] flex">
            {/* Mobile Sidebar Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-fila-dark/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Side Menu */}
            <aside className={`
                fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 z-[70] flex flex-col p-6 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-fila-dark rounded-xl flex items-center justify-center text-fila-gold shadow-lg shadow-fila-dark/20">
                            <Shield size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-fila-gold uppercase tracking-[0.2em]">Panel Admin</p>
                            <h2 className="text-lg font-black text-fila-dark leading-none">CASTELL</h2>
                        </div>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 space-y-2">
                    <NavItem href="/admin" icon={Users} label="Gestión Socios" />
                    <NavItem href="/admin/cobros" icon={Euro} label="Gestión Cobros" />
                    <NavItem href="/admin/cuotas" icon={Euro} label="Configurar Cuotas" />
                    <NavItem href="/admin/loteria" icon={Ticket} label="Gestión Lotería" />
                    <NavItem href="/admin/eventos" icon={Calendar} label="Gestión Eventos" />
                </nav>

                <div className="pt-6 border-t border-gray-100 space-y-2">
                    <Link
                        href="/perfil"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver al Perfil</span>
                    </Link>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/');
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all w-full text-left"
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1">
                {/* Top Nav */}
                <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="lg:hidden p-2.5 bg-fila-light text-fila-dark rounded-xl hover:bg-gray-200 transition-all"
                        >
                            <MoreVertical size={20} />
                        </button>
                        <div className="hidden sm:flex items-center gap-4">
                            <Euro size={24} className="text-fila-gold" />
                            <h1 className="text-lg md:text-xl font-black text-fila-dark tracking-tighter uppercase">Gestión de Cuotas</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
                        <div className="relative flex-1 max-w-[150px] md:max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar cuota..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold outline-none text-xs md:text-sm transition-all"
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="p-2.5 md:px-5 md:py-2.5 bg-fila-green text-white rounded-xl md:rounded-2xl hover:bg-fila-green/90 transition-all shadow-xl shadow-fila-green/10 flex items-center gap-2"
                        >
                            <Plus size={18} />
                            <span className="hidden md:inline text-sm font-black uppercase tracking-tight">Nueva</span>
                        </button>
                    </div>
                </nav>

                <div className="p-4 md:p-8 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {filteredQuotas.map((quota) => (
                            <div key={quota.id} className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-fila-light rounded-2xl text-fila-gold shadow-sm">
                                        <Euro size={24} />
                                    </div>
                                    <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(quota)}
                                            className="p-2 text-gray-400 hover:text-fila-gold hover:bg-fila-gold/10 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(quota.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-fila-dark uppercase tracking-tight mb-1">{quota.nombre}</h3>
                                <p className="text-3xl font-black text-fila-gold mb-3">{quota.monto}€</p>
                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{quota.descripcion || 'Sin descripción adicional'}</p>
                            </div>
                        ))}
                    </div>

                    {quotas.length === 0 && !loading && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Euro size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-600">No hay cuotas definidas</h3>
                            <p className="text-gray-400 mt-2">Empieza creando una nueva cuota para los socios.</p>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-7 md:px-10 md:py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-xl font-black text-fila-dark tracking-tighter uppercase">
                                    {editingQuota ? 'Editar Cuota' : 'Nueva Cuota'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full text-fila-dark transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Cuota</label>
                                    <input
                                        required
                                        placeholder="Ej: Cuota General"
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monto (€)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.monto}
                                        onChange={e => setFormData({ ...formData, monto: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-black text-2xl text-fila-dark"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Opcional..."
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all resize-none font-medium"
                                    />
                                </div>
                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] px-4 py-4 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center gap-2 text-xs tracking-widest uppercase"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {editingQuota ? 'ACTUALIZAR' : 'GUARDAR'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
