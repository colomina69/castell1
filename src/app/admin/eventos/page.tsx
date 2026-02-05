'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, Edit2, Trash2, Loader2, ArrowLeft, X, Save, Eye, MoreVertical, LayoutDashboard, Ticket, Euro, Calendar, Search, Users, LogOut, MapPin, Music, Flag, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Evento {
    id: string;
    denominacion: string;
    fecha: string;
    descripcion: string | null;
    musicos: number;
    ubicacion: string | null;
    desfile: boolean;
    itinerario_desfile: string | null;
    precio_socio: number;
    precio_invitado: number;
    fecha_limite: string;
}

interface Inscripcion {
    id: string;
    evento_id: string;
    socio_id: string;
    grupo: string | null;
    numero_invitados: number;
    socios: {
        nombre: string;
        primer_apellido: string;
    };
}

export default function AdminEventos() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
    const [viewingInscripciones, setViewingInscripciones] = useState<Evento | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const router = useRouter();
    const pathname = usePathname();

    const [form, setForm] = useState({
        denominacion: '',
        fecha: '',
        descripcion: '',
        musicos: '0',
        ubicacion: '',
        desfile: false,
        itinerario_desfile: '',
        precio_socio: '0',
        precio_invitado: '0',
        fecha_limite: ''
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
            fetchEventos();
        };

        checkAdmin();
    }, [router]);

    const fetchEventos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .order('fecha', { ascending: true });

        if (data) setEventos(data);
        setLoading(false);
    };

    const fetchInscripciones = async (eventoId: string) => {
        const { data, error } = await supabase
            .from('inscripciones_eventos')
            .select(`
                *,
                socios (
                    nombre,
                    primer_apellido
                )
            `)
            .eq('evento_id', eventoId);

        if (data) setInscripciones(data as any);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = {
            denominacion: form.denominacion,
            fecha: form.fecha,
            descripcion: form.descripcion || null,
            musicos: parseInt(form.musicos) || 0,
            ubicacion: form.ubicacion || null,
            desfile: form.desfile,
            itinerario_desfile: form.desfile ? form.itinerario_desfile : null,
            precio_socio: parseFloat(form.precio_socio) || 0,
            precio_invitado: parseFloat(form.precio_invitado) || 0,
            fecha_limite: form.fecha_limite || form.fecha
        };

        let result;
        if (editingEvento) {
            result = await supabase.from('eventos').update(data).eq('id', editingEvento.id);
        } else {
            result = await supabase.from('eventos').insert([data]);
        }

        if (!result.error) {
            setIsModalOpen(false);
            setEditingEvento(null);
            setForm({
                denominacion: '',
                fecha: '',
                descripcion: '',
                musicos: '0',
                ubicacion: '',
                desfile: false,
                itinerario_desfile: '',
                precio_socio: '0',
                precio_invitado: '0',
                fecha_limite: ''
            });
            fetchEventos();
        } else {
            alert('Error: ' + result.error.message);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este evento?')) return;

        const { error } = await supabase.from('eventos').delete().eq('id', id);
        if (!error) {
            setEventos(eventos.filter(e => e.id !== id));
        }
    };

    const openEdit = (evento: Evento) => {
        setEditingEvento(evento);
        setForm({
            denominacion: evento.denominacion,
            fecha: new Date(evento.fecha).toISOString().slice(0, 16),
            descripcion: evento.descripcion || '',
            musicos: evento.musicos.toString(),
            ubicacion: evento.ubicacion || '',
            desfile: evento.desfile,
            itinerario_desfile: evento.itinerario_desfile || '',
            precio_socio: evento.precio_socio.toString(),
            precio_invitado: evento.precio_invitado.toString(),
            fecha_limite: evento.fecha_limite ? new Date(evento.fecha_limite).toISOString().slice(0, 16) : ''
        });
        setIsModalOpen(true);
    };

    const openInscripciones = (evento: Evento) => {
        setViewingInscripciones(evento);
        fetchInscripciones(evento.id);
    };

    const handleExport = async (format: 'csv' | 'pdf') => {
        if (!viewingInscripciones || inscripciones.length === 0) return;
        setIsExporting(true);

        const grouped = inscripciones.reduce((acc: Record<string, Inscripcion[]>, curr) => {
            const groupName = curr.grupo || 'Sin Grupo';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(curr);
            return acc;
        }, {});

        if (format === 'csv') {
            const dataToExport = Object.values(grouped).flat().map(insc => ({
                Socio: `${insc.socios.nombre} ${insc.socios.primer_apellido}`,
                Grupo: insc.grupo || 'Sin Grupo',
                Invitados: insc.numero_invitados
            }));

            const headers = ['Socio', 'Grupo', 'Invitados'].join(',');
            const csv = [
                headers,
                ...dataToExport.map(row => [
                    `"${row.Socio}"`,
                    `"${row.Grupo}"`,
                    row.Invitados
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `inscripciones_${viewingInscripciones.denominacion.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Inscripciones: ${viewingInscripciones.denominacion}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Fecha del evento: ${new Date(viewingInscripciones.fecha).toLocaleDateString()}`, 14, 28);
            doc.text(`Total personas: ${inscripciones.reduce((acc, curr) => acc + 1 + curr.numero_invitados, 0)}`, 14, 34);

            const tableRows: any[] = [];
            Object.entries(grouped).forEach(([groupName, groupInscs]) => {
                const groupTotal = groupInscs.reduce((sum, insc) => sum + 1 + (insc.numero_invitados || 0), 0);

                // Add group header row
                tableRows.push([
                    {
                        content: `${groupName.toUpperCase()} (${groupTotal} ${groupTotal === 1 ? 'persona' : 'personas'})`,
                        colSpan: 3,
                        styles: {
                            fillColor: [248, 250, 252],
                            textColor: [180, 150, 80],
                            fontStyle: 'bold',
                            fontSize: 8,
                            halign: 'left'
                        }
                    }
                ]);
                // Add socio rows
                groupInscs.forEach(insc => {
                    tableRows.push([
                        `${insc.socios.nombre} ${insc.socios.primer_apellido}`,
                        groupName,
                        insc.numero_invitados
                    ]);
                });
            });

            autoTable(doc, {
                head: [['Socio', 'Grupo', 'Invitados']],
                body: tableRows,
                startY: 40,
                theme: 'striped',
                headStyles: { fillColor: [30, 41, 59] }, // fila-dark
                styles: { fontSize: 9 },
                didParseCell: (data) => {
                    if (data.row.raw && (data.row.raw as any)[0]?.colSpan === 3) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            doc.save(`inscripciones_${viewingInscripciones.denominacion.replace(/\s+/g, '_')}.pdf`);
        }
        setIsExporting(false);
    };

    if (!isAdmin || (loading && eventos.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-fila-light">
                <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
                <p className="text-fila-dark font-bold">Cargando Eventos...</p>
            </div>
        );
    }

    const filteredEventos = eventos.filter(e =>
        e.denominacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.descripcion && e.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.ubicacion && e.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <main className="min-h-screen bg-[#F8F9FA] flex">
            <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

            {/* Content Area */}
            <div className="flex-1">
                {/* Top Nav */}
                <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2.5 bg-fila-light text-fila-dark rounded-xl hover:bg-gray-200 transition-all">
                            <MoreVertical size={20} />
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-lg md:text-xl font-black text-fila-dark tracking-tighter uppercase leading-none">Gestión de Eventos</h1>
                            <span className="text-[9px] font-black text-fila-gold uppercase tracking-widest">{eventos.length} TOTAL</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
                        <div className="relative flex-1 max-w-[150px] md:max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-fila-gold outline-none text-xs md:text-sm transition-all"
                            />
                        </div>
                        <button
                            onClick={() => { setEditingEvento(null); setIsModalOpen(true); }}
                            className="p-2.5 md:px-5 md:py-2.5 bg-fila-green text-white rounded-xl md:rounded-2xl hover:bg-fila-green/90 transition-all shadow-xl shadow-fila-green/10 flex items-center gap-2"
                        >
                            <Plus size={18} />
                            <span className="hidden md:inline text-sm font-black uppercase tracking-tight">Nuevo</span>
                        </button>
                    </div>
                </nav>

                <div className="p-4 md:p-8">
                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredEventos.map((evento) => (
                            <div key={evento.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-fila-light p-3 rounded-2xl text-fila-gold">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(evento)} className="p-2 bg-gray-50 text-gray-400 hover:text-fila-dark rounded-xl transition-all">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(evento.id)} className="p-2 bg-red-50 text-red-300 hover:text-red-500 rounded-xl transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-fila-dark uppercase tracking-tight mb-2">{evento.denominacion}</h3>
                                <div className="space-y-2 mb-6 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-fila-gold" />
                                        <span>{new Date(evento.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-fila-gold" />
                                        <span>{evento.ubicacion || 'Sin ubicación'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-red-500 font-bold">
                                        <Calendar size={14} />
                                        <span>Límite: {new Date(evento.fecha_limite).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Music size={14} className="text-fila-gold" />
                                        <span>{evento.musicos} músicos vienen</span>
                                    </div>
                                    {evento.desfile && (
                                        <div className="flex items-center gap-2 text-fila-gold font-bold">
                                            <Flag size={14} />
                                            <span>Hay desfile</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4 pt-4 border-t border-gray-50">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Socios</p>
                                        <p className="font-black text-fila-dark">{evento.precio_socio}€</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Invitados</p>
                                        <p className="font-black text-fila-dark">{evento.precio_invitado}€</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openInscripciones(evento)}
                                    className="w-full mt-6 py-4 bg-fila-dark text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                                >
                                    <Users size={16} />
                                    Ver Inscripciones
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-fila-dark text-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none mb-1">
                                        {editingEvento ? 'Editar Evento' : 'Nuevo Evento'}
                                    </h2>
                                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">Configuración de acto de la fila</p>
                                </div>
                                <button onClick={() => { setIsModalOpen(false); setEditingEvento(null); }} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Denominación del Evento</label>
                                    <input
                                        required
                                        value={form.denominacion}
                                        onChange={e => setForm({ ...form, denominacion: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        placeholder="Nombre del evento..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha y Hora</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={form.fecha}
                                            onChange={e => setForm({ ...form, fecha: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Fecha Límite Inscripción</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={form.fecha_limite}
                                            onChange={e => setForm({ ...form, fecha_limite: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-red-100 focus:border-red-400 outline-none font-bold bg-red-50/30"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">¿Cuántos músicos vienen?</label>
                                        <input
                                            type="number"
                                            value={form.musicos}
                                            onChange={e => setForm({ ...form, musicos: e.target.value })}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                    <textarea
                                        value={form.descripcion}
                                        onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        placeholder="Descripción del evento..."
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ubicación (Donde se realiza)</label>
                                    <input
                                        value={form.ubicacion}
                                        onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                        placeholder="Masía, plaza, etc..."
                                    />
                                </div>

                                <div className="bg-fila-light/50 p-6 rounded-3xl border border-fila-gold/20 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black text-fila-dark uppercase tracking-widest">¿Hay desfile?</label>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, desfile: !form.desfile })}
                                            className={`w-14 h-8 rounded-full transition-all relative ${form.desfile ? 'bg-fila-gold' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${form.desfile ? 'left-7' : 'left-1 shadow-sm'}`} />
                                        </button>
                                    </div>
                                    {form.desfile && (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                            <label className="text-[10px] font-black text-fila-gold uppercase tracking-widest ml-1">Itinerario / Por donde se realiza</label>
                                            <input
                                                value={form.itinerario_desfile}
                                                onChange={e => setForm({ ...form, itinerario_desfile: e.target.value })}
                                                className="w-full px-5 py-3 rounded-2xl border border-fila-gold/20 focus:border-fila-gold outline-none font-bold bg-white"
                                                placeholder="Calle mayor, bajada de la fuente..."
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio Socio</label>
                                        <div className="relative">
                                            <Euro size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={form.precio_socio}
                                                onChange={e => setForm({ ...form, precio_socio: e.target.value })}
                                                className="w-full pl-12 pr-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio Invitado</label>
                                        <div className="relative">
                                            <Euro size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={form.precio_invitado}
                                                onChange={e => setForm({ ...form, precio_invitado: e.target.value })}
                                                className="w-full pl-12 pr-5 py-3 rounded-2xl border border-gray-200 focus:border-fila-gold outline-none font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsModalOpen(false); setEditingEvento(null); }}
                                        className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] px-4 py-4 rounded-2xl bg-fila-gold text-white font-black hover:bg-fila-gold/90 transition-all shadow-xl shadow-fila-gold/20 flex items-center justify-center gap-2 text-sm tracking-widest uppercase"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {editingEvento ? 'GUARDAR CAMBIOS' : 'CREAR EVENTO'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View Inscripciones Modal */}
                {viewingInscripciones && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-fila-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[80vh] flex flex-col">
                            <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-fila-light text-fila-dark">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">Inscripciones</h2>
                                    <p className="text-[10px] text-fila-gold font-black uppercase tracking-[0.2em]">{viewingInscripciones.denominacion}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-fila-dark/5 px-4 py-2 rounded-xl">
                                        <Download size={16} className="text-fila-gold" />
                                        <button
                                            onClick={() => handleExport('csv')}
                                            disabled={isExporting || inscripciones.length === 0}
                                            className="text-[10px] font-black uppercase tracking-widest hover:text-fila-gold transition-colors disabled:opacity-50"
                                        >
                                            CSV
                                        </button>
                                        <div className="w-px h-3 bg-fila-dark/10 mx-1" />
                                        <button
                                            onClick={() => handleExport('pdf')}
                                            disabled={isExporting || inscripciones.length === 0}
                                            className="text-[10px] font-black uppercase tracking-widest hover:text-fila-gold transition-colors disabled:opacity-50"
                                        >
                                            PDF
                                        </button>
                                        {isExporting && <Loader2 size={12} className="animate-spin text-fila-gold ml-1" />}
                                    </div>
                                    <button onClick={() => setViewingInscripciones(null)} className="p-2 hover:bg-fila-dark/10 rounded-full transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-10 overflow-y-auto flex-1">
                                {inscripciones.length === 0 ? (
                                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold">No hay inscripciones todavía</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Socio</th>
                                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Invitados</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {(() => {
                                                const grouped = inscripciones.reduce((acc: Record<string, Inscripcion[]>, curr) => {
                                                    const groupName = curr.grupo || 'Sin Grupo';
                                                    if (!acc[groupName]) acc[groupName] = [];
                                                    acc[groupName].push(curr);
                                                    return acc;
                                                }, {});

                                                return Object.entries(grouped).map(([groupName, groupInscs]) => {
                                                    const groupTotal = groupInscs.reduce((sum, insc) => sum + 1 + (insc.numero_invitados || 0), 0);
                                                    return (
                                                        <div key={groupName} className="contents">
                                                            <tr className="bg-fila-light/30">
                                                                <td colSpan={2} className="px-4 py-2 flex justify-between items-center bg-gray-50/50 border-y border-gray-100/50">
                                                                    <span className="text-[8px] font-black text-fila-gold uppercase tracking-[0.3em]">
                                                                        {groupName}
                                                                    </span>
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                        {groupTotal} {groupTotal === 1 ? 'persona' : 'personas'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {groupInscs.map((insc) => (
                                                                <tr key={insc.id} className="group hover:bg-gray-50/50 transition-colors">
                                                                    <td className="py-4 pl-4 font-bold text-fila-dark truncate max-w-[200px]">
                                                                        {insc.socios.nombre} {insc.socios.primer_apellido}
                                                                    </td>
                                                                    <td className="py-4 text-center pr-4">
                                                                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${insc.numero_invitados > 0 ? 'bg-fila-gold/10 text-fila-gold' : 'bg-gray-100 text-gray-400'}`}>
                                                                            {insc.numero_invitados}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="p-10 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-400 uppercase tracking-widest text-[10px]">Total Personas</span>
                                <span className="text-fila-dark text-lg font-black">
                                    {inscripciones.reduce((acc, curr) => acc + 1 + curr.numero_invitados, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
