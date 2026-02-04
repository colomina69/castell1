'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, Edit2, Trash2, Loader2, ArrowLeft, X, Save, Ticket, LayoutDashboard, Euro, LogOut, MoreVertical, Calendar, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Sorteo {
    id: string;
    descripcion: string;
    precio: number;
    recargo: number;
    serie: string | null;
    numero: string | null;
    created_at: string;
}

export default function LoteriaAdmin() {
    const [sorteos, setSorteos] = useState<Sorteo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSorteo, setEditingSorteo] = useState<Sorteo | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        descripcion: '',
        precio: '',
        recargo: '',
        serie: '',
        numero: ''
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
        fetchSorteos();
    };

    const fetchSorteos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sorteos')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setSorteos(data);
        setLoading(false);
    };

    const handleOpenModal = (sorteo: Sorteo | null = null) => {
        if (sorteo) {
            setEditingSorteo(sorteo);
            setFormData({
                descripcion: sorteo.descripcion,
                precio: sorteo.precio.toString(),
                recargo: sorteo.recargo.toString(),
                serie: sorteo.serie || '',
                numero: sorteo.numero || ''
            });
        } else {
            setEditingSorteo(null);
            setFormData({ descripcion: '', precio: '20', recargo: '3', serie: '', numero: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const sorteoData = {
            descripcion: formData.descripcion,
            precio: parseFloat(formData.precio),
            recargo: parseFloat(formData.recargo),
            serie: formData.serie || null,
            numero: formData.numero || null
        };

        let error;
        if (editingSorteo) {
            ({ error } = await supabase
                .from('sorteos')
                .update(sorteoData)
                .eq('id', editingSorteo.id));
        } else {
            ({ error } = await supabase
                .from('sorteos')
                .insert([sorteoData]));
        }

        if (!error) {
            setIsModalOpen(false);
            fetchSorteos();
        } else {
            alert('Error al guardar el sorteo');
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este sorteo? Se eliminarán también las asignaciones asociadas.')) return;

        const { error } = await supabase
            .from('sorteos')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchSorteos();
        } else {
            alert('Error al eliminar el sorteo');
        }
    };

    if (!isAdmin || (loading && sorteos.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
                <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
                <p className="text-fila-dark font-bold">Cargando Gestión de Lotería...</p>
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

    const filteredSorteos = sorteos.filter(s =>
        s.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.numero && s.numero.includes(searchTerm)) ||
        (s.serie && s.serie.includes(searchTerm))
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
                            <Ticket size={24} className="text-fila-gold" />
                            <h1 className="text-lg md:text-xl font-black text-fila-dark tracking-tighter uppercase">Gestión de Lotería</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
                        <div className="relative flex-1 max-w-[150px] md:max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar sorteo..."
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
                            <span className="hidden md:inline text-sm font-black uppercase tracking-tight">Nuevo</span>
                        </button>
                    </div>
                </nav>

                <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {filteredSorteos.map((sorteo) => (
                            <div key={sorteo.id} className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-fila-gold">
                                    <Ticket size={80} />
                                </div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="p-3 bg-fila-light rounded-2xl text-fila-gold shadow-sm">
                                        <Ticket size={24} />
                                    </div>
                                    <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(sorteo)}
                                            className="p-2 text-gray-400 hover:text-fila-gold hover:bg-fila-gold/10 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sorteo.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-lg font-black text-fila-dark uppercase tracking-tight mb-3 leading-tight">{sorteo.descripcion}</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-50 p-2.5 rounded-2xl">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Precio</p>
                                            <p className="text-lg font-black text-fila-dark">{sorteo.precio}€</p>
                                        </div>
                                        <div className="bg-fila-gold/5 p-2.5 rounded-2xl">
                                            <p className="text-[10px] font-bold text-fila-gold uppercase tracking-widest mb-1">Recargo</p>
                                            <p className="text-lg font-black text-fila-gold">{sorteo.recargo}€</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Número</span>
                                            <span className="font-black text-fila-dark">{sorteo.numero || '---'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Serie</span>
                                            <span className="font-black text-fila-dark">{sorteo.serie || '---'}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-fila-dark font-black uppercase text-xs tracking-widest">Total/Décimo</span>
                                            <span className="text-xl font-black text-fila-dark">{sorteo.precio + sorteo.recargo}€</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {sorteos.length === 0 && !loading && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Ticket size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-600">No hay sorteos creados</h3>
                            <p className="text-gray-400 mt-2">Empieza creando el primer sorteo de lotería.</p>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-7 md:px-10 md:py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-xl font-black text-fila-dark tracking-tighter uppercase">
                                    {editingSorteo ? 'Editar Sorteo' : 'Nuevo Sorteo'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full text-fila-dark transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Sorteo</label>
                                    <input
                                        required
                                        placeholder="Ej: Lotería de Navidad 2024"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio Décimo (€)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.precio}
                                            onChange={e => setFormData({ ...formData, precio: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-black text-lg text-fila-dark"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recargo/Dono (€)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.recargo}
                                            onChange={e => setFormData({ ...formData, recargo: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-black text-lg text-fila-gold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número</label>
                                        <input
                                            placeholder="Ej: 15420"
                                            value={formData.numero}
                                            onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-black text-2xl tracking-[0.2em] text-fila-dark text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Serie</label>
                                        <input
                                            placeholder="Ej: 14"
                                            value={formData.serie}
                                            onChange={e => setFormData({ ...formData, serie: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-black text-lg text-center"
                                        />
                                    </div>
                                </div>

                                <div className="bg-fila-dark p-5 rounded-3xl text-white flex justify-between items-center shadow-inner">
                                    <span className="font-black text-[10px] uppercase tracking-widest opacity-60">Total/décimo:</span>
                                    <span className="text-3xl font-black">{(parseFloat(formData.precio || '0') + parseFloat(formData.recargo || '0')).toFixed(2)}€</span>
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
                                        {editingSorteo ? 'ACTUALIZAR' : 'GUARDAR SORTEO'}
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
