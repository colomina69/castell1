'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Euro,
    Shield,
    LayoutDashboard,
    Ticket,
    Calendar,
    Users,
    ArrowLeft,
    LogOut,
    MoreVertical,
    X,
    Loader2,
    CheckCircle2,
    Search,
    Plus,
    Info,
    History,
    FileText,
    Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Evento {
    id: string;
    denominacion: string;
    fecha: string;
    precio_socio: number;
    precio_invitado: number;
    epigrafe_id?: string;
    subepigrafe_id?: string;
}

interface Cuota {
    id: string;
    nombre: string;
    monto: number;
    descripcion?: string;
    epigrafe_id?: string;
    subepigrafe_id?: string;
}

interface Inscripcion {
    id: string;
    evento_id: string;
    socio_id: string;
    numero_invitados: number;
    socios: {
        nombre: string;
        primer_apellido: string;
    };
}

interface TransactionState {
    id: string;
    monto: number;
    pagado: number;
    estado: 'pendiente' | 'completado' | 'cancelado';
    is_automatic: boolean;
    concepto: string;
    epigrafe_id?: string;
    subepigrafe_id?: string;
}

export default function CobrosAdmin() {
    const [activeTab, setActiveTab] = useState<'eventos' | 'cuotas' | 'loteria'>('eventos');
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
    const [sorteos, setSorteos] = useState<any[]>([]);
    const [selectedSorteo, setSelectedSorteo] = useState<any | null>(null);
    const [cuotas, setCuotas] = useState<Cuota[]>([]);
    const [selectedCuota, setSelectedCuota] = useState<Cuota | null>(null);
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    const [socios, setSocios] = useState<any[]>([]);
    const [loterias, setLoterias] = useState<any[]>([]);
    const [cargosData, setCargosData] = useState<Record<string, TransactionState>>({});
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSettled, setShowSettled] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Partial payment modal
    const [payingSocio, setPayingSocio] = useState<any | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'Contado' | 'Transferencia'>('Contado');

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
        fetchEventos();
    };

    const fetchEventos = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('eventos')
            .select('*')
            .order('fecha', { ascending: false });
        if (data) setEventos(data);

        const { data: sorteosData } = await supabase
            .from('sorteos')
            .select('*')
            .order('created_at', { ascending: false });
        if (sorteosData) setSorteos(sorteosData);

        // Fetch all socios for Cuotas tab
        const { data: sData } = await supabase
            .from('socios')
            .select('*, cuotas(nombre, monto)')
            .eq('is_active', true)
            .order('primer_apellido', { ascending: true });
        if (sData) setSocios(sData);

        const { data: cuData } = await supabase
            .from('cuotas')
            .select('*')
            .order('nombre', { ascending: true });
        if (cuData) setCuotas(cuData);

        setLoading(false);
    };

    const fetchDebtsAndPayments = async (category: string, conceptFilter?: string) => {
        let query = supabase
            .from('pagos_cobros')
            .select('id, socio_id, estado, concepto, monto, tipo, parent_id, epigrafe_id, subepigrafe_id')
            .eq('categoria', category);

        if (conceptFilter) {
            query = query.ilike('concepto', `%${conceptFilter}%`);
        }

        const { data: chargesData } = await query;

        if (chargesData) {
            const dataMap: Record<string, TransactionState> = {};

            // First identify debts (cobro)
            chargesData.filter(c => c.tipo === 'cobro').forEach(c => {
                const state: TransactionState = {
                    id: c.id,
                    monto: Number(c.monto),
                    pagado: 0,
                    estado: c.estado as any,
                    is_automatic: c.concepto.toLowerCase().includes('inscripción'),
                    concepto: c.concepto,
                    epigrafe_id: c.epigrafe_id,
                    subepigrafe_id: c.subepigrafe_id
                };
                dataMap[c.id] = state; // Map by Debt ID
                dataMap[c.socio_id] = state; // Map by Socio ID (fallback)
            });

            // Then add payments (pago) linked to those debts
            chargesData.filter(c => c.tipo === 'pago').forEach(c => {
                const debtId = c.parent_id;
                if (debtId && dataMap[debtId]) {
                    dataMap[debtId].pagado += Number(c.monto);
                } else if (dataMap[c.socio_id]) {
                    // Fallback for older records or if parent_id is missing
                    dataMap[c.socio_id].pagado += Number(c.monto);
                }
            });

            setCargosData(dataMap);
        } else {
            setCargosData({});
        }
    };

    const handleSelectEvento = async (evento: Evento) => {
        setSelectedEvento(evento);
        setLoading(true);

        // Fetch inscripciones
        const { data: insData } = await supabase
            .from('inscripciones_eventos')
            .select('*, socios(nombre, primer_apellido)')
            .eq('evento_id', evento.id);

        if (insData) setInscripciones(insData as any);

        await fetchDebtsAndPayments('Evento', evento.denominacion);

        setLoading(false);
    };

    const handleSelectSorteo = async (sorteo: any) => {
        setSelectedSorteo(sorteo);
        setLoading(true);

        const { data: loteriaData } = await supabase
            .from('loterias_asignadas')
            .select('*, socios(nombre, primer_apellido), sorteos(descripcion, precio, recargo)')
            .eq('sorteo_id', sorteo.id)
            .order('created_at', { ascending: false });

        if (loteriaData) setLoterias(loteriaData);

        await fetchDebtsAndPayments('Lotería', sorteo.descripcion);

        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'cuotas') {
            fetchDebtsAndPayments('Cuota');
        } else if (activeTab === 'loteria' && selectedSorteo) {
            handleSelectSorteo(selectedSorteo);
        } else if (activeTab === 'eventos' && selectedEvento) {
            handleSelectEvento(selectedEvento);
        }
    }, [activeTab, selectedEvento, selectedSorteo, selectedCuota]); // Added selectedCuota to dependencies

    const handleChargeEvent = async (ins: Inscripcion) => {
        if (!selectedEvento) return;
        setProcessingId(ins.socio_id);

        const total = selectedEvento.precio_socio + (ins.numero_invitados * selectedEvento.precio_invitado);

        const { data, error } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: ins.socio_id,
                tipo: 'cobro',
                monto: total,
                concepto: `Evento: ${selectedEvento.denominacion} (${ins.numero_invitados} invitados)`,
                categoria: 'Evento',
                estado: 'pendiente',
                epigrafe_id: selectedEvento.epigrafe_id,
                subepigrafe_id: selectedEvento.subepigrafe_id
            }])
            .select()
            .single();

        if (!error && data) {
            setCargosData({
                ...cargosData,
                [ins.socio_id]: {
                    id: data.id,
                    monto: total,
                    pagado: 0,
                    estado: 'pendiente',
                    is_automatic: false,
                    concepto: data.concepto
                }
            });
        } else if (error) {
            alert('Error al generar el cobro: ' + error.message);
        }
        setProcessingId(null);
    };

    const handleLiquidatePartial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingSocio) return;

        const cargoId = payingSocio.cargo_id || payingSocio.socio_id;
        const cargo = cargosData[cargoId];
        if (!cargo) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, indica un monto válido.');
            return;
        }

        setLoading(true);

        // Record the payment
        const { data: paymentRecord, error: pError } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: payingSocio.socio_id,
                tipo: 'pago',
                monto: amount,
                concepto: `Abono parcial: ${cargo.concepto}`,
                categoria: activeTab === 'eventos' ? 'Evento' : activeTab === 'cuotas' ? 'Cuota' : 'Lotería',
                estado: 'completado',
                metodo_pago: paymentMethod,
                parent_id: cargo.id,
                epigrafe_id: cargo.epigrafe_id,
                subepigrafe_id: cargo.subepigrafe_id
            }])
            .select()
            .single();

        if (!pError) {
            const newPagado = cargo.pagado + amount;
            const isFullyPaid = newPagado >= cargo.monto;

            // If fully paid, update original debt status
            if (isFullyPaid) {
                await supabase
                    .from('pagos_cobros')
                    .update({ estado: 'completado' })
                    .eq('id', cargo.id);
            }

            // Refresh data from server to ensure everything is in sync
            if (activeTab === 'loteria' && selectedSorteo) {
                handleSelectSorteo(selectedSorteo);
            } else if (activeTab === 'eventos' && selectedEvento) {
                handleSelectEvento(selectedEvento);
            } else if (activeTab === 'cuotas') {
                fetchDebtsAndPayments('Cuota');
            }

            setPayingSocio(null);
            setPaymentAmount('');
        } else {
            alert('Error al registrar el abono: ' + pError.message);
        }
        setLoading(false);
    };

    const handleChargeQuota = async (socio: any) => {
        if (!selectedCuota) return; // Ensure a cuota type is selected
        setProcessingId(socio.id);

        const { data, error } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: socio.id,
                tipo: 'cobro',
                monto: selectedCuota.monto,
                concepto: `Cuota Anual ${new Date().getFullYear()}: ${selectedCuota.nombre}`, // Use selectedCuota
                categoria: 'Cuota',
                estado: 'pendiente',
                epigrafe_id: selectedCuota.epigrafe_id,
                subepigrafe_id: selectedCuota.subepigrafe_id
            }])
            .select()
            .single();

        if (!error && data) {
            setCargosData({
                ...cargosData,
                [socio.id]: {
                    id: data.id,
                    monto: selectedCuota.monto,
                    pagado: 0,
                    estado: 'pendiente',
                    is_automatic: false,
                    concepto: data.concepto
                }
            });
        } else if (error) {
            alert('Error al generar el cobro de cuota: ' + error.message);
        }
        setProcessingId(null);
    };

    const handleChargeLoteria = async (loteria: any) => {
        setProcessingId(loteria.id); // Use assignment ID as temporary processing ID

        const { data, error } = await supabase
            .from('pagos_cobros')
            .insert([{
                socio_id: loteria.socio_id,
                tipo: 'cobro',
                monto: loteria.total_monto,
                concepto: `Lotería: ${loteria.sorteos.descripcion}`,
                categoria: 'Lotería',
                estado: 'pendiente'
            }])
            .select()
            .single();

        if (!error && data) {
            // Update the lottery assignment to link it with the debt
            await supabase
                .from('loterias_asignadas')
                .update({ pago_id: data.id })
                .eq('id', loteria.id);

            setCargosData({
                ...cargosData,
                [loteria.socio_id]: {
                    id: data.id,
                    monto: Number(loteria.total_monto),
                    pagado: 0,
                    estado: 'pendiente',
                    is_automatic: false,
                    concepto: data.concepto
                }
            });

            // Update local loterias state to reflect the link
            setLoterias(prev => prev.map(l => l.id === loteria.id ? { ...l, pago_id: data.id } : l));
        }
        setProcessingId(null);
    };

    const handleDeleteCharge = async (socio: any, cargoIdKey: string) => {
        const cargo = cargosData[cargoIdKey];
        if (!cargo || !confirm('¿Estás seguro de eliminar este cargo pendiente?')) return;

        setProcessingId(activeTab === 'loteria' ? socio.id : socio.socio_id);
        const { error } = await supabase
            .from('pagos_cobros')
            .delete()
            .eq('id', cargo.id);

        if (!error) {
            if (activeTab === 'loteria' && selectedSorteo) {
                handleSelectSorteo(selectedSorteo);
            } else if (activeTab === 'eventos' && selectedEvento) {
                handleSelectEvento(selectedEvento);
            } else if (activeTab === 'cuotas') {
                fetchDebtsAndPayments('Cuota');
            }
        } else {
            alert('Error al eliminar cargo: ' + error.message);
        }
        setProcessingId(null);
    };

    const handleExport = async (format: 'csv' | 'pdf') => {
        setIsExporting(true);
        const dataToExport = (activeTab === 'eventos' ? filteredInscripciones : activeTab === 'cuotas' ? socios : loterias).filter(item => {
            const name = activeTab === 'eventos' ? `${item.socios.nombre} ${item.socios.primer_apellido}` : activeTab === 'cuotas' ? `${item.nombre} ${item.primer_apellido}` : `${item.socios.nombre} ${item.socios.primer_apellido}`;
            if (!name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            const socioId = activeTab === 'eventos' ? item.socio_id : activeTab === 'cuotas' ? item.id : item.socio_id;
            const cargo = (activeTab === 'loteria' && item.pago_id) ? cargosData[item.pago_id] : cargosData[socioId];

            // Filter by cuota_id if in cuotas tab
            if (activeTab === 'cuotas' && selectedCuota && item.cuota_id !== selectedCuota.id) {
                return false;
            }

            if (!showSettled) {
                const isPending = !cargo || cargo.estado !== 'completado';
                return isPending;
            }
            return true;
        }).map(item => {
            const socioId = activeTab === 'eventos' ? item.socio_id : activeTab === 'cuotas' ? item.id : item.socio_id;
            const cargo = (activeTab === 'loteria' && item.pago_id) ? cargosData[item.pago_id] : cargosData[socioId];
            const name = activeTab === 'eventos' ? `${item.socios.nombre} ${item.socios.primer_apellido}` : activeTab === 'cuotas' ? `${item.nombre} ${item.primer_apellido}` : `${item.socios.nombre} ${item.socios.primer_apellido}`;

            let total = 0;
            let concepto = '';
            if (activeTab === 'eventos' && selectedEvento) {
                total = selectedEvento.precio_socio + (item.numero_invitados * selectedEvento.precio_invitado);
                concepto = `Evento: ${selectedEvento.denominacion} (${item.numero_invitados} invitados)`;
            } else if (activeTab === 'cuotas' && selectedCuota) { // Use selectedCuota
                total = Number(selectedCuota.monto);
                concepto = `Cuota Anual ${new Date().getFullYear()}: ${selectedCuota.nombre}`;
            } else if (activeTab === 'loteria' && item.total_monto) {
                total = Number(item.total_monto);
                concepto = `Lotería: ${item.sorteos.descripcion} (Cant: ${item.cantidad})`;
            }

            return {
                socio: name,
                concepto: cargo?.concepto || concepto,
                monto_total: total.toFixed(2),
                pagado: cargo?.pagado.toFixed(2) || '0.00',
                pendiente: (total - (cargo?.pagado || 0)).toFixed(2),
                estado: cargo?.estado === 'completado' ? 'Liquidado' : 'Pendiente'
            };
        });

        if (format === 'csv') {
            const headers = Object.keys(dataToExport[0]).join(',');
            const csv = [
                headers,
                ...dataToExport.map(row => Object.values(row).join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${activeTab}_cobros.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            const title = `Reporte de Cobros - ${activeTab === 'eventos' ? selectedEvento?.denominacion : activeTab === 'cuotas' ? selectedCuota?.nombre : selectedSorteo?.descripcion}`;
            doc.text(title, 14, 20);

            autoTable(doc, {
                head: [Object.keys(dataToExport[0])],
                body: dataToExport.map(row => Object.values(row)),
                startY: 30,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [30, 41, 59] }, // fila-dark
                alternateRowStyles: { fillColor: [241, 245, 249] } // gray-100
            });

            doc.save(`${activeTab}_cobros.pdf`);
        }
        setIsExporting(false);
    };

    if (!isAdmin || (loading && eventos.length === 0 && cuotas.length === 0 && sorteos.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
                <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
                <p className="text-fila-dark font-bold">Cargando Sección de Cobros...</p>
            </div>
        );
    }

    const filteredInscripciones = inscripciones.filter(ins =>
        `${ins.socios.nombre} ${ins.socios.primer_apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculation of totals
    const currentList = (activeTab === 'eventos' ? filteredInscripciones : activeTab === 'cuotas' ? socios.filter(s => selectedCuota ? s.cuota_id === selectedCuota.id : true) : loterias).filter(item => {
        const name = activeTab === 'eventos' ? `${item.socios.nombre} ${item.socios.primer_apellido}` : activeTab === 'cuotas' ? `${item.nombre} ${item.primer_apellido}` : `${item.socios.nombre} ${item.socios.primer_apellido}`;
        if (!name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const totals = currentList.reduce((acc, item) => {
        const socioId = activeTab === 'eventos' ? item.socio_id : activeTab === 'cuotas' ? item.id : item.socio_id;
        const cargo = (activeTab === 'loteria' && item.pago_id) ? cargosData[item.pago_id] : cargosData[socioId];

        let totalItemAmount = 0;
        if (activeTab === 'eventos' && selectedEvento) {
            totalItemAmount = selectedEvento.precio_socio + (item.numero_invitados * selectedEvento.precio_invitado);
        } else if (activeTab === 'cuotas' && selectedCuota) {
            totalItemAmount = Number(selectedCuota.monto);
        } else if (activeTab === 'loteria' && item.total_monto) {
            totalItemAmount = Number(item.total_monto);
        }

        if (cargo) {
            acc.total += totalItemAmount;
            acc.cobrado += cargo.pagado;
            acc.pendiente += (totalItemAmount - cargo.pagado);
        } else {
            // If no cargo exists, it's a pending debt
            acc.total += totalItemAmount;
            acc.pendiente += totalItemAmount;
        }
        return acc;
    }, { total: 0, cobrado: 0, pendiente: 0 });

    // Global totals for all Cuotas (regardless of selected type)
    const globalFeesTotals = activeTab === 'cuotas' ? socios.reduce((acc, s) => {
        const monto = Number(s.cuotas?.monto || 0);
        const cargo = cargosData[s.id];
        acc.total += monto;
        acc.cobrado += cargo?.pagado || 0;
        acc.pendiente += (monto - (cargo?.pagado || 0));
        return acc;
    }, { total: 0, cobrado: 0, pendiente: 0 }) : null;


    return (
        <main className="min-h-screen bg-[#F8F9FA] flex">
            <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
                <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-40 gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2.5 bg-fila-light text-fila-dark rounded-xl">
                            <MoreVertical size={20} />
                        </button>
                        <h1 className="text-xl font-black text-fila-dark uppercase tracking-tighter shrink-0">Gestión de Cobros</h1>
                    </div>

                    <div className="flex bg-gray-100/50 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('eventos')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'eventos' ? 'bg-white text-fila-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Eventos
                        </button>
                        <button
                            onClick={() => setActiveTab('cuotas')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cuotas' ? 'bg-white text-fila-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Cuotas
                        </button>
                        <button
                            onClick={() => setActiveTab('loteria')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'loteria' ? 'bg-white text-fila-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Lotería
                        </button>
                    </div>
                </nav>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar: Selectors */}
                    <div className="w-full lg:w-96 shrink-0">
                        {activeTab === 'eventos' || activeTab === 'loteria' || activeTab === 'cuotas' ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-2 mb-6">
                                    <div className="w-1.5 h-8 bg-fila-gold rounded-full"></div>
                                    <h3 className="text-xl font-black text-fila-dark uppercase tracking-tight">
                                        Seleccionar {activeTab === 'eventos' ? 'Evento' : activeTab === 'loteria' ? 'Sorteo' : 'Tipo de Cuota'}
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {(activeTab === 'eventos' ? eventos : activeTab === 'loteria' ? sorteos : cuotas).map((item) => {
                                        const isSelected = activeTab === 'eventos' ? selectedEvento?.id === item.id :
                                            activeTab === 'loteria' ? selectedSorteo?.id === item.id :
                                                selectedCuota?.id === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    if (activeTab === 'eventos') handleSelectEvento(item);
                                                    else if (activeTab === 'loteria') handleSelectSorteo(item);
                                                    else setSelectedCuota(item);
                                                }}
                                                className={`w-full p-6 rounded-[32px] text-left transition-all border-2 flex flex-col gap-2 ${isSelected
                                                    ? 'bg-fila-green border-fila-green shadow-xl shadow-fila-green/20 -translate-y-1'
                                                    : 'bg-white border-gray-100 hover:border-fila-gold/30 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/70' : 'text-fila-gold'}`}>
                                                        {activeTab === 'eventos' ? new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' }) :
                                                            activeTab === 'loteria' ? (item.numero ? `Nº ${item.numero}` : 'Extraordinario') :
                                                                `${item.monto}€ Anuales`}
                                                    </span>
                                                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                                                        {activeTab === 'eventos' ? <Calendar size={14} className={isSelected ? 'text-white' : 'text-gray-400'} /> :
                                                            activeTab === 'loteria' ? <Ticket size={14} className={isSelected ? 'text-white' : 'text-gray-400'} /> :
                                                                <Euro size={14} className={isSelected ? 'text-white' : 'text-gray-400'} />}
                                                    </div>
                                                </div>
                                                <h4 className={`font-black text-lg leading-tight uppercase tracking-tight ${isSelected ? 'text-white' : 'text-fila-dark'}`}>
                                                    {activeTab === 'eventos' ? item.denominacion : activeTab === 'loteria' ? item.descripcion : item.nombre}
                                                </h4>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center">
                                <div className="w-16 h-16 bg-fila-light rounded-2xl flex items-center justify-center text-fila-gold mx-auto mb-4">
                                    <Euro size={32} />
                                </div>
                                <h3 className="text-lg font-black text-fila-dark uppercase leading-none mb-2">
                                    Gestión de Cobros
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Selecciona una categoría arriba
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Main Panel: List & Balance */}
                    <div className="flex-1 bg-white rounded-[40px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                        {(activeTab === 'eventos' && !selectedEvento) || (activeTab === 'loteria' && !selectedSorteo) || (activeTab === 'cuotas' && !selectedCuota) ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                <div className="w-20 h-20 bg-fila-light rounded-full flex items-center justify-center text-fila-gold mb-4">
                                    {activeTab === 'eventos' ? <Calendar size={40} /> : activeTab === 'cuotas' ? <Euro size={40} /> : <Ticket size={40} />}
                                </div>
                                <h3 className="text-xl font-black text-fila-dark uppercase">Selecciona un {activeTab === 'eventos' ? 'evento' : activeTab === 'cuotas' ? 'tipo de cuota' : 'sorteo'}</h3>
                                <p className="text-gray-400 mt-2">Para ver y gestionar los cobros correspondientes.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-8 border-b border-gray-50 bg-fila-light/30">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-fila-dark tracking-tighter uppercase whitespace-nowrap">
                                                {activeTab === 'eventos' ? selectedEvento?.denominacion : activeTab === 'cuotas' ? selectedCuota?.nombre : selectedSorteo?.descripcion}
                                            </h3>
                                            <p className="text-xs font-bold text-fila-gold uppercase tracking-widest">
                                                {activeTab === 'eventos' ? 'Cobros por inscripción' : activeTab === 'cuotas' ? `Socios con cuota de ${selectedCuota?.monto}€` : 'Décimos por sorteo'}
                                            </p>
                                        </div>
                                    </div>

                                    {activeTab === 'cuotas' && globalFeesTotals && (
                                        <div className="mb-6 p-4 bg-fila-dark rounded-3xl border border-white/10 shadow-lg">
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 text-center">Resumen de Cuotas Anuales (Presupuesto Global)</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="text-center">
                                                    <p className="text-[8px] font-bold text-white/30 uppercase mb-1">Total Previsto</p>
                                                    <p className="text-sm font-black text-white">{globalFeesTotals.total.toFixed(2)}€</p>
                                                </div>
                                                <div className="text-center border-x border-white/5">
                                                    <p className="text-[8px] font-bold text-white/30 uppercase mb-1">Recaudado</p>
                                                    <p className="text-sm font-black text-green-400">{globalFeesTotals.cobrado.toFixed(2)}€</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-bold text-white/30 uppercase mb-1">Pendiente</p>
                                                    <p className="text-sm font-black text-orange-400">{globalFeesTotals.pendiente.toFixed(2)}€</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total {activeTab === 'loteria' ? 'Sorteo' : 'Categoría'}</p>
                                            <p className="text-2xl font-black text-fila-dark">{totals.total.toFixed(2)}€</p>
                                        </div>
                                        <div className="bg-green-50 p-5 rounded-3xl border border-green-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-1">Ya Cobrado</p>
                                            <p className="text-2xl font-black text-green-600">{totals.cobrado.toFixed(2)}€</p>
                                        </div>
                                        <div className="bg-orange-50 p-5 rounded-3xl border border-orange-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] font-black text-orange-600/60 uppercase tracking-widest mb-1">Pendiente</p>
                                            <p className="text-2xl font-black text-orange-600">{totals.pendiente.toFixed(2)}€</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder={`Buscar por nombre de socio...`}
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-gray-100 focus:border-fila-gold outline-none font-bold text-sm shadow-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowSettled(!showSettled)}
                                            className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${showSettled ? 'bg-fila-dark text-white border-fila-dark' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                        >
                                            {showSettled ? 'Ocultar Saldados' : 'Ver Todos'}
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleExport('csv')}
                                                disabled={isExporting}
                                                className="p-4 bg-white border border-gray-100 text-fila-gold rounded-2xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                                                title="Exportar CSV"
                                            >
                                                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleExport('pdf')}
                                                disabled={isExporting}
                                                className="p-4 bg-fila-dark text-white rounded-2xl hover:bg-fila-dark/90 transition-all shadow-lg disabled:opacity-50"
                                                title="Descargar PDF"
                                            >
                                                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="animate-spin text-fila-gold" size={30} />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {(activeTab === 'eventos' ? filteredInscripciones : activeTab === 'cuotas' ? socios : loterias).filter(item => {
                                                const name = activeTab === 'eventos' ? `${item.socios.nombre} ${item.socios.primer_apellido}` : activeTab === 'cuotas' ? `${item.nombre} ${item.primer_apellido}` : `${item.socios.nombre} ${item.socios.primer_apellido}`;
                                                if (!name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

                                                const socioId = activeTab === 'eventos' ? item.socio_id : activeTab === 'cuotas' ? item.id : item.socio_id;
                                                const cargo = (activeTab === 'loteria' && item.pago_id) ? cargosData[item.pago_id] : cargosData[socioId];

                                                // Filter by cuota_id if in cuotas tab
                                                if (activeTab === 'cuotas' && selectedCuota && item.cuota_id !== selectedCuota.id) {
                                                    return false;
                                                }

                                                // Filter by showSettled
                                                if (!showSettled) {
                                                    const isPending = !cargo || cargo.estado !== 'completado';
                                                    return isPending;
                                                }
                                                return true;
                                            }).map(item => {
                                                const socioId = activeTab === 'eventos' ? item.socio_id : activeTab === 'cuotas' ? item.id : item.socio_id;
                                                const cargo = (activeTab === 'loteria' && item.pago_id) ? cargosData[item.pago_id] : cargosData[socioId];
                                                const isProcessing = processingId === (activeTab === 'loteria' ? item.id : socioId);
                                                const name = activeTab === 'eventos' ? `${item.socios.nombre} ${item.socios.primer_apellido}` : activeTab === 'cuotas' ? `${item.nombre} ${item.primer_apellido}` : `${item.socios.nombre} ${item.socios.primer_apellido}`;

                                                let total = 0;
                                                if (activeTab === 'eventos' && selectedEvento) {
                                                    total = selectedEvento.precio_socio + (item.numero_invitados * selectedEvento.precio_invitado);
                                                } else if (activeTab === 'cuotas' && item.cuotas) {
                                                    total = Number(item.cuotas.monto);
                                                } else if (activeTab === 'loteria' && item.total_monto) {
                                                    total = Number(item.total_monto);
                                                }

                                                return (
                                                    <div key={item.id} className="p-5 rounded-3xl border border-gray-50 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between hover:bg-white hover:shadow-md transition-all group gap-4 md:gap-0">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${cargo?.estado === 'completado' ? 'bg-green-100 text-green-600' : cargo?.estado === 'pendiente' ? 'bg-orange-100 text-orange-600' : 'bg-white text-fila-dark shadow-sm'}`}>
                                                                {cargo?.estado === 'completado' ? <CheckCircle2 size={24} /> : name[0]}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <Link
                                                                        href={`/admin?search=${name}`}
                                                                        className="font-black text-fila-dark uppercase tracking-tight hover:text-fila-gold transition-colors cursor-pointer"
                                                                        title="Ver perfil del socio"
                                                                    >
                                                                        {name}
                                                                    </Link>
                                                                    {cargo?.is_automatic && (
                                                                        <div title="Generado automáticamente" className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-lg">
                                                                            <Shield size={10} className="fill-blue-500" />
                                                                            <span className="text-[8px] font-black uppercase">Auto</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    {activeTab === 'eventos' ? `${item.numero_invitados} invitados • Total: ${total}€` : activeTab === 'cuotas' ? `${item.cuotas?.nombre || 'Sin cuota'} • Monto: ${total}€` : `${item.sorteos.descripcion} • Cant: ${item.cantidad} • Total: ${total}€`}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {cargo ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-right mr-2 hidden sm:block">
                                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pagado / Restante</p>
                                                                        <p className="text-xs font-black text-fila-dark">
                                                                            {cargo.pagado.toFixed(2)}€ / <span className="text-red-500">{(cargo.monto - cargo.pagado).toFixed(2)}€</span>
                                                                        </p>
                                                                    </div>

                                                                    {cargo.estado === 'pendiente' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-orange-100 whitespace-nowrap">
                                                                                {cargo.pagado > 0 ? 'Liquidación Parcial' : 'Deuda Pendiente'}
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const cargoKey = (activeTab === 'loteria' && item.pago_id) ? item.pago_id : socioId;
                                                                                        setPayingSocio({ socio_id: socioId, cargo_id: cargoKey, nombre: name });
                                                                                        setPaymentAmount((cargo.monto - cargo.pagado).toString());
                                                                                    }}
                                                                                    disabled={isProcessing}
                                                                                    title="Realizar Liquidación"
                                                                                    className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-sm"
                                                                                >
                                                                                    <Euro size={16} />
                                                                                </button>
                                                                                {cargo.pagado === 0 && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const cargoKey = (activeTab === 'loteria' && item.pago_id) ? item.pago_id : socioId;
                                                                                            handleDeleteCharge({ ...item, socio_id: socioId }, cargoKey);
                                                                                        }}
                                                                                        disabled={isProcessing}
                                                                                        title="Eliminar Cargo"
                                                                                        className="p-3 bg-red-50 text-red-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-all"
                                                                                    >
                                                                                        <X size={16} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-2">
                                                                            <CheckCircle2 size={14} />
                                                                            Liquidado
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => activeTab === 'eventos' ? handleChargeEvent(item) : activeTab === 'cuotas' ? handleChargeQuota(item) : handleChargeLoteria(item)}
                                                                    disabled={isProcessing || (activeTab === 'cuotas' && !item.cuota_id)}
                                                                    className="px-6 py-3 bg-white border border-gray-200 text-fila-gold rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-fila-gold hover:text-white hover:border-fila-gold transition-all shadow-sm disabled:opacity-50"
                                                                >
                                                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Generar Cargo'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {(activeTab === 'eventos' ? filteredInscripciones : activeTab === 'cuotas' ? socios : loterias).length === 0 && (
                                                <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                    <p className="text-gray-400 font-bold">No se encontró información para mostrar.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Partial Liquidation Modal */}
                {payingSocio && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-fila-green text-white">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">Registrar Pago</h2>
                                    <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em]">{payingSocio.nombre}</p>
                                </div>
                                <button onClick={() => setPayingSocio(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleLiquidatePartial} className="p-10 space-y-6">
                                <div className="p-6 bg-gray-50 rounded-3xl space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <span>Total Deuda</span>
                                        <span className="text-fila-dark font-black">{cargosData[payingSocio.cargo_id || payingSocio.socio_id]?.monto.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <span>Ya abonado</span>
                                        <span className="text-fila-green font-black">{cargosData[payingSocio.cargo_id || payingSocio.socio_id]?.pagado.toFixed(2)}€</span>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center uppercase tracking-widest">
                                        <span className="text-[10px] font-black text-fila-gold">Remanente</span>
                                        <span className="text-lg font-black text-red-500">{(cargosData[payingSocio.cargo_id || payingSocio.socio_id]?.monto - cargosData[payingSocio.cargo_id || payingSocio.socio_id]?.pagado).toFixed(2)}€</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Método de pago</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('Contado')}
                                            className={`py-3.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${paymentMethod === 'Contado' ? 'bg-fila-dark border-fila-dark text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                        >
                                            Contado
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('Transferencia')}
                                            className={`py-3.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${paymentMethod === 'Transferencia' ? 'bg-fila-dark border-fila-dark text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                        >
                                            Transferencia
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monto a liquidar ahora</label>
                                    <div className="relative">
                                        <Euro size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-fila-gold" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            autoFocus
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 rounded-3xl border border-gray-100 focus:border-fila-green outline-none font-black text-2xl text-fila-dark shadow-sm bg-gray-50/30"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 rounded-3xl bg-fila-green text-white font-black hover:bg-fila-green/90 transition-all shadow-xl shadow-fila-green/20 flex items-center justify-center gap-2 text-sm tracking-widest uppercase"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Euro size={18} />}
                                    CONFIRMAR LIQUIDACIÓN
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
