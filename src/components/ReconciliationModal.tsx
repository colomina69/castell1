'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, Loader2, Check, User, Euro, Ticket, Calendar, Layers } from 'lucide-react';

interface ReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReconcile: (pagoId: string, monto: number) => void;
    movementAmount: number;
    movementDescription: string;
}

export function ReconciliationModal({ isOpen, onClose, onReconcile, movementAmount, movementDescription }: ReconciliationModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'Todos' | 'Cuota' | 'Lotería' | 'Evento'>('Todos');
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRecentPayments();
        }
    }, [isOpen]);

    const fetchRecentPayments = async (term: string = '', category: string = 'Todos') => {
        setLoading(true);
        // We search for 'pendiente' payments in 'pagos_cobros'
        let query = supabase
            .from('pagos_cobros')
            .select('*, socios(nombre, primer_apellido)')
            .eq('tipo', 'cobro')
            .eq('estado', 'pendiente')
            .order('fecha', { ascending: false });

        if (category !== 'Todos') {
            query = query.eq('categoria', category);
        }

        if (term) {
            query = query.ilike('concepto', `%${term}%`);
        }

        const { data } = await query.limit(30);
        setPayments(data || []);
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) fetchRecentPayments(searchTerm, filterCategory);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, filterCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-fila-dark/40 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <div className="bg-white rounded-[40px] w-full max-w-2xl flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-50 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-fila-dark uppercase tracking-tight">Buscar Pago para Conciliar</h3>
                        <p className="text-xs font-bold text-fila-gold uppercase tracking-widest mt-1">
                            Movimiento: {movementDescription} ({movementAmount.toFixed(2)}€)
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-8 bg-fila-light/30">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por concepto o nombre de socio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-gray-100 focus:border-fila-gold outline-none font-bold text-sm shadow-sm"
                        />
                    </div>

                    <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-50 self-start w-fit">
                        {[
                            { id: 'Todos' as const, icon: Layers },
                            { id: 'Cuota' as const, icon: Euro },
                            { id: 'Lotería' as const, icon: Ticket },
                            { id: 'Evento' as const, icon: Calendar }
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterCategory === cat.id ? 'bg-fila-dark text-white shadow-md shadow-fila-dark/10' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <cat.icon size={12} />
                                {cat.id}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-0">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-fila-gold" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((p) => {
                                const isMatch = Math.abs(p.monto - Math.abs(movementAmount)) < 0.01;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => onReconcile(p.id, p.monto)}
                                        className={`w-full p-6 rounded-[28px] border-2 text-left transition-all flex items-center justify-between group ${isMatch ? 'border-green-100 bg-green-50/30 hover:bg-green-50' : 'border-gray-50 hover:border-fila-gold/30 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isMatch ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {p.categoria === 'Cuota' ? <Euro size={20} /> :
                                                    p.categoria === 'Lotería' ? <Ticket size={20} /> :
                                                        p.categoria === 'Evento' ? <Calendar size={20} /> :
                                                            <User size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-fila-dark uppercase leading-none mb-1">
                                                    {p.socios.nombre} {p.socios.primer_apellido}
                                                </p>
                                                <p className="text-xs font-bold text-gray-400 truncate max-w-[300px]">{p.concepto}</p>
                                                <p className="text-[10px] text-fila-gold font-bold uppercase mt-0.5">{new Date(p.fecha).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black ${isMatch ? 'text-green-600' : 'text-fila-dark'}`}>
                                                {p.monto.toFixed(2)}€
                                            </p>
                                            {isMatch && <span className="text-[8px] font-black uppercase text-green-500 tracking-widest">Coincide</span>}
                                        </div>
                                    </button>
                                );
                            })}
                            {payments.length === 0 && !loading && (
                                <p className="text-center py-10 text-gray-400 font-bold">No se encontraron pagos pendientes</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
