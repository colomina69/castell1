'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Search,
    Upload,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    MoreVertical,
    ArrowLeft,
    Loader2,
    Database,
    Link as LinkIcon,
    Trash2,
    Filter
} from 'lucide-react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ReconciliationModal } from '@/components/ReconciliationModal';
import { useRouter } from 'next/navigation';

interface BankMovement {
    id: string;
    fecha: string;
    descripcion: string;
    monto: number;
    estado: 'pendiente' | 'conciliado' | 'ignorado';
    referencia?: string;
}

export default function BancoAdmin() {
    const [movements, setMovements] = useState<BankMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'conciliado'>('todos');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    // Reconciliation
    const [selectedMovement, setSelectedMovement] = useState<BankMovement | null>(null);
    const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);

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
        fetchMovements();
    };

    const fetchMovements = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('movimientos_bancarios')
                .select('*')
                .order('fecha', { ascending: false });

            if (statusFilter !== 'todos') {
                query = query.eq('estado', statusFilter);
            }

            if (searchTerm) {
                query = query.ilike('descripcion', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setMovements(data as BankMovement[]);
        } catch (error) {
            console.error('Error fetching movements:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isAdmin) fetchMovements();
    }, [statusFilter, searchTerm]);

    const handleImport = async () => {
        try {
            setLoading(true);
            const rows = importData.split('\n').filter(r => r.trim());
            const movementsToImport = rows.map(row => {
                const delimiter = row.includes('|') ? '|' : ';';
                const cols = row.split(delimiter);

                let fechaRaw = '', descripcion = '', montoRaw = '';

                if (delimiter === '|') {
                    // Format: 06/02/2026|DESC|FECHA_VALOR|MONTO|SALDO...
                    fechaRaw = cols[0]?.trim();
                    descripcion = cols[1]?.trim();
                    montoRaw = cols[3]?.trim();
                } else {
                    // Format: fecha;descripcion;monto
                    fechaRaw = cols[0]?.trim();
                    descripcion = cols[1]?.trim();
                    montoRaw = cols[2]?.trim();
                }

                // Parse Date DD/MM/YYYY to YYYY-MM-DD
                let fechaIso = fechaRaw;
                if (fechaRaw.includes('/')) {
                    const [d, m, y] = fechaRaw.split('/');
                    fechaIso = `${y}-${m}-${d}`;
                }

                return {
                    fecha: fechaIso,
                    descripcion: descripcion,
                    monto: parseFloat(montoRaw.replace(',', '.').trim())
                };
            });

            const { error } = await supabase
                .from('movimientos_bancarios')
                .insert(movementsToImport);

            if (error) throw error;

            setImportData('');
            setIsImportModalOpen(false);
            fetchMovements();
        } catch (error) {
            alert('Error al importar: ' + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    const toggleConciliation = async (movement: BankMovement) => {
        if (movement.estado === 'conciliado') {
            if (confirm('¿Deseas romper la conciliación de este movimiento?')) {
                setLoading(true);
                const { error: delError } = await supabase
                    .from('conciliaciones_pagos')
                    .delete()
                    .eq('movimiento_id', movement.id);

                if (delError) {
                    alert('Error al eliminar conciliación: ' + delError.message);
                } else {
                    await supabase
                        .from('movimientos_bancarios')
                        .update({ estado: 'pendiente' })
                        .eq('id', movement.id);
                    fetchMovements();
                }
                setLoading(false);
            }
        } else {
            setSelectedMovement(movement);
            setIsReconcileModalOpen(true);
        }
    };

    const handleReconcile = async (pagoId: string, monto: number) => {
        if (!selectedMovement) return;

        try {
            setLoading(true);

            // 1. Crear el enlace
            const { error: linkError } = await supabase
                .from('conciliaciones_pagos')
                .insert([{
                    movimiento_id: selectedMovement.id,
                    pago_id: pagoId,
                    monto_conciliado: monto
                }]);

            if (linkError) throw linkError;

            // 2. Actualizar estado del movimiento
            const { error: updateError } = await supabase
                .from('movimientos_bancarios')
                .update({ estado: 'conciliado' })
                .eq('id', selectedMovement.id);

            if (updateError) throw updateError;

            setIsReconcileModalOpen(false);
            setSelectedMovement(null);
            fetchMovements();
        } catch (error: any) {
            alert('Error al conciliar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin || (loading && movements.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
                <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
                <p className="text-fila-dark font-bold">Cargando Tesorería Bancaria...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] flex">
            <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

            <div className="flex-1">
                {/* Header */}
                <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2.5 bg-fila-light text-fila-dark rounded-xl">
                            <MoreVertical size={20} />
                        </button>
                        <h1 className="text-xl font-black text-fila-dark uppercase tracking-tighter shrink-0">Punteo Bancario</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-fila-green text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-fila-green/90 transition-all shadow-lg shadow-fila-green/20"
                        >
                            <Upload size={16} />
                            <span>Importar CSV</span>
                        </button>
                    </div>
                </nav>

                <div className="p-8">
                    {/* Stats & Filters */}
                    <div className="flex flex-col md:flex-row gap-6 mb-8 items-start md:items-center justify-between">
                        <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            {(['todos', 'pendiente', 'conciliado'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-6 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-fila-dark text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar en la descripción..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-gray-100 focus:border-fila-gold outline-none font-bold text-sm shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {movements.map((m) => (
                                        <tr key={m.id} className="hover:bg-gray-50/50 transition-all group">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className="text-sm font-bold text-fila-dark">{new Date(m.fecha).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-fila-dark leading-snug">{m.descripcion}</p>
                                                {m.referencia && <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Ref: {m.referencia}</p>}
                                            </td>
                                            <td className="px-8 py-6 text-right whitespace-nowrap">
                                                <span className={`text-lg font-black ${m.monto < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {m.monto.toFixed(2)}€
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${m.estado === 'conciliado' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                    m.estado === 'ignorado' ? 'bg-gray-100 text-gray-400' :
                                                        'bg-orange-50 text-orange-600 border border-orange-100'
                                                    }`}>
                                                    {m.estado === 'conciliado' ? <CheckCircle2 size={12} /> :
                                                        m.estado === 'pendiente' ? <Clock size={12} /> : <XCircle size={12} />}
                                                    {m.estado}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => toggleConciliation(m)}
                                                    className={`p-3 rounded-2xl transition-all ${m.estado === 'conciliado' ? 'text-red-400 hover:bg-red-50' : 'text-fila-gold hover:bg-fila-light'
                                                        }`}
                                                >
                                                    {m.estado === 'conciliado' ? <Trash2 size={18} /> : <LinkIcon size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {movements.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mx-auto mb-4">
                                                    <Database size={32} />
                                                </div>
                                                <p className="text-gray-400 font-bold">No hay movimientos registrados</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-fila-dark/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-fila-dark uppercase tracking-tight">Importar Movimientos</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Formato: fecha;descripcion;monto</p>
                                <p className="text-[9px] text-fila-gold font-bold mt-1">Ej: 2024-02-01;Pago Cuota Pepe;120,00</p>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                                <XCircle className="text-gray-400" />
                            </button>
                        </div>

                        <textarea
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            placeholder="Pega aquí las filas de tu CSV..."
                            className="w-full h-64 p-6 rounded-3xl bg-fila-light border border-gray-100 focus:border-fila-gold outline-none font-mono text-xs mb-8"
                        />

                        <div className="flex gap-4">
                            <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100">
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importData.trim()}
                                className="flex-1 py-4 rounded-2xl text-[10px] font-black text-white bg-fila-green uppercase tracking-widest hover:bg-fila-green/90 transition-all shadow-xl shadow-fila-green/20 disabled:opacity-50"
                            >
                                Procesar e Importar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconciliation Modal */}
            {selectedMovement && (
                <ReconciliationModal
                    isOpen={isReconcileModalOpen}
                    onClose={() => {
                        setIsReconcileModalOpen(false);
                        setSelectedMovement(null);
                    }}
                    onReconcile={handleReconcile}
                    movementAmount={selectedMovement.monto}
                    movementDescription={selectedMovement.descripcion}
                />
            )}
        </main>
    );
}
