'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, Edit2, Trash2, Loader2, ArrowLeft, X, Check, Save, Euro } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    const [formData, setFormData] = useState({
        nombre: '',
        monto: '',
        descripcion: ''
    });

    const router = useRouter();

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

    return (
        <main className="min-h-screen bg-[#F8F9FA]">
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-fila-dark">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Euro size={24} className="text-fila-gold" />
                        <h1 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Gestión de Cuotas</h1>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-fila-green text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-fila-green/90 transition-all shadow-lg shadow-fila-green/10"
                >
                    <Plus size={18} />
                    <span>Nueva Cuota</span>
                </button>
            </nav>

            <div className="p-8 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quotas.map((quota) => (
                        <div key={quota.id} className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-fila-light rounded-2xl text-fila-gold">
                                    <Euro size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            <p className="text-sm text-gray-500 line-clamp-2">{quota.descripcion || 'Sin descripción'}</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-fila-dark tracking-tighter uppercase">
                                {editingQuota ? 'Editar Cuota' : 'Nueva Cuota'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full text-fila-dark">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre de la Cuota</label>
                                <input
                                    required
                                    placeholder="Ej: Cuota General"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Monto (€)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.monto}
                                    onChange={e => setFormData({ ...formData, monto: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all font-bold text-lg"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                <textarea
                                    rows={3}
                                    placeholder="Opcional..."
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {editingQuota ? 'ACTUALIZAR' : 'GUARDAR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
