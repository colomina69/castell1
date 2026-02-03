'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Search, UserPlus, Edit2, Trash2, UserCheck, Loader2, ArrowLeft, MoreVertical, X, Check, Mail, Phone, Euro, Ticket, Save, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

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

interface Sorteo {
    id: string;
    descripcion: string;
    precio: number;
    recargo: number;
}

interface Profile {
    socio_id: string | null;
}

export default function AdminDashboard() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [sorteos, setSorteos] = useState<Sorteo[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [chargingId, setChargingId] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Modal States
    const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
    const [transactionSocio, setTransactionSocio] = useState<Socio | null>(null);
    const [loteriaSocio, setLoteriaSocio] = useState<Socio | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [transactionForm, setTransactionForm] = useState({
        tipo: 'cobro' as 'cobro' | 'pago',
        monto: '',
        concepto: '',
        metodo_pago: 'Efectivo',
        estado: 'pendiente' as 'pendiente' | 'completado'
    });

    const [loteriaForm, setLoteriaForm] = useState({
        sorteo_id: '',
        cantidad: '1'
    });

    const [createForm, setCreateForm] = useState({
        nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        email: '',
        telefono: '',
        fecha_nacimiento: '',
        cuota_id: ''
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
            fetchSorteos();
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

    const fetchSorteos = async () => {
        const { data } = await supabase.from('sorteos').select('*').order('created_at', { ascending: false });
        if (data) {
            setSorteos(data);
            if (data.length > 0) setLoteriaForm(prev => ({ ...prev, sorteo_id: data[0].id }));
        }
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

    const handleCreateSocio = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('socios')
            .insert([{
                nombre: createForm.nombre,
                primer_apellido: createForm.primer_apellido,
                segundo_apellido: createForm.segundo_apellido,
                email: createForm.email || null,
                telefono: createForm.telefono || null,
                fecha_nacimiento: createForm.fecha_nacimiento || null,
                cuota_id: createForm.cuota_id || null,
                is_active: true
            }]);

        if (!error) {
            alert('Socio creado correctamente');
            setIsCreateModalOpen(false);
            setCreateForm({
                nombre: '',
                primer_apellido: '',
                segundo_apellido: '',
                email: '',
                telefono: '',
                fecha_nacimiento: '',
                cuota_id: ''
            });
            fetchSocios();
        } else {
            alert('Error al crear el socio: ' + error.message);
            setLoading(false);
        }
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

    const handleAssignLoteria = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loteriaSocio || !loteriaForm.sorteo_id) return;

        const sorteo = sorteos.find(s => s.id === loteriaForm.sorteo_id);
        if (!sorteo) return;

        const cantidad = parseInt(loteriaForm.cantidad);
        const total = cantidad * (sorteo.precio + sorteo.recargo);

        setChargingId(loteriaSocio.id);

        // 1. Crear el cargo en pagos_cobros
        const { data: pago, error: pagoError } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: loteriaSocio.id,
                tipo: 'cobro',
                monto: total,
                concepto: `Lotería: ${sorteo.descripcion} (${cantidad} décimos)`,
                estado: 'pendiente'
            }])
            .select()
            .single();

        if (pagoError) {
            alert('Error al crear el cargo financiero: ' + pagoError.message);
            setChargingId(null);
            return;
        }

        // 2. Crear la asignación de lotería vinculada
        const { error: asignError } = await supabase
            .from('loterias_asignadas')
            .insert([{
                socio_id: loteriaSocio.id,
                sorteo_id: sorteo.id,
                cantidad,
                total_monto: total,
                pago_id: pago.id
            }]);

        if (!asignError) {
            alert('Lotería asignada y cargo generado correctamente');
            setLoteriaSocio(null);
        } else {
            alert('Error al registrar la asignación: ' + asignError.message);
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
                    <NavItem href="/admin" icon={LayoutDashboard} label="Gestión Socios" />
                    <NavItem href="/admin/cuotas" icon={Euro} label="Configurar Cuotas" />
                    <NavItem href="/admin/loteria" icon={Ticket} label="Gestión Lotería" />
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
                        <div className="hidden sm:block">
                            <h1 className="text-lg md:text-xl font-black text-fila-dark tracking-tighter uppercase leading-none">Socios de la Filà</h1>
                            <span className="text-[9px] font-black text-fila-gold uppercase tracking-widest">{socios.length} TOTAL</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
                        <div className="relative flex-1 max-w-[200px] md:max-w-72">
                            <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 md:pl-11 pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold outline-none text-xs md:text-sm transition-all"
                            />
                        </div>
                        <button
                            onClick={handleAnnualCharge}
                            disabled={loading}
                            title="Asignación Anual"
                            className="p-2.5 md:px-5 md:py-2.5 bg-white border border-gray-200 text-fila-dark rounded-xl md:rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Euro size={18} className="text-fila-gold" />
                            <span className="hidden md:inline ml-2 text-sm font-bold">Anual</span>
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="p-2.5 md:px-5 md:py-2.5 bg-fila-green text-white rounded-xl md:rounded-2xl hover:bg-fila-green/90 transition-all shadow-xl shadow-fila-green/10 flex items-center gap-2"
                        >
                            <UserPlus size={18} />
                            <span className="hidden md:inline text-sm font-black uppercase tracking-tight">Nuevo</span>
                        </button>
                    </div>
                </nav>

                <div className="p-4 md:p-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                        {[
                            { label: 'Total', val: socios.length, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Activos', val: socios.filter(s => s.is_active).length, icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
                            { label: 'Sorteos', val: sorteos.length, icon: Ticket, color: 'text-orange-600', bg: 'bg-orange-50' },
                            { label: 'Web', val: profiles.length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-3 md:gap-5">
                                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                                    <stat.icon size={20} className="md:w-7 md:h-7" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[8px] md:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 truncate">{stat.label}</p>
                                    <p className="text-lg md:text-2xl font-black text-fila-dark leading-none">{stat.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Members List - Card View (Mobile) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden pb-10">
                        {filteredSocios.map((s) => (
                            <div key={s.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-fila-light flex items-center justify-center text-fila-gold font-bold text-lg shadow-inner shrink-0">
                                            {s.nombre[0]}{s.primer_apellido[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-fila-dark leading-none truncate mb-1 uppercase tracking-tight">{s.nombre} {s.primer_apellido}</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">{s.segundo_apellido || '-'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleStatus(s)}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${s.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                                    >
                                        {s.is_active ? 'ALTA' : 'BAJA'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2 border-t border-b border-gray-50 py-4 my-4">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Mail size={14} className="shrink-0 text-fila-gold" />
                                        <span className="text-xs font-medium truncate">{s.email || 'Sin email'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Phone size={14} className="shrink-0 text-fila-gold" />
                                        <span className="text-xs font-medium">{s.telefono || 'Sin teléfono'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Euro size={14} className="shrink-0 text-fila-gold" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-fila-dark uppercase tracking-tight">
                                                {quotas.find(q => q.id === s.cuota_id)?.nombre || 'Sin cuota'}
                                            </span>
                                            {s.cuota_id && <span className="text-[9px] text-fila-gold font-bold">{quotas.find(q => q.id === s.cuota_id)?.monto}€ / anual</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setLoteriaSocio(s)}
                                        className="flex-1 bg-fila-gold/10 text-fila-gold py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-fila-gold hover:text-white transition-all"
                                    >
                                        <Ticket size={14} />
                                        Lotería
                                    </button>
                                    <button
                                        onClick={() => handleOpenTransaction(s)}
                                        className="flex-1 bg-fila-dark/5 text-fila-dark py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-fila-dark hover:text-white transition-all"
                                    >
                                        <Euro size={14} />
                                        Movimiento
                                    </button>
                                    <button
                                        onClick={() => setEditingSocio(s)}
                                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-fila-dark transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Members Table - Desktop View */}
                    <div className="hidden md:block bg-white rounded-[40px] border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-200">
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Socio</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Web</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tipo Cuota</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones rápidas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSocios.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50/50 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-fila-light flex items-center justify-center text-fila-gold font-bold text-sm shrink-0 shadow-sm">
                                                        {s.nombre[0]}{s.primer_apellido[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-fila-dark leading-tight">{s.nombre} {s.primer_apellido} {s.segundo_apellido}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">ID: {s.id.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {profiles.some(p => p.socio_id === s.id) ? (
                                                    <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl w-fit border border-blue-100/50">
                                                        <Shield size={10} className="fill-blue-600" />
                                                        <span className="text-[9px] font-black uppercase tracking-tighter">Acceso Web</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest ml-1">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-gray-500 font-medium truncate max-w-[150px]">{s.email || '--'}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold tracking-widest">{s.telefono || '--'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-fila-dark uppercase tracking-tight">
                                                        {quotas.find(q => q.id === s.cuota_id)?.nombre || '---'}
                                                    </span>
                                                    {s.cuota_id && <span className="text-[10px] text-fila-gold font-bold">{quotas.find(q => q.id === s.cuota_id)?.monto}€ / anual</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => toggleStatus(s)}
                                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${s.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                                                >
                                                    {s.is_active ? 'ALTA' : 'BAJA'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setLoteriaSocio(s)}
                                                        title="Asignar Lotería"
                                                        className="p-2.5 text-fila-gold hover:bg-fila-gold/10 rounded-xl transition-all"
                                                    >
                                                        <Ticket size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenTransaction(s)}
                                                        disabled={chargingId === s.id}
                                                        title="Tesorería Manual"
                                                        className="p-2.5 text-fila-dark hover:bg-gray-100 rounded-xl transition-all"
                                                    >
                                                        {chargingId === s.id ? <Loader2 size={18} className="animate-spin" /> : <Euro size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingSocio(s)}
                                                        className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                                                    >
                                                        <Edit2 size={18} />
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

                {/* Create Socio Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-fila-green text-white">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none mb-1">Nuevo Socio</h2>
                                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">Alta manual de festero</p>
                                </div>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateSocio} className="p-10 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
                                        <input
                                            required
                                            value={createForm.nombre}
                                            onChange={e => setCreateForm({ ...createForm, nombre: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                            placeholder="Nombre..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Primer Apellido</label>
                                        <input
                                            required
                                            value={createForm.primer_apellido}
                                            onChange={e => setCreateForm({ ...createForm, primer_apellido: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                            placeholder="Primer Apellido..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Segundo Apellido</label>
                                    <input
                                        value={createForm.segundo_apellido}
                                        onChange={e => setCreateForm({ ...createForm, segundo_apellido: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        placeholder="Segundo Apellido..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (para registro web)</label>
                                        <input
                                            type="email"
                                            value={createForm.email}
                                            onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Cuota</label>
                                        <select
                                            value={createForm.cuota_id}
                                            onChange={e => setCreateForm({ ...createForm, cuota_id: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        >
                                            <option value="">Seleccionar cuota...</option>
                                            {quotas.map(q => (
                                                <option key={q.id} value={q.id}>{q.nombre} ({q.monto}€)</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] px-4 py-4 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center gap-2 text-sm tracking-widest uppercase"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        CREAR SOCIO
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Lottery Modal */}
                {loteriaSocio && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-7 border-b border-gray-100 flex justify-between items-center bg-fila-gold text-white">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Asignar Lotería</h2>
                                    <p className="text-[10px] text-white/70 font-black uppercase tracking-widest">{loteriaSocio.nombre} {loteriaSocio.primer_apellido}</p>
                                </div>
                                <button onClick={() => setLoteriaSocio(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAssignLoteria} className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleccionar Sorteo</label>
                                    <select
                                        required
                                        value={loteriaForm.sorteo_id}
                                        onChange={e => setLoteriaForm({ ...loteriaForm, sorteo_id: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold text-fila-dark"
                                    >
                                        {sorteos.length === 0 && <option value="">No hay sorteos disponibles</option>}
                                        {sorteos.map(sorteo => (
                                            <option key={sorteo.id} value={sorteo.id}>
                                                {sorteo.descripcion} ({sorteo.precio + sorteo.recargo}€)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad de Décimos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={loteriaForm.cantidad}
                                        onChange={e => setLoteriaForm({ ...loteriaForm, cantidad: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-black text-2xl text-fila-dark text-center"
                                    />
                                </div>

                                {loteriaForm.sorteo_id && (
                                    <div className="bg-fila-light p-5 rounded-3xl border border-fila-gold/20 shadow-inner">
                                        <div className="flex justify-between items-center mb-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                            <span>Cargo por décimo:</span>
                                            <span>{(sorteos.find(s => s.id === loteriaForm.sorteo_id)?.precio || 0) + (sorteos.find(s => s.id === loteriaForm.sorteo_id)?.recargo || 0)}€</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-fila-dark font-black tracking-tighter uppercase text-sm">TOTAL A COBRAR:</span>
                                            <span className="text-2xl font-black text-fila-gold">
                                                {(parseInt(loteriaForm.cantidad || '0') * ((sorteos.find(s => s.id === loteriaForm.sorteo_id)?.precio || 0) + (sorteos.find(s => s.id === loteriaForm.sorteo_id)?.recargo || 0))).toFixed(2)}€
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setLoteriaSocio(null)}
                                        className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-[10px] tracking-widest uppercase"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={chargingId === loteriaSocio.id || !loteriaForm.sorteo_id}
                                        className="flex-[2] px-4 py-4 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase"
                                    >
                                        {chargingId === loteriaSocio.id ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                                        Confirmar Asignación
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Transaction Modal (Manual) */}
                {transactionSocio && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-7 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Movimiento Manual</h2>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{transactionSocio.nombre} {transactionSocio.primer_apellido}</p>
                                </div>
                                <button onClick={() => setTransactionSocio(null)} className="p-2 hover:bg-gray-100 rounded-full text-fila-dark transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateTransaction} className="p-8 space-y-6">
                                <div className="flex gap-4 p-2 bg-gray-100 rounded-[20px] relative">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionForm({ ...transactionForm, tipo: 'cobro' })}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all z-10 ${transactionForm.tipo === 'cobro' ? 'text-fila-dark' : 'text-gray-400'}`}
                                    >
                                        Cargo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTransactionForm({ ...transactionForm, tipo: 'pago' })}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all z-10 ${transactionForm.tipo === 'pago' ? 'text-fila-green' : 'text-gray-400'}`}
                                    >
                                        Pago
                                    </button>
                                    <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-white rounded-xl shadow-sm transition-all duration-300 ${transactionForm.tipo === 'pago' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'}`} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monto (€)</label>
                                        <input
                                            id="monto-input"
                                            required
                                            value={transactionForm.monto}
                                            onChange={e => setTransactionForm({ ...transactionForm, monto: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-black text-2xl text-fila-dark"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                                        <select
                                            value={transactionForm.estado}
                                            onChange={e => setTransactionForm({ ...transactionForm, estado: e.target.value as any })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold text-xs h-[60px]"
                                        >
                                            <option value="pendiente">PENDIENTE</option>
                                            <option value="completado">COMPLETADO</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Concepto</label>
                                    <input
                                        required
                                        value={transactionForm.concepto}
                                        onChange={e => setTransactionForm({ ...transactionForm, concepto: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold text-sm"
                                        placeholder="Ej: Pago parcial cuota..."
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionSocio(null)}
                                        className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-[10px] tracking-widest uppercase"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={chargingId === transactionSocio.id}
                                        className={`flex-[2] px-4 py-4 rounded-2xl font-black transition-all shadow-xl text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 ${transactionForm.tipo === 'pago' ? 'bg-fila-green text-white shadow-fila-green/20 hover:bg-green-700' : 'bg-fila-dark text-white shadow-fila-dark/20 hover:bg-black'}`}
                                    >
                                        {chargingId === transactionSocio.id ? <Loader2 size={16} className="animate-spin" /> : <Euro size={16} />}
                                        {transactionForm.tipo === 'pago' ? 'Registrar Pago' : 'Generar Cargo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Socio Modal */}
                {editingSocio && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-7 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Editar Socio</h2>
                                <button onClick={() => setEditingSocio(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full text-fila-dark transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateSocio} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
                                        <input
                                            required
                                            value={editingSocio.nombre}
                                            onChange={e => setEditingSocio({ ...editingSocio, nombre: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Primer Apellido</label>
                                        <input
                                            required
                                            value={editingSocio.primer_apellido}
                                            onChange={e => setEditingSocio({ ...editingSocio, primer_apellido: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuota Asignada</label>
                                    <select
                                        value={editingSocio.cuota_id || ''}
                                        onChange={e => setEditingSocio({ ...editingSocio, cuota_id: e.target.value || null })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold bg-white"
                                    >
                                        <option value="">Sin Cuota Asignada</option>
                                        {quotas.map(q => (
                                            <option key={q.id} value={q.id}>{q.nombre} ({q.monto}€)</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={editingSocio.email || ''}
                                        onChange={e => setEditingSocio({ ...editingSocio, email: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingSocio(null)}
                                        className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-[10px] tracking-widest uppercase"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-4 py-4 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} />
                                        Guardar Cambios
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
