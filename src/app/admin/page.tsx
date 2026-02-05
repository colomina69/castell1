'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Search, UserPlus, Edit2, Trash2, UserCheck, Loader2, ArrowLeft, MoreVertical, X, Check, Mail, Phone, Euro, Ticket, Save, LayoutDashboard, Settings, LogOut, Calendar, Users, Info, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    loteria_mensual_extra: number;
    se_queda_loteria_mensual: boolean;
    loteria_especial_extra: number;
    grupo: string | null;
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

interface Transaction {
    id: string;
    socio_id: string;
    tipo: 'cobro' | 'pago';
    monto: number;
    concepto: string;
    categoria: string;
    fecha: string;
    estado: 'pendiente' | 'completado' | 'cancelado';
    socios: {
        nombre: string;
        primer_apellido: string;
    };
}

export default function AdminDashboard() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [sorteos, setSorteos] = useState<Sorteo[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'socios' | 'movimientos'>('socios');
    const [isAdmin, setIsAdmin] = useState(false);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [chargingId, setChargingId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
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

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedEvento, setSelectedEvento] = useState<any>(null);
    const [eventInscripciones, setEventInscripciones] = useState<any[]>([]);
    const [eventosList, setEventosList] = useState<any[]>([]);
    const [chargingEvent, setChargingEvent] = useState(false);

    const [createForm, setCreateForm] = useState({
        nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        email: '',
        telefono: '',
        fecha_nacimiento: '',
        cuota_id: '',
        loteria_mensual_extra: 0,
        se_queda_loteria_mensual: false,
        loteria_especial_extra: 0,
        grupo: ''
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
            fetchEventos();
            fetchRecentTransactions();
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

    const fetchEventos = async () => {
        const { data } = await supabase.from('eventos').select('*').order('fecha', { ascending: false });
        if (data) setEventosList(data);
    };

    const fetchRecentTransactions = async () => {
        const { data } = await supabase
            .from('pagos_cobros')
            .select('*, socios(nombre, primer_apellido)')
            .order('fecha', { ascending: false })
            .limit(15);
        if (data) setRecentTransactions(data as any);
    };

    const exportToCSV = (data: Transaction[]) => {
        const headers = ['Socio', 'Concepto', 'Categoría', 'Tipo', 'Monto', 'Fecha', 'Estado'];
        const csvRows = [
            headers.join(','),
            ...data.map(t => [
                `"${t.socios?.nombre} ${t.socios?.primer_apellido}"`,
                `"${t.concepto}"`,
                `"${t.categoria}"`,
                `"${t.tipo}"`,
                t.monto,
                `"${new Date(t.fecha).toLocaleString()}"`,
                `"${t.estado}"`
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `informe_financiero_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = (data: Transaction[]) => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('Informe Financiero - Filà Moros del Castell', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);

        const tableData = data.map(t => [
            `${t.socios?.nombre} ${t.socios?.primer_apellido}`,
            t.concepto,
            t.categoria,
            t.tipo === 'cobro' ? '-' + t.monto + '€' : '+' + t.monto + '€',
            new Date(t.fecha).toLocaleDateString(),
            t.estado
        ]);

        autoTable(doc, {
            head: [['Socio', 'Concepto', 'Cat.', 'Monto', 'Fecha', 'Estado']],
            body: tableData,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [184, 134, 11] } // Fila gold color-ish
        });

        doc.save(`informe_financiero_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExport = async (type: 'csv' | 'pdf') => {
        setIsExporting(true);
        // Fetch ALL transactions for the report
        const { data, error } = await supabase
            .from('pagos_cobros')
            .select('*, socios(nombre, primer_apellido)')
            .order('fecha', { ascending: false });

        if (error) {
            alert('Error al obtener datos para el informe: ' + error.message);
        } else if (data) {
            if (type === 'csv') exportToCSV(data as any);
            else exportToPDF(data as any);
        }
        setIsExporting(false);
    };

    const handleSelectEvento = async (eventoId: string) => {
        const evento = eventosList.find(e => e.id === eventoId);
        setSelectedEvento(evento);
        if (evento) {
            const { data } = await supabase
                .from('inscripciones_eventos')
                .select('*, socios(nombre, primer_apellido)')
                .eq('evento_id', evento.id);
            if (data) setEventInscripciones(data);
        }
    };

    const handleChargeEvent = async (inscripcion: any) => {
        if (!selectedEvento || !inscripcion) return;

        setChargingId(inscripcion.socio_id);
        const total = selectedEvento.precio_socio + (inscripcion.numero_invitados * selectedEvento.precio_invitado);

        const { error } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: inscripcion.socio_id,
                tipo: 'cobro',
                monto: total,
                concepto: `Evento: ${selectedEvento.denominacion} (${inscripcion.numero_invitados} invitados)`,
                categoria: 'Evento',
                estado: 'pendiente'
            }]);

        if (!error) {
            alert('Cargo de evento generado correctamente');
            fetchRecentTransactions();
        } else {
            alert('Error al generar el cargo: ' + error.message);
        }
        setChargingId(null);
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
                loteria_mensual_extra: Number(createForm.loteria_mensual_extra),
                se_queda_loteria_mensual: createForm.se_queda_loteria_mensual,
                loteria_especial_extra: Number(createForm.loteria_especial_extra),
                grupo: createForm.grupo || null,
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
                cuota_id: '',
                loteria_mensual_extra: 0,
                se_queda_loteria_mensual: false,
                loteria_especial_extra: 0,
                grupo: ''
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
                loteria_mensual_extra: Number(editingSocio.loteria_mensual_extra),
                se_queda_loteria_mensual: editingSocio.se_queda_loteria_mensual,
                loteria_especial_extra: Number(editingSocio.loteria_especial_extra),
                grupo: editingSocio.grupo,
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
                categoria: transactionForm.tipo === 'cobro' ? 'Cuota' : 'Varios',
                metodo_pago: transactionForm.tipo === 'pago' ? transactionForm.metodo_pago : null,
                estado: transactionForm.estado
            }]);

        if (!error) {
            alert('Movimiento registrado correctamente');
            setTransactionSocio(null);
            fetchRecentTransactions();
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
                categoria: 'Lotería',
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
            fetchRecentTransactions();
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
                categoria: 'Cuota',
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
            fetchRecentTransactions();
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

    return (
        <main className="min-h-screen bg-[#F8F9FA] flex">
            <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
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

                    {/* Tab Navigation */}
                    <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-[24px] border border-gray-200 w-fit mb-8 shadow-sm">
                        <button
                            onClick={() => setActiveTab('socios')}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'socios'
                                ? 'bg-fila-dark text-white shadow-lg shadow-fila-dark/20'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white'
                                }`}
                        >
                            <Users size={16} />
                            <span>Gestión de Socios</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('movimientos')}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'movimientos'
                                ? 'bg-fila-dark text-white shadow-lg shadow-fila-dark/20'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white'
                                }`}
                        >
                            <Euro size={16} />
                            <span>Historial Movimientos</span>
                        </button>
                    </div>

                    {activeTab === 'socios' ? (
                        <>


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
                                                        <div className="flex justify-end gap-1 transition-all">
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
                        </>
                    ) : (
                        /* Historial Movimientos Tab Content */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-end gap-3 mb-6">
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={isExporting}
                                    className="px-5 py-2.5 bg-white border border-gray-200 text-fila-dark rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Info size={14} className="text-fila-gold" />}
                                    Exportar CSV
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    disabled={isExporting}
                                    className="px-5 py-2.5 bg-fila-dark text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-fila-dark/90 transition-all flex items-center gap-2 shadow-lg shadow-fila-dark/10 disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} className="text-fila-gold" />}
                                    Descargar PDF
                                </button>
                            </div>
                            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-gray-200 shadow-sm overflow-hidden mb-10">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Socio</th>
                                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                                <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {recentTransactions.map((t) => (
                                                <tr key={t.id} className="hover:bg-gray-50/30 transition-all">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-fila-light flex items-center justify-center text-fila-gold font-bold text-[10px]">
                                                                {t.socios?.nombre[0]}{t.socios?.primer_apellido[0]}
                                                            </div>
                                                            <p className="font-bold text-fila-dark uppercase tracking-tight truncate max-w-[150px]">
                                                                {t.socios?.nombre} {t.socios?.primer_apellido}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${t.categoria === 'Cuota' ? 'bg-blue-400' :
                                                                t.categoria === 'Lotería' ? 'bg-orange-400' :
                                                                    t.categoria === 'Evento' ? 'bg-purple-400' : 'bg-gray-400'
                                                                }`} />
                                                            <p className="text-gray-500 font-medium truncate max-w-[250px]">{t.concepto}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className={`font-black text-base ${t.tipo === 'pago' ? 'text-green-600' : 'text-fila-dark'}`}>
                                                            {t.tipo === 'pago' ? '+' : '-'}{Number(t.monto).toFixed(2)}€
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            {new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                            <span className="block opacity-50">{new Date(t.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${t.estado === 'completado' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                            t.estado === 'pendiente' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                                'bg-gray-50 text-gray-400'
                                                            }`}>
                                                            {t.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {recentTransactions.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-20 text-center">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                            <Euro size={32} />
                                                        </div>
                                                        <p className="text-gray-400 font-medium italic">No hay movimientos recientes registrados.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
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
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grupo / Peña</label>
                                    <input
                                        placeholder="Ej: Escuadra, Familia..."
                                        value={createForm.grupo}
                                        onChange={e => setCreateForm({ ...createForm, grupo: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold"
                                    />
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="create_loteria_mensual"
                                            checked={createForm.se_queda_loteria_mensual}
                                            onChange={e => setCreateForm({ ...createForm, se_queda_loteria_mensual: e.target.checked })}
                                            className="w-5 h-5 accent-fila-gold rounded-lg"
                                        />
                                        <label htmlFor="create_loteria_mensual" className="text-[10px] font-black text-fila-dark uppercase tracking-widest cursor-pointer">¿Se queda lotería mensual?</label>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-right block">Décimos Extra Mensuales</label>
                                        <input
                                            type="number"
                                            min="0"
                                            disabled={!createForm.se_queda_loteria_mensual}
                                            value={createForm.loteria_mensual_extra}
                                            onChange={e => setCreateForm({ ...createForm, loteria_mensual_extra: parseInt(e.target.value) || 0 })}
                                            className={`w-full px-5 py-2 rounded-xl border border-gray-200 outline-none font-bold text-center ${!createForm.se_queda_loteria_mensual ? 'opacity-30' : 'focus:border-fila-gold'}`}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="p-5 bg-fila-gold/5 rounded-3xl border border-fila-gold/10">
                                    <label className="text-[10px] font-black text-fila-gold uppercase tracking-widest ml-1 block mb-2">Lotería para Vender (Navidad/Niño)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            min="0"
                                            value={createForm.loteria_especial_extra}
                                            onChange={e => setCreateForm({ ...createForm, loteria_especial_extra: parseInt(e.target.value) || 0 })}
                                            className="flex-1 px-5 py-3 rounded-2xl border border-fila-gold/20 focus:border-fila-gold outline-none font-black text-center text-lg"
                                            placeholder="Décimos a mayores..."
                                        />
                                        <p className="flex-1 text-[10px] font-bold text-gray-400 uppercase leading-tight">Cantidad de décimos adicionales que vende en sorteos especiales.</p>
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

                {/* Event Charging Modal */}
                {isEventModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                            <div className="px-8 py-7 border-b border-gray-100 flex justify-between items-center bg-fila-dark text-white shrink-0">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Cobros de Eventos</h2>
                                    <p className="text-[10px] text-white/70 font-black uppercase tracking-widest">Generar cargos por asistencia</p>
                                </div>
                                <button onClick={() => { setIsEventModalOpen(false); setSelectedEvento(null); setEventInscripciones([]); }} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleccionar Evento</label>
                                    <select
                                        onChange={(e) => handleSelectEvento(e.target.value)}
                                        value={selectedEvento?.id || ''}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold text-fila-dark"
                                    >
                                        <option value="">Selecciona un evento...</option>
                                        {eventosList.map(evento => (
                                            <option key={evento.id} value={evento.id}>
                                                {new Date(evento.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {evento.denominacion}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedEvento && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-2">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inscritos ({eventInscripciones.length})</h3>
                                            <div className="text-[10px] font-black text-fila-gold uppercase">
                                                Precios: socio {selectedEvento.precio_socio}€ | invitado {selectedEvento.precio_invitado}€
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {eventInscripciones.length > 0 ? (
                                                eventInscripciones.map((ins) => (
                                                    <div key={ins.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                                                        <div>
                                                            <p className="font-bold text-fila-dark text-sm uppercase">{ins.socios?.nombre} {ins.socios?.primer_apellido}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                                {ins.grupo} • {ins.numero_invitados} invitados
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-black text-fila-dark">
                                                                {(selectedEvento.precio_socio + (ins.numero_invitados * selectedEvento.precio_invitado)).toFixed(2)}€
                                                            </span>
                                                            <button
                                                                onClick={() => handleChargeEvent(ins)}
                                                                disabled={chargingId === ins.socio_id}
                                                                className="p-2.5 bg-white border border-gray-200 text-fila-gold rounded-xl hover:bg-fila-gold hover:text-white transition-all shadow-sm"
                                                            >
                                                                {chargingId === ins.socio_id ? <Loader2 size={16} className="animate-spin" /> : <Euro size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center py-8 text-gray-400 italic text-sm">No hay inscripciones para este evento.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grupo / Peña</label>
                                    <input
                                        placeholder="Ej: Escuadra, Familia..."
                                        value={editingSocio.grupo || ''}
                                        onChange={e => setEditingSocio({ ...editingSocio, grupo: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none transition-all font-bold"
                                    />
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

                                <div className="grid grid-cols-2 gap-4">
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
                                    <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="edit_loteria_mensual"
                                                checked={editingSocio.se_queda_loteria_mensual}
                                                onChange={e => setEditingSocio({ ...editingSocio, se_queda_loteria_mensual: e.target.checked })}
                                                className="w-5 h-5 accent-fila-gold rounded-lg"
                                            />
                                            <label htmlFor="edit_loteria_mensual" className="text-[10px] font-black text-fila-dark uppercase tracking-widest cursor-pointer">Lotería Mensual</label>
                                        </div>
                                        <div className="space-y-1.5">
                                            <input
                                                type="number"
                                                min="0"
                                                disabled={!editingSocio.se_queda_loteria_mensual}
                                                value={editingSocio.loteria_mensual_extra}
                                                onChange={e => setEditingSocio({ ...editingSocio, loteria_mensual_extra: parseInt(e.target.value) || 0 })}
                                                className={`w-full px-5 py-2 rounded-xl border border-gray-200 outline-none font-bold text-center ${!editingSocio.se_queda_loteria_mensual ? 'opacity-30' : 'focus:border-fila-gold'}`}
                                            />
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center mt-1">Extra Mensual</label>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-fila-gold/5 rounded-3xl border border-fila-gold/10 flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black text-fila-gold uppercase tracking-widest ml-1 block mb-1">Venta Especiales</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editingSocio.loteria_especial_extra}
                                                onChange={e => setEditingSocio({ ...editingSocio, loteria_especial_extra: parseInt(e.target.value) || 0 })}
                                                className="w-full px-5 py-2 rounded-xl border border-fila-gold/20 focus:border-fila-gold outline-none font-black text-center"
                                            />
                                        </div>
                                        <p className="flex-1 text-[8px] font-bold text-gray-400 uppercase leading-tight text-right">Décimos adicionales para vender en Navidad/Niño.</p>
                                    </div>
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
