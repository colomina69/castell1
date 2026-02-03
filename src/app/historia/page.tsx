'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Timeline } from '@/components/Timeline';
import { Shield } from '@/components/Shield';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';

interface TimelineItem {
    year: string;
    title: string;
    description: string;
    imageUrl: string;
}

export default function HistoriaPage() {
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimelineData = async () => {
            try {
                // Años clave para la historia
                const milestones = [
                    { year: '1947', title: 'Fundación de la Filà', description: 'Nace la Filà Moros del Castell en Benilloba, marcando el inicio de una tradición legendaria.' },
                    { year: '1948', title: 'Bendición de la Bandera', description: 'Un acto solemne que consolidó la identidad y el compromiso de los festeros con su pueblo.' },
                    { year: '1950', title: 'Años de Consolidación', description: 'La Filà crece en número y presencia, convirtiéndose en un referente de las fiestas locales.' },
                    { year: '1980', title: 'Crecimiento y Germanor', description: 'Nuevas generaciones se unen, manteniendo vivos los valores de amistad y respeto por la tradición.' },
                    { year: '2020', title: 'La Filà en la Actualidad', description: 'A pesar de los retos del siglo XXI, el espíritu del Castell brilla con más fuerza que nunca.' },
                ];

                const timelineWithImages: TimelineItem[] = [];

                for (const m of milestones) {
                    // Intentamos buscar una imagen en la carpeta del año correspondiente
                    const { data: files } = await supabase.storage
                        .from('fila')
                        .list(m.year, { limit: 1 });

                    let imageUrl = '';
                    if (files && files.length > 0) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('fila')
                            .getPublicUrl(`${m.year}/${files[0].name}`);
                        imageUrl = publicUrl;
                    } else {
                        // Imagen por defecto si no hay en el año específico
                        imageUrl = '/escudo.jpg';
                    }

                    timelineWithImages.push({
                        ...m,
                        imageUrl
                    });
                }

                setItems(timelineWithImages);
            } catch (err) {
                console.error('Error fetching timeline data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTimelineData();
    }, []);

    return (
        <main className="min-h-screen bg-fila-light">
            <Navbar />

            {/* Hero Header */}
            <section className="pt-32 pb-16 bg-white border-b border-fila-gold/10">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="mb-6 opacity-50 transform scale-75">
                        <Shield />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-fila-dark mb-6">
                        CRONOLOGÍA <br />
                        <span className="gradient-gold">DE NUESTRA FILÀ</span>
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                        Un recorrido visual por los momentos más significativos que han forjado nuestra identidad desde sus inicios en 1947.
                    </p>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="py-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <Loader2 size={48} className="text-fila-gold animate-spin mb-4" />
                        <p className="text-fila-dark font-bold text-xl">Recuperando memorias...</p>
                    </div>
                ) : (
                    <Timeline items={items} />
                )}
            </section>

            {/* Footer CTA */}
            <section className="py-20 bg-fila-dark text-white text-center px-6">
                <h2 className="text-3xl font-bold mb-8">¿Quieres formar parte de nuestra historia?</h2>
                <Link href="/#contacto" className="bg-fila-gold text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-fila-gold/20 hover:bg-fila-gold/90 transition-all inline-block transform hover:scale-105">
                    Escríbenos ahora
                </Link>
            </section>
        </main>
    );
}
