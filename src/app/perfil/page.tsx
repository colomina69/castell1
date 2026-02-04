'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield } from '@/components/Shield';
import { User, Mail, Phone, Calendar, LogOut, Loader2, Award, ShieldCheck, Euro, FileText } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SocioData {
    id: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    email: string;
    telefono: string;
    fecha_nacimiento: string;
    cuota_id: string | null;
}

interface Quota {
    nombre: string;
    monto: number;
}

interface Transaction {
    id: string;
    tipo: 'cobro' | 'pago';
    monto: number;
    concepto: string;
    categoria: string;
    fecha: string;
    estado: 'pendiente' | 'completado' | 'cancelado';
    metodo_pago?: string;
}

interface Evento {
    id: string;
    denominacion: string;
    fecha: string;
    descripcion: string | null;
    ubicacion: string | null;
    precio_socio: number;
    precio_invitado: number;
    desfile: boolean;
    itinerario_desfile: string | null;
    fecha_limite: string;
}

interface Inscripcion {
    evento_id: string;
}

export default function PerfilPage() {
    const [socio, setSocio] = useState<SocioData | null>(null);
    const [quota, setQuota] = useState<Quota | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [misInscripciones, setMisInscripciones] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [registeringEvento, setRegisteringEvento] = useState<Evento | null>(null);
    const [registrationForm, setRegistrationForm] = useState({
        grupo: '',
        numero_invitados: '0'
    });
    const router = useRouter();

    useEffect(() => {
        const fetchSocioData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'admin') setIsAdmin(true);

            // Buscar los datos del socio vinculados por email
            const { data, error } = await supabase
                .from('socios')
                .select('*')
                .eq('email', user.email)
                .single();

            if (data) {
                setSocio(data);

                // Fetch Quota Details
                if (data.cuota_id) {
                    const { data: qData } = await supabase
                        .from('cuotas')
                        .select('nombre, monto')
                        .eq('id', data.cuota_id)
                        .single();
                    if (qData) setQuota(qData);
                }

                // Fetch Transactions
                const { data: tData } = await supabase
                    .from('pagos_cobros')
                    .select('*')
                    .eq('socio_id', data.id)
                    .order('categoria', { ascending: true })
                    .order('fecha', { ascending: true });
                if (tData) setTransactions(tData);

                // Fetch Events
                const { data: eData } = await supabase
                    .from('eventos')
                    .select('*')
                    .gte('fecha', new Date().toISOString())
                    .order('fecha', { ascending: true });
                if (eData) setEventos(eData);

                // Fetch My Registrations
                const { data: iData } = await supabase
                    .from('inscripciones_eventos')
                    .select('evento_id')
                    .eq('socio_id', data.id);
                if (iData) setMisInscripciones(iData.map(i => i.evento_id));
            }
            setLoading(false);
        };

        fetchSocioData();
    }, [router]);

    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!socio || !registeringEvento) return;

        setLoading(true);
        const { error } = await supabase
            .from('inscripciones_eventos')
            .insert([{
                evento_id: registeringEvento.id,
                socio_id: socio.id,
                grupo: registrationForm.grupo,
                numero_invitados: parseInt(registrationForm.numero_invitados) || 0
            }]);

        if (!error) {
            // Generar cargo pendiente automáticamente
            const invitadosNum = parseInt(registrationForm.numero_invitados) || 0;
            const total = registeringEvento.precio_socio + (invitadosNum * registeringEvento.precio_invitado);

            await supabase
                .from('pagos_cobros')
                .insert([{
                    socio_id: socio.id,
                    tipo: 'cobro',
                    monto: total,
                    concepto: `Inscripción Evento: ${registeringEvento.denominacion} (${invitadosNum} invitados)`,
                    categoria: 'Evento',
                    estado: 'pendiente'
                }]);

            setMisInscripciones([...misInscripciones, registeringEvento.id]);
            setRegisteringEvento(null);
            setRegistrationForm({ grupo: '', numero_invitados: '0' });

            // Refresh transactions
            const { data: tData } = await supabase
                .from('pagos_cobros')
                .select('*')
                .eq('socio_id', socio.id)
                .order('categoria', { ascending: true })
                .order('fecha', { ascending: false });
            if (tData) setTransactions(tData);
        } else {
            console.error('Error al registrarse:', error.message);
        }
        setLoading(false);
    };

    const generatePDF = () => {
        if (!socio) return;

        const doc = new jsPDF();
        const fullName = `${socio.nombre} ${socio.primer_apellido} ${socio.segundo_apellido || ''}`.trim();
        const date = new Date().toLocaleDateString('es-ES');

        // Header
        doc.setFontSize(22);
        doc.setTextColor(184, 153, 76); // fila-gold
        doc.text('FILÀ MOROS DEL CASTELL', 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(33, 37, 41); // fila-dark
        doc.text('EXTRACTO DE MOVIMIENTOS', 105, 30, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Socio: ${fullName}`, 20, 45);
        doc.text(`Fecha: ${date}`, 20, 50);

        let finalY = 60;

        // Group transactions by category and sub-group
        const categories = Array.from(new Set(transactions.map(t => t.categoria || 'Varios')));

        const getSubGroupName = (concepto: string, categoria: string) => {
            let name = String(concepto || '');
            let previousName;
            do {
                previousName = name;
                name = name.replace(/^Abono parcial:\s*/i, '');
                name = name.replace(/^Inscripción Evento:\s*/i, '');
                name = name.replace(/^Lotería:\s*/i, '');
            } while (name !== previousName);

            if (categoria === 'Evento' || categoria === 'Lotería') {
                return name.split('(')[0].trim() || (categoria === 'Evento' ? 'Otros Eventos' : 'Otros Sorteos');
            }
            return categoria || 'Varios';
        };

        categories.forEach(cat => {
            const catTransactions = transactions.filter(t => (t.categoria || 'Varios') === cat);
            const subGroups = Array.from(new Set(catTransactions.map(t => getSubGroupName(t.concepto, t.categoria || 'Varios'))));

            doc.setFontSize(14);
            doc.setTextColor(184, 153, 76);
            doc.text(cat.toUpperCase(), 20, finalY);
            finalY += 10;

            subGroups.forEach(subG => {
                const subTransactions = catTransactions.filter(t => getSubGroupName(t.concepto, t.categoria || 'Varios') === subG);
                const subTotalCobro = subTransactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0);
                const subTotalPago = subTransactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0);
                const subPendiente = Math.max(0, subTotalCobro - subTotalPago);

                doc.setFontSize(11);
                doc.setTextColor(33, 37, 41);
                doc.text(subG, 25, finalY);

                if (subPendiente > 0) {
                    doc.setFontSize(9);
                    doc.setTextColor(255, 0, 0);
                    doc.text(`(Pendiente: ${subPendiente.toFixed(2)}€)`, 190, finalY, { align: 'right' });
                }

                const tableData = subTransactions.map(t => [
                    new Date(t.fecha).toLocaleDateString('es-ES'),
                    t.concepto,
                    t.metodo_pago || (t.tipo === 'cobro' ? '-' : '---'),
                    t.estado === 'completado' ? 'LIQUIDADO' : t.estado.toUpperCase(),
                    `${t.tipo === 'pago' ? '-' : '+'}${Number(t.monto).toFixed(2)}€`
                ]);

                autoTable(doc, {
                    startY: finalY + 2,
                    head: [['Fecha', 'Concepto', 'Método', 'Estado', 'Monto']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [26, 26, 26], textColor: [184, 153, 76], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    margin: { left: 25 },
                    columnStyles: {
                        4: { halign: 'right', fontStyle: 'bold' }
                    }
                });

                finalY = (doc as any).lastAutoTable.finalY + 10;

                if (finalY > 260) {
                    doc.addPage();
                    finalY = 20;
                }
            });

            finalY += 5;
        });

        // Totals summary
        const totalCobrado = transactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0);
        const totalPagado = transactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0);
        const totalPendiente = Math.max(0, totalCobrado - totalPagado);

        doc.setFontSize(12);
        doc.setTextColor(33, 37, 41);
        doc.text('RESUMEN GENERAL DE CUENTA', 20, finalY + 5);

        autoTable(doc, {
            startY: finalY + 10,
            body: [
                ['Total ya abonado:', `${totalPagado.toFixed(2)}€`],
                ['Saldo total pendiente:', `${totalPendiente.toFixed(2)}€`]
            ],
            theme: 'plain',
            styles: { fontSize: 10, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { halign: 'right' }
            },
            didParseCell: (data) => {
                if (data.column.index === 1) {
                    if (data.row.index === 0) data.cell.styles.textColor = [34, 197, 94]; // Green for paid
                    if (data.row.index === 1) data.cell.styles.textColor = [255, 0, 0]; // Red for debt
                }
            }
        });

        doc.save(`Extracto_Castell_${fullName.replace(/\s+/g, '_')}.pdf`);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    if (loading && !socio) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
            <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
            <p className="text-fila-dark font-bold">Cargando tu perfil de socio...</p>
        </div>
    );

    return (
        <main className="min-h-screen bg-fila-light">
            <Navbar showLogout onLogout={handleSignOut} />

            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Profile Card */}
                <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-fila-gold/10">
                    {/* Header Decor */}
                    <div className="h-32 bg-gradient-to-r from-fila-green to-fila-dark relative">
                        <div className="absolute inset-0 opacity-10 flex items-center justify-center overflow-hidden">
                            <div className="scale-150 transform -rotate-12 translate-y-10">
                                <Shield />
                            </div>
                        </div>
                    </div>

                    <div className="px-8 md:px-12 pb-12 relative">
                        {/* Avatar Overlay */}
                        <div className="absolute -top-16 left-8 md:left-12">
                            <div className="w-32 h-32 rounded-[32px] bg-white p-2 shadow-2xl">
                                <div className="w-full h-full bg-fila-light rounded-[24px] flex items-center justify-center text-fila-gold">
                                    <User size={60} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-20 mb-12">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <h1 className="text-4xl font-black text-fila-dark tracking-tighter uppercase mb-2">
                                        {socio?.nombre} <br />
                                        <span className="text-fila-gold">{socio?.primer_apellido} {socio?.segundo_apellido}</span>
                                    </h1>
                                    <div className="inline-flex items-center gap-2 bg-fila-green/10 text-fila-green px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                        <Award size={14} />
                                        <span>Socio Activo</span>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-end">
                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            className="bg-fila-gold text-white px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase shadow-lg shadow-fila-gold/20 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <ShieldCheck size={16} />
                                            Panel Admin
                                        </Link>
                                    )}
                                    <div className="bg-fila-light px-6 py-3 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Cuota</p>
                                        <p className="text-xl font-black text-fila-green leading-none whitespace-nowrap">
                                            {quota ? quota.nombre : 'Sin asignar'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Info Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 bg-fila-light/50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-fila-gold">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email Oficial</p>
                                    <p className="font-bold text-fila-dark">{socio?.email}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-fila-light/50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-fila-gold">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Teléfono</p>
                                    <p className="font-bold text-fila-dark">{socio?.telefono || 'No disponible'}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-fila-light/50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-fila-gold">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Fecha Nacimiento</p>
                                    <p className="font-bold text-fila-dark">{socio?.fecha_nacimiento || 'No disponible'}</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Next Events Panel */}
                <div className="mt-12 bg-white rounded-[40px] shadow-2xl border border-fila-gold/10 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-fila-light/30 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fila-gold flex items-center justify-center text-white">
                                <Calendar size={18} />
                            </div>
                            <h3 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Próximos Eventos</h3>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {eventos.length > 0 ? (
                            eventos.map((e) => (
                                <div key={e.id} className="p-8 hover:bg-fila-light/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black text-fila-dark uppercase tracking-tight">{e.denominacion}</h4>
                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-fila-gold" />
                                                <span>{new Date(e.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-fila-gold" />
                                                <span>{e.ubicacion || 'Por determinar'}</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${new Date(e.fecha_limite) < new Date() ? 'text-red-500' : 'text-orange-500'}`}>
                                                <Clock size={14} />
                                                <span>Límite: {new Date(e.fecha_limite).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {misInscripciones.includes(e.id) ? (
                                            <div className="flex items-center gap-2 bg-green-50 text-green-600 px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase border border-green-100">
                                                <ShieldCheck size={16} />
                                                <span>Inscrito</span>
                                            </div>
                                        ) : new Date(e.fecha_limite) < new Date() ? (
                                            <div className="flex items-center gap-2 bg-gray-100 text-gray-400 px-6 py-3 rounded-2xl text-xs font-black tracking-widest uppercase border border-gray-200 cursor-not-allowed">
                                                <Clock size={16} />
                                                <span>Plazo Cerrado</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setRegisteringEvento(e)}
                                                className="bg-fila-dark text-white px-8 py-3 rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-black transition-all shadow-lg shadow-fila-dark/20"
                                            >
                                                Apuntarse
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 font-medium italic">No hay eventos próximos programados.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Panel */}
                <div className="mt-12 bg-white rounded-[40px] shadow-2xl border border-fila-gold/10 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fila-dark flex items-center justify-center text-white">
                                <Euro size={18} />
                            </div>
                            <h3 className="text-xl font-black text-fila-dark tracking-tighter uppercase">Historial de Cobros y Pagos</h3>
                        </div>
                        <button
                            onClick={generatePDF}
                            disabled={transactions.length === 0}
                            className="flex items-center gap-2 bg-fila-gold hover:bg-fila-gold/90 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg shadow-fila-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText size={16} />
                            <span>Descargar Extracto PDF</span>
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {transactions.length > 0 ? (
                            Array.from(new Set(transactions.map(t => t.categoria || 'Varios'))).map(cat => {
                                const catTransactions = transactions.filter(t => (t.categoria || 'Varios') === cat);

                                const getSubGroupName = (concepto: string, categoria: string) => {
                                    let name = String(concepto || '');
                                    let previousName;
                                    do {
                                        previousName = name;
                                        name = name.replace(/^Abono parcial:\s*/i, '');
                                        name = name.replace(/^Inscripción Evento:\s*/i, '');
                                        name = name.replace(/^Lotería:\s*/i, '');
                                    } while (name !== previousName);

                                    if (categoria === 'Evento' || categoria === 'Lotería') {
                                        return name.split('(')[0].trim() || (categoria === 'Evento' ? 'Otros Eventos' : 'Otros Sorteos');
                                    }
                                    return null; // Don't sub-group others (Cuotas)
                                };

                                const subGroups = Array.from(new Set(catTransactions.map(t => getSubGroupName(t.concepto, t.categoria || 'Varios'))));

                                return (
                                    <div key={cat} className="animate-in fade-in duration-500">
                                        <div className="px-8 py-3 bg-fila-light/30 border-y border-gray-100/50 flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-fila-gold uppercase tracking-[0.2em]">{cat}</h4>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {subGroups.map(subG => {
                                                const subTransactions = catTransactions.filter(t => getSubGroupName(t.concepto, t.categoria || 'Varios') === subG);
                                                const subTotalCobro = subTransactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0);
                                                const subTotalPago = subTransactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0);
                                                const subPendiente = Math.max(0, subTotalCobro - subTotalPago);

                                                return (
                                                    <div key={subG || 'root'} className="bg-white">
                                                        {subG && (
                                                            <div className="px-10 py-2 flex justify-between items-center border-b border-gray-50 bg-gray-50/20">
                                                                <span className="text-[9px] font-bold text-fila-dark uppercase tracking-widest">{subG}</span>
                                                                {subPendiente > 0 && (
                                                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">
                                                                        Pendiente: {subPendiente.toFixed(2)}€
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="divide-y divide-gray-50">
                                                            {subTransactions.map((t) => (
                                                                <div key={t.id} className="p-6 hover:bg-fila-light/20 transition-all flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.tipo === 'pago' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                                            <Euro size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-fila-dark text-sm">{t.concepto}</p>
                                                                            <p className="text-[10px] text-gray-400 flex items-center gap-2">
                                                                                {new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                                                {t.tipo === 'pago' && t.metodo_pago && (
                                                                                    <>
                                                                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                                                        <span className="text-fila-gold font-black uppercase text-[8px] tracking-widest">{t.metodo_pago}</span>
                                                                                    </>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className={`font-black text-base ${t.tipo === 'pago' ? 'text-green-600' : 'text-fila-dark'}`}>
                                                                            {t.tipo === 'pago' ? '-' : '+'}{Number(t.monto).toFixed(2)}€
                                                                        </p>
                                                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${t.estado === 'completado' ? 'bg-green-50 text-green-600' :
                                                                            t.estado === 'pendiente' ? 'bg-orange-50 text-orange-600' :
                                                                                'bg-gray-50 text-gray-400'
                                                                            }`}>
                                                                            {t.estado}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 font-medium italic">No hay movimientos registrados.</p>
                            </div>
                        )}
                        {transactions.length > 0 && (
                            <div className="p-8 bg-fila-dark text-white flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-center md:text-left">
                                    <p className="text-[10px] font-black text-fila-gold uppercase tracking-[0.2em] mb-1">Resumen General</p>
                                    <h4 className="text-lg font-black tracking-tighter uppercase">Estado de cuenta del socio</h4>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">Total Pagado</p>
                                        <p className="text-xl font-black text-green-400">
                                            {transactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0).toFixed(2)}€
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">Deuda Pendiente</p>
                                        <p className="text-xl font-black text-red-400">
                                            {Math.max(0, transactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0) - transactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0)).toFixed(2)}€
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Registration Modal */}
                {registeringEvento && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-fila-gold text-white">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">Inscribirse en Acto</h2>
                                    <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em]">{registeringEvento.denominacion}</p>
                                </div>
                                <button onClick={() => setRegisteringEvento(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleRegistration} className="p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">¿Para qué grupo te apuntas?</label>
                                    <input
                                        required
                                        value={registrationForm.grupo}
                                        onChange={e => setRegistrationForm({ ...registrationForm, grupo: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        placeholder="Escuadra, familia, amigos..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número de invitados adicionales</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={registrationForm.numero_invitados}
                                        onChange={e => setRegistrationForm({ ...registrationForm, numero_invitados: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-black text-xl text-center"
                                    />
                                </div>

                                <div className="bg-fila-light/30 p-5 rounded-3xl space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase">Tú (Socio)</span>
                                        <span className="font-black text-fila-dark">{registeringEvento.precio_socio}€</span>
                                    </div>
                                    {parseInt(registrationForm.numero_invitados) > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400 font-bold uppercase">Invitados ({registrationForm.numero_invitados})</span>
                                            <span className="font-black text-fila-dark">{(parseInt(registrationForm.numero_invitados) * registeringEvento.precio_invitado).toFixed(2)}€</span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-fila-gold/20 flex justify-between">
                                        <span className="text-xs font-black text-fila-gold uppercase">Total</span>
                                        <span className="font-black text-fila-dark">
                                            {(registeringEvento.precio_socio + (parseInt(registrationForm.numero_invitados) * registeringEvento.precio_invitado)).toFixed(2)}€
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-2xl bg-fila-dark text-white font-black hover:bg-black transition-all shadow-xl shadow-fila-dark/20 flex items-center justify-center gap-2 text-sm tracking-widest uppercase"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                    CONFIRMAR REGISTRO
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

const Clock = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const MapPin = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const X = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

