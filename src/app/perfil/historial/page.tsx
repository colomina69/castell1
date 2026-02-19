'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield } from '@/components/Shield';
import { Euro, FileText, Loader2, ArrowLeft, Calendar, CheckCircle2, AlertCircle, Clock, Ticket, BadgeEuro, Star } from 'lucide-react';
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

export default function HistorialPage() {
    const [socio, setSocio] = useState<SocioData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            // Buscar los datos del socio vinculados por email
            const { data: socioData } = await supabase
                .from('socios')
                .select('id, nombre, primer_apellido, segundo_apellido, email')
                .eq('email', user.email)
                .single();

            if (socioData) {
                setSocio(socioData);

                // Fetch Transactions
                const { data: tData } = await supabase
                    .from('pagos_cobros')
                    .select('*')
                    .eq('socio_id', socioData.id)
                    .order('categoria', { ascending: true })
                    .order('fecha', { ascending: false });
                if (tData) setTransactions(tData);
            }
            setLoading(false);
        };

        fetchData();
    }, [router]);

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

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
            <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
            <p className="text-fila-dark font-bold">Cargando historial...</p>
        </div>
    );

    return (
        <main className="min-h-screen bg-hsl(38, 50%, 98%)">
            <Navbar showLogout onLogout={handleSignOut} />

            <div className="max-w-4xl mx-auto px-6 py-12">


                {/* Header Card */}
                <div className="bg-white rounded-[40px] shadow-2xl border border-fila-gold/10 overflow-hidden mb-12">
                    <div className="p-10 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-3xl bg-fila-dark flex items-center justify-center text-white shadow-xl shadow-fila-dark/20 relative overflow-hidden">
                                <Euro size={28} className="relative z-10" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-fila-gold/20 to-transparent"></div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-fila-dark tracking-tighter uppercase leading-none">Mi Extracto de Cuenta</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Consulta tus movimientos por categoría</p>
                            </div>
                        </div>
                        <button
                            onClick={generatePDF}
                            disabled={transactions.length === 0}
                            className="w-full md:w-auto flex items-center justify-center gap-3 bg-fila-gold hover:bg-fila-dark text-white px-10 py-5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-xl shadow-fila-gold/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <FileText size={18} className="group-hover:scale-110 transition-transform" />
                            <span>Descargar Extracto PDF</span>
                        </button>
                    </div>
                </div>
                <div className="flex justify-start mb-8">
                    <Link
                        href="/perfil"
                        className="inline-flex items-center gap-2 text-fila-gold hover:text-fila-dark transition-colors font-bold uppercase text-[10px] tracking-widest group bg-white px-8 py-4 rounded-2xl shadow-sm border border-gray-100"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Perfil del Socio
                    </Link>
                </div>

                {/* Categories Sections */}
                <div className="space-y-12">
                    {transactions.length > 0 ? (
                        ['Cuota', 'Lotería', 'Evento', 'Varios'].map(catType => {
                            const catTransactions = transactions.filter(t => (t.categoria || 'Varios') === catType);
                            if (catTransactions.length === 0) return null;

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
                                return null;
                            };

                            const subGroups = Array.from(new Set(catTransactions.map(t => getSubGroupName(t.concepto, t.categoria || 'Varios'))));

                            const getCategoryStyle = (type: string) => {
                                switch (type) {
                                    case 'Cuota': return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: <BadgeEuro size={20} />, label: 'Cuotas de Socio', accent: 'bg-emerald-600' };
                                    case 'Lotería': return { bg: 'bg-amber-50', text: 'text-amber-600', icon: <Ticket size={20} />, label: 'Lotería', accent: 'bg-amber-600' };
                                    case 'Evento': return { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: <Star size={20} />, label: 'Eventos y Actos', accent: 'bg-indigo-600' };
                                    default: return { bg: 'bg-gray-50', text: 'text-gray-600', icon: <Euro size={20} />, label: 'Otros Conceptos', accent: 'bg-gray-600' };
                                }
                            };

                            const style = getCategoryStyle(catType);

                            const totalCobroCat = catTransactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0);
                            const totalPagoCat = catTransactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0);
                            const catPending = Math.max(0, totalCobroCat - totalPagoCat);

                            return (
                                <section key={catType} className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                                    <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
                                        <div className={`px-10 py-8 ${style.bg} border-b border-gray-100 flex items-center justify-between relative overflow-hidden group/cat`}>
                                            <div className={`absolute top-0 left-0 w-2 h-full ${style.accent}`}></div>
                                            <div className="absolute -right-4 -top-4 opacity-5 group-hover/cat:scale-125 group-hover/cat:rotate-12 transition-all duration-700">
                                                {style.icon}
                                            </div>
                                            <div className="flex items-center gap-5 relative z-10">
                                                <div className={`w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center ${style.text} transform group-hover/cat:scale-110 transition-transform duration-500`}>
                                                    {style.icon}
                                                </div>
                                                <div>
                                                    <h4 className={`text-xl font-black uppercase tracking-tighter ${style.text}`}>{style.label}</h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Extracto Detallado</p>
                                                </div>
                                            </div>

                                            <div className="text-right relative z-10">
                                                {catPending > 0 ? (
                                                    <div className="bg-red-500 text-white px-6 py-2.5 rounded-2xl shadow-lg shadow-red-200 border border-red-400/20">
                                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-80">Pendiente Total</p>
                                                        <p className="text-xl font-black tracking-tighter">{catPending.toFixed(2)}€</p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-500/10 text-emerald-600 px-6 py-2.5 rounded-2xl border border-emerald-100">
                                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60 text-center">Estado</p>
                                                        <p className="text-sm font-black tracking-widest text-center">LIQUIDADO</p>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {subGroups.map(subG => {
                                                const subTransactions = catTransactions.filter(t => getSubGroupName(t.concepto, t.categoria || 'Varios') === subG);
                                                const subTotalCobro = subTransactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0);
                                                const subTotalPago = subTransactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0);
                                                const subPendiente = Math.max(0, subTotalCobro - subTotalPago);

                                                return (
                                                    <div key={subG || 'root'} className="bg-white">
                                                        {subG && (
                                                            <div className="px-12 py-5 flex justify-between items-center border-b border-gray-50 bg-gray-50/5">
                                                                <span className="text-sm font-black text-fila-dark uppercase tracking-widest flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${style.accent}`}></div>
                                                                    {subG}
                                                                </span>
                                                                {subPendiente > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <AlertCircle size={14} className="text-red-500" />
                                                                        <span className="text-[11px] font-black text-white bg-red-500 px-5 py-2 rounded-full shadow-lg shadow-red-100 uppercase tracking-widest">
                                                                            Pendiente: {subPendiente.toFixed(2)}€
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="divide-y divide-gray-50">
                                                            {subTransactions.map((t) => (
                                                                <div key={t.id} className="p-10 hover:bg-gray-50/50 transition-all flex items-center justify-between gap-6 group/row">
                                                                    <div className="flex items-center gap-6">
                                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover/row:shadow-md ${t.tipo === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                            <Euro size={22} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-black text-fila-dark text-xl tracking-tighter group-hover/row:text-fila-gold transition-colors">{t.concepto}</p>
                                                                            <div className="flex items-center gap-4 mt-2">
                                                                                <p className="text-xs text-gray-400 flex items-center gap-2 font-bold uppercase tracking-widest">
                                                                                    <Calendar size={14} className="text-fila-gold" />
                                                                                    {new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                                                </p>
                                                                                {t.tipo === 'pago' && t.metodo_pago && (
                                                                                    <>
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                                                                        <p className="text-fila-gold font-black uppercase text-[10px] tracking-[0.2em]">{t.metodo_pago}</p>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className={`font-black text-2xl tracking-tighter ${t.tipo === 'pago' ? 'text-emerald-600' : 'text-fila-dark'}`}>
                                                                            {t.tipo === 'pago' ? '-' : '+'}{Number(t.monto).toFixed(2)}€
                                                                        </p>
                                                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full inline-block mt-3 border shadow-sm ${t.estado === 'completado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            t.estado === 'pendiente' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                                'bg-gray-50 text-gray-400 border-gray-100'
                                                                            }`}>
                                                                            {t.estado === 'completado' ? 'LIQUIDADO' : t.estado.toUpperCase()}
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
                                </section>
                            );
                        })
                    ) : (
                        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 p-20 text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200 shadow-inner">
                                <Euro size={48} />
                            </div>
                            <h4 className="text-xl font-black text-fila-dark uppercase tracking-widest mb-2">Sin movimientos</h4>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">No hay registros en tu extracto de cuenta.</p>
                        </div>
                    )}

                    {/* Footer Summary Card */}
                    {transactions.length > 0 && (
                        <div className="bg-fila-dark rounded-[40px] shadow-2xl p-12 text-white relative overflow-hidden group/summary mb-10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-fila-gold/5 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover/summary:bg-fila-gold/10"></div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                                <div className="text-center md:text-left">
                                    <div className="inline-block px-4 py-1.5 rounded-full bg-fila-gold/20 border border-fila-gold/30 mb-4">
                                        <p className="text-[10px] font-black text-fila-gold uppercase tracking-[0.3em]">Resumen de Cuenta</p>
                                    </div>
                                    <h4 className="text-4xl font-black tracking-tighter uppercase leading-tight">Estado general<br />de tus pagos</h4>
                                </div>
                                <div className="flex gap-16">
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end mb-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Total Abonado</p>
                                        </div>
                                        <p className="text-5xl font-black text-emerald-400 tracking-tighter drop-shadow-sm">
                                            {transactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0).toFixed(2)}<span className="text-2xl ml-1 text-emerald-400/50">€</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end mb-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Saldo Pendiente</p>
                                        </div>
                                        <p className="text-5xl font-black text-red-500 tracking-tighter drop-shadow-sm">
                                            {Math.max(0, transactions.filter(t => t.tipo === 'cobro').reduce((acc, t) => acc + Number(t.monto), 0) - transactions.filter(t => t.tipo === 'pago').reduce((acc, t) => acc + Number(t.monto), 0)).toFixed(2)}<span className="text-2xl ml-1 text-red-500/50">€</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}
