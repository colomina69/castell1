'use client';

import { Gallery } from '@/components/Gallery';
import { Shield } from '@/components/Shield';
import { ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function GaleriaPage() {
    return (
        <main className="min-h-screen bg-fila-light">
            {/* Navigation Header */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-fila-gold/20 px-6 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 text-fila-green font-bold">
                    <ArrowLeft size={20} />
                    <span>Volver al inicio</span>
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-sm font-medium hover:text-fila-green transition-colors hidden md:block">Inicio</Link>
                    <Link href="/historia" className="text-sm font-medium hover:text-fila-green transition-colors hidden md:block">Historia</Link>
                    <Link href="/contacto" className="text-sm font-medium hover:text-fila-green transition-colors">Contacto</Link>
                    <div className="flex items-center gap-2 border-l border-fila-gold/20 pl-6">
                        <div className="w-8 h-8 relative">
                            <Image
                                src="/escudo.jpg"
                                alt="Escudo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="font-bold text-fila-dark text-sm hidden sm:inline uppercase">Galeria</span>
                    </div>
                </div>
            </nav>

            {/* Hero Header */}
            <section className="pt-32 pb-12 bg-white border-b border-fila-gold/10">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="mb-4 opacity-50 transform scale-50">
                        <Shield />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-fila-dark mb-4">
                        ÁLBUM <br />
                        <span className="gradient-gold">HISTÓRICO</span>
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                        Explora las carpetas por años para descubrir los momentos, desfiles y protagonistas de nuestra historia.
                    </p>
                </div>
            </section>

            {/* Gallery View */}
            <section className="min-h-[600px] bg-white/50 pb-24">
                <div className="max-w-7xl mx-auto pt-12">
                    <div className="flex justify-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-fila-gold/10 text-fila-gold px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase">
                            <Camera size={16} />
                            <span>Selecciona un año</span>
                        </div>
                    </div>
                    <Gallery />
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-20 bg-fila-dark text-white text-center px-6">
                <h2 className="text-3xl font-bold mb-8">¿Tienes fotos antiguas de la Filà?</h2>
                <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                    Ayúdanos a ampliar nuestro archivo digital. Si tienes imágenes históricas, contacta con nosotros para incluirlas en la galería.
                </p>
                <Link href="/#contacto" className="bg-fila-gold text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-fila-gold/20 hover:bg-fila-gold/90 transition-all inline-block transform hover:scale-105">
                    Contactar ahora
                </Link>
            </section>
        </main>
    );
}
