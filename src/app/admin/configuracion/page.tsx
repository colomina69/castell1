'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus,
    Trash2,
    Edit2,
    ArrowLeft,
    Loader2,
    Save,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Epigrafe {
    id: string;
    nombre: string;
    tipo: 'ingreso' | 'pago' | 'ambos';
    is_system: boolean;
}

interface Subepigrafe {
    id: string;
    epigrafe_id: string;
    nombre: string;
}

export default function ConfiguracionContable() {
    const [epigrafes, setEpigrafes] = useState<Epigrafe[]>([]);
    const [subepigrafes, setSubepigrafes] = useState<Subepigrafe[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    const [selectedEpigrafe, setSelectedEpigrafe] = useState<Epigrafe | null>(null);
    const [editingEpigrafe, setEditingEpigrafe] = useState<Epigrafe | null>(null);
    const [editingSubepigrafe, setEditingSubepigrafe] = useState<Subepigrafe | null>(null);

    const [isEpigrafeModalOpen, setIsEpigrafeModalOpen] = useState(false);
    const [isSubepigrafeModalOpen, setIsSubepigrafeModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [epigrafeForm, setEpigrafeForm] = useState({
        nombre: '',
        tipo: 'pago' as 'ingreso' | 'pago' | 'ambos'
    });

    const [subepigrafeForm, setSubepigrafeForm] = useState({
        nombre: '',
        epigrafe_id: ''
    });

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
            fetchData();
        };

        checkAdmin();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        const { data: epiData } = await supabase
            .from('config_epigrafes')
            .select('*')
            .order('nombre');

        const { data: subData } = await supabase
            .from('config_subepigrafes')
            .select('*')
            .order('nombre');

        if (epiData) setEpigrafes(epiData);
        if (subData) setSubepigrafes(subData);
        setLoading(false);
    };

    const handleSubmitEpigrafe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEpigrafe) {
            const { error } = await supabase
                .from('config_epigrafes')
                .update(epigrafeForm)
                .eq('id', editingEpigrafe.id);
            if (!error) {
                setIsEpigrafeModalOpen(false);
                setEditingEpigrafe(null);
                setEpigrafeForm({ nombre: '', tipo: 'pago' });
                fetchData();
            } else alert('Error: ' + error.message);
        } else {
            const { error } = await supabase
                .from('config_epigrafes')
                .insert([epigrafeForm]);
            if (!error) {
                setIsEpigrafeModalOpen(false);
                setEpigrafeForm({ nombre: '', tipo: 'pago' });
                fetchData();
            } else alert('Error: ' + error.message);
        }
    };

    const handleDeleteEpigrafe = async (id: string, isSystem: boolean) => {
        if (isSystem) {
            alert('Este epígrafe es del sistema y no se puede eliminar.');
            return;
        }
        if (!confirm('¿Estás seguro de que quieres eliminar este epígrafe y TODOS sus subepígrafes?')) return;

        const { error } = await supabase
            .from('config_epigrafes')
            .delete()
            .eq('id', id);

        if (!error) fetchData();
        else alert('Error: ' + error.message);
    };

    const handleSubmitSubepigrafe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSubepigrafe) {
            const { error } = await supabase
                .from('config_subepigrafes')
                .update({ nombre: subepigrafeForm.nombre })
                .eq('id', editingSubepigrafe.id);
            if (!error) {
                setIsSubepigrafeModalOpen(false);
                setEditingSubepigrafe(null);
                setSubepigrafeForm({ nombre: '', epigrafe_id: '' });
                fetchData();
            } else alert('Error: ' + error.message);
        } else {
            const { error } = await supabase
                .from('config_subepigrafes')
                .insert([subepigrafeForm]);
            if (!error) {
                setIsSubepigrafeModalOpen(false);
                setSubepigrafeForm({ nombre: '', epigrafe_id: '' });
                fetchData();
            } else alert('Error: ' + error.message);
        }
    };

    const handleDeleteSubepigrafe = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este subepígrafe?')) return;

        const { error } = await supabase
            .from('config_subepigrafes')
            .delete()
            .eq('id', id);

        if (!error) fetchData();
        else alert('Error: ' + error.message);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <button
                                onClick={() => router.back()}
                                className="flex items-center text-gray-500 hover:text-amber-600 mb-2 transition-colors group"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-widest">Volver al Balance</span>
                            </button>
                            <h1 className="text-4xl font-serif font-bold text-gray-900 leading-tight">Estructura Contable</h1>
                            <p className="text-gray-600 font-medium">Configura los epígrafes y subcategorías que aparecen en el balance.</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingEpigrafe(null);
                                setEpigrafeForm({ nombre: '', tipo: 'pago' });
                                setIsEpigrafeModalOpen(true);
                            }}
                            className="bg-fila-dark text-white px-8 py-4 rounded-2xl flex items-center hover:bg-black transition-all shadow-xl shadow-fila-dark/20 font-black text-sm uppercase tracking-widest"
                        >
                            <Plus className="h-5 w-5 mr-3 text-amber-500" />
                            Nuevo Epígrafe
                        </button>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Columna de INGRESOS */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-3 h-10 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200" />
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Panel de Ingresos</h2>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Entradas de Capital</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {epigrafes
                                    .filter(e => e.tipo === 'ingreso' || e.tipo === 'ambos')
                                    .map(epi => (
                                        <div key={epi.id} className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300">
                                            <div className="p-6 bg-emerald-50/30 flex items-center justify-between border-b border-emerald-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600">
                                                        <Plus size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg text-gray-900 leading-tight uppercase tracking-tight">{epi.nombre}</h3>
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Epígrafe Principal</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingEpigrafe(epi);
                                                            setEpigrafeForm({ nombre: epi.nombre, tipo: epi.tipo });
                                                            setIsEpigrafeModalOpen(true);
                                                        }}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                                                        title="Editar Epígrafe"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {!epi.is_system && (
                                                        <button
                                                            onClick={() => handleDeleteEpigrafe(epi.id, epi.is_system)}
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                            title="Eliminar Epígrafe"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-6 bg-white space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subcategorías</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEpigrafe(epi);
                                                            setEditingSubepigrafe(null);
                                                            setSubepigrafeForm({ nombre: '', epigrafe_id: epi.id });
                                                            setIsSubepigrafeModalOpen(true);
                                                        }}
                                                        className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-all border border-emerald-100"
                                                    >
                                                        + Añadir
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {subepigrafes
                                                        .filter(s => s.epigrafe_id === epi.id)
                                                        .map(sub => (
                                                            <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl group/sub border border-transparent hover:border-emerald-100 hover:bg-white transition-all">
                                                                <span className="text-sm font-bold text-gray-700">{sub.nombre}</span>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedEpigrafe(epi);
                                                                            setEditingSubepigrafe(sub);
                                                                            setSubepigrafeForm({ nombre: sub.nombre, epigrafe_id: epi.id });
                                                                            setIsSubepigrafeModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-gray-400 hover:text-amber-600"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteSubepigrafe(sub.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-rose-500"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {subepigrafes.filter(s => s.epigrafe_id === epi.id).length === 0 && (
                                                        <p className="text-[10px] text-gray-400 italic text-center py-4">Sin subcategorías específicas</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Columna de GASTOS */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-3 h-10 bg-rose-500 rounded-full shadow-lg shadow-rose-200" />
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Panel de Gastos</h2>
                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Salidas de Capital</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {epigrafes
                                    .filter(e => e.tipo === 'pago' || e.tipo === 'ambos')
                                    .map(epi => (
                                        <div key={epi.id} className="bg-white rounded-[2.5rem] border border-rose-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-rose-900/5 transition-all duration-300">
                                            <div className="p-6 bg-rose-50/30 flex items-center justify-between border-b border-rose-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-rose-100 flex items-center justify-center text-rose-600">
                                                        <Trash2 size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg text-gray-900 leading-tight uppercase tracking-tight">{epi.nombre}</h3>
                                                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-[0.2em]">Epígrafe Principal</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingEpigrafe(epi);
                                                            setEpigrafeForm({ nombre: epi.nombre, tipo: epi.tipo });
                                                            setIsEpigrafeModalOpen(true);
                                                        }}
                                                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors"
                                                        title="Editar Epígrafe"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {!epi.is_system && (
                                                        <button
                                                            onClick={() => handleDeleteEpigrafe(epi.id, epi.is_system)}
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                            title="Eliminar Epígrafe"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-6 bg-white space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subcategorías</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEpigrafe(epi);
                                                            setEditingSubepigrafe(null);
                                                            setSubepigrafeForm({ nombre: '', epigrafe_id: epi.id });
                                                            setIsSubepigrafeModalOpen(true);
                                                        }}
                                                        className="text-[9px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 px-3 py-1.5 rounded-full transition-all border border-rose-100"
                                                    >
                                                        + Añadir
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {subepigrafes
                                                        .filter(s => s.epigrafe_id === epi.id)
                                                        .map(sub => (
                                                            <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl group/sub border border-transparent hover:border-rose-100 hover:bg-white transition-all">
                                                                <span className="text-sm font-bold text-gray-700">{sub.nombre}</span>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedEpigrafe(epi);
                                                                            setEditingSubepigrafe(sub);
                                                                            setSubepigrafeForm({ nombre: sub.nombre, epigrafe_id: epi.id });
                                                                            setIsSubepigrafeModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-gray-400 hover:text-amber-600"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteSubepigrafe(sub.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-rose-500"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {subepigrafes.filter(s => s.epigrafe_id === epi.id).length === 0 && (
                                                        <p className="text-[10px] text-gray-400 italic text-center py-4">Sin subcategorías específicas</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Epígrafe (Crear/Editar) */}
                {isEpigrafeModalOpen && (
                    <div className="fixed inset-0 bg-fila-dark/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                                        {editingEpigrafe ? 'Editar Epígrafe' : 'Nuevo Epígrafe'}
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Configuración Estructural</p>
                                </div>
                                <button onClick={() => setIsEpigrafeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="h-6 w-6 text-gray-400" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitEpigrafe} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre del Epígrafe</label>
                                    <input
                                        required
                                        autoFocus
                                        type="text"
                                        placeholder="Ej: Local Social, Seguros..."
                                        value={epigrafeForm.nombre}
                                        onChange={e => setEpigrafeForm(prev => ({ ...prev, nombre: e.target.value }))}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ubicación en Balance</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['ingreso', 'pago', 'ambos'] as const).map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setEpigrafeForm(prev => ({ ...prev, tipo: t }))}
                                                className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${epigrafeForm.tipo === t
                                                    ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-200'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                    }`}
                                            >
                                                {t === 'pago' ? 'Gastos' : t === 'ingreso' ? 'Ingresos' : 'Ambos'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        className="w-full bg-fila-dark text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center"
                                    >
                                        <Save className="h-5 w-5 mr-3 text-amber-500" />
                                        {editingEpigrafe ? 'Guardar Cambios' : 'Crear Epígrafe'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Subepígrafe (Crear/Editar) */}
                {isSubepigrafeModalOpen && (
                    <div className="fixed inset-0 bg-fila-dark/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                                        {editingSubepigrafe ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Dependiente de {selectedEpigrafe?.nombre}</p>
                                </div>
                                <button onClick={() => setIsSubepigrafeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="h-6 w-6 text-gray-400" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitSubepigrafe} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Descriptivo</label>
                                        <input
                                            required
                                            autoFocus
                                            type="text"
                                            placeholder="Ej: Mantenimiento, Luz, Libro Fiestas..."
                                            value={subepigrafeForm.nombre}
                                            onChange={e => setSubepigrafeForm(prev => ({ ...prev, nombre: e.target.value }))}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-900"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        className="w-full bg-fila-dark text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center"
                                    >
                                        <Save className="h-5 w-5 mr-3 text-amber-500" />
                                        {editingSubepigrafe ? 'Guardar Cambios' : 'Crear Subcategoría'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
