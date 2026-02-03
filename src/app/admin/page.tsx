'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Search, UserPlus, Edit2, Trash2, UserCheck, Loader2, ArrowLeft, MoreVertical, X, Check, Mail, Phone, Euro } from 'lucide-react';
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
    cuota_id: string | null;
}

interface Quota {
    id: string;
    nombre: string;
    monto: number;
}

interface Profile {
    socio_id: string | null;
}

export default function AdminDashboard() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [chargingId, setChargingId] = useState<string | null>(null);
    const router = useRouter();

    // Modal State
    const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
    const [transactionSocio, setTransactionSocio] = useState<Socio | null>(null);
    const [transactionForm, setTransactionForm] = useState({
        tipo: 'cobro' as 'cobro' | 'pago',
        monto: '',
        concepto: '',
        metodo_pago: 'Efectivo',
        estado: 'pendiente' as 'pendiente' | 'completado'
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
            fetchSocios();
            fetchQuotas();
            fetchProfiles();
        };

        checkAdmin();
    }, [router]);

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('socio_id');
        if (data) setProfiles(data);
    };

    const fetchQuotas = async () => {
        const { data } = await supabase.from('cuotas').select('*').order('monto', { ascending: true });
        if (data) setQuotas(data);
    };

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
                cuota_id: editingSocio.cuota_id,
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

    const handleOpenTransaction = (socio: Socio) => {
        const quota = quotas.find(q => q.id === socio.cuota_id);
        const year = new Date().getFullYear();
        setTransactionSocio(socio);
        setTransactionForm({
            tipo: 'cobro',
            monto: quota?.monto?.toString().replace('.', ',') || '',
            concepto: `Cuota ${year}: ${quota?.nombre || 'General'}`,
            metodo_pago: 'Efectivo',
            estado: 'pendiente'
        });

        // Focus the amount input after a short delay to ensure modal is rendered
        setTimeout(() => {
            const input = document.getElementById('monto-input') as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    };

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionSocio) return;

        // Convert amount string (with comma or dot) to number
        const montoStr = transactionForm.monto.replace(',', '.');
        const montoNum = parseFloat(montoStr);

        if (isNaN(montoNum) || montoNum <= 0) {
            alert('Por favor, introduce un monto válido.');
            return;
        }

        setChargingId(transactionSocio.id);
        const { error } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: transactionSocio.id,
                tipo: transactionForm.tipo,
                monto: montoNum,
                concepto: transactionForm.concepto,
                metodo_pago: transactionForm.tipo === 'pago' ? transactionForm.metodo_pago : null,
                estado: transactionForm.estado
            }]);

        if (!error) {
            alert('Movimiento registrado correctamente');
            setTransactionSocio(null);
        } else {
            alert('Error al registrar el movimiento: ' + error.message);
        }
        setChargingId(null);
    };

    const handleAnnualCharge = async () => {
        const year = new Date().getFullYear();
        if (!confirm(`¿Estás seguro de que quieres generar las cuotas anuales de ${year} para TODOS los socios activos con cuota asignada?`)) return;

        setLoading(true);
        const sociosToCharge = socios.filter(s => s.is_active && s.cuota_id);

        const charges = sociosToCharge.map(s => {
            const quota = quotas.find(q => q.id === s.cuota_id);
            return {
                socio_id: s.id,
                tipo: 'cobro',
                monto: quota?.monto || 0,
                concepto: `Cuota Anual ${year}: ${quota?.nombre || 'General'}`,
                estado: 'pendiente'
            };
        });

        if (charges.length === 0) {
            alert('No hay socios activos con cuotas asignadas para procesar.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('pagos_cobros').insert(charges);

        if (!error) {
            alert(`¡Éxito! Se han generado ${charges.length} cargos de cuota anual.`);
        } else {
            alert('Hubo un error al generar los cargos masivos.');
            console.error(error);
        }
        setLoading(false);
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
                    <Link
                        href="/admin/cuotas"
                        className="bg-white text-fila-dark border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"
                    >
                        <Shield size={18} className="text-fila-gold" />
                        <span>Gestionar Cuotas</span>
                    </Link>
                    <button
                        onClick={handleAnnualCharge}
                        disabled={loading}
                        className="bg-fila-gold text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-fila-gold/90 transition-all shadow-lg shadow-fila-gold/10"
                    >
                        <Euro size={18} />
                        <span>Asignación Anual</span>
                    </button>
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
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Web</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Contacto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Cuota Asignada</th>
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
                                        <td className="px-6 py-4">
                                            {profiles.some(p => p.socio_id === s.id) ? (
                                                <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit border border-blue-100">
                                                    <Shield size={12} className="fill-blue-600" />
                                                    <span className="text-[10px] font-black uppercase">Registrado</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest ml-1">No registrado</span>
                                            )}
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
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-fila-dark">
                                                    {quotas.find(q => q.id === s.cuota_id)?.nombre || 'Sin asignar'}
                                                </span>
                                                {s.cuota_id && (
                                                    <span className="text-xs text-fila-gold font-bold">
                                                        {quotas.find(q => q.id === s.cuota_id)?.monto}€
                                                    </span>
                                                )}
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
                                                    onClick={() => handleOpenTransaction(s)}
                                                    disabled={chargingId === s.id}
                                                    title="Registrar cobro o pago"
                                                    className="p-2 rounded-lg transition-all text-fila-gold hover:bg-fila-gold/10"
                                                >
                                                    {chargingId === s.id ? <Loader2 size={18} className="animate-spin" /> : <Euro size={18} />}
                                                </button>
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

            {/* Transaction Modal */}
            {transactionSocio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-fila-dark text-white">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter uppercase">Registrar Movimiento</h2>
                                <p className="text-xs text-white/60 font-bold uppercase tracking-widest">{transactionSocio.nombre} {transactionSocio.primer_apellido}</p>
                            </div>
                            <button onClick={() => setTransactionSocio(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTransaction} className="p-8 space-y-5">
                            <div className="flex gap-4 p-2 bg-gray-100 rounded-2xl relative">
                                <button
                                    type="button"
                                    onClick={() => setTransactionForm({ ...transactionForm, tipo: 'cobro' })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all z-10 ${transactionForm.tipo === 'cobro' ? 'text-fila-dark' : 'text-gray-400'}`}
                                >
                                    Cargo (Deuda)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransactionForm({ ...transactionForm, tipo: 'pago' })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all z-10 ${transactionForm.tipo === 'pago' ? 'text-fila-green' : 'text-gray-400'}`}
                                >
                                    Pago (Abono)
                                </button>
                                <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-white rounded-xl shadow-sm transition-all duration-300 ${transactionForm.tipo === 'pago' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'}`} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Monto (€)</label>
                                    <div className="relative">
                                        <input
                                            id="monto-input"
                                            type="text"
                                            required
                                            value={transactionForm.monto}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9,.]/g, '');
                                                setTransactionForm({ ...transactionForm, monto: val });
                                            }}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all font-black text-2xl text-fila-dark"
                                            placeholder="0,00"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-fila-gold font-bold text-xl">
                                            €
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                                    <select
                                        value={transactionForm.estado}
                                        onChange={e => setTransactionForm({ ...transactionForm, estado: e.target.value as any })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all font-bold text-sm h-[56px]"
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="completado">Completado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Concepto</label>
                                <input
                                    required
                                    value={transactionForm.concepto}
                                    onChange={e => setTransactionForm({ ...transactionForm, concepto: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all font-medium"
                                    placeholder="Ej: Pago parcial cuota 2024"
                                />
                            </div>

                            {transactionForm.tipo === 'pago' && (
                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Método de Pago</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Efectivo', 'Transferencia', 'Bizum', 'TPV'].map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setTransactionForm({ ...transactionForm, metodo_pago: method })}
                                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${transactionForm.metodo_pago === method ? 'bg-fila-gold/10 border-fila-gold text-fila-gold' : 'bg-white border-gray-100 text-gray-400'}`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTransactionSocio(null)}
                                    className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase text-xs tracking-widest"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    disabled={chargingId === transactionSocio.id}
                                    className={`flex-[2] px-4 py-4 rounded-2xl font-black transition-all shadow-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 ${transactionForm.tipo === 'pago' ? 'bg-fila-green text-white shadow-fila-green/20 hover:bg-green-700' : 'bg-fila-dark text-white shadow-fila-dark/20 hover:bg-black'}`}
                                >
                                    {chargingId === transactionSocio.id ? <Loader2 size={16} className="animate-spin" /> : <Euro size={16} />}
                                    {transactionForm.tipo === 'pago' ? 'REGISTRAR PAGO' : 'GENERAR CARGO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
