'use client';

import { Shield } from '@/components/Shield';
import { Mail, Phone, MapPin, Instagram, Facebook, Send, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function ContactoPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitted(true);
        }, 1500);
    };

    return (
        <main className="min-h-screen bg-fila-light">
            {/* Navigation Header */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-fila-gold/20 px-6 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 text-fila-green font-bold">
                    <ArrowLeft size={20} />
                    <span>Volver al inicio</span>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 relative">
                        <Image
                            src="/escudo.jpg"
                            alt="Escudo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-bold text-fila-dark text-sm hidden sm:inline uppercase">Contacto</span>
                </div>
            </nav>

            <section className="pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">

                    {/* Left Column: Info & Map */}
                    <div className="space-y-12">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-fila-gold/10 text-fila-gold px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
                                <Mail size={14} />
                                <span>Hablemos</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-fila-dark tracking-tighter mb-6">
                                CONTÁCTANOS <br />
                                <span className="gradient-gold">O VEN A VERNOS</span>
                            </h1>
                            <p className="text-gray-600 text-lg leading-relaxed max-w-md">
                                ¿Tienes dudas sobre cómo unirte? ¿Quieres compartir material histórico? Estamos a tu disposición.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-fila-green group-hover:bg-fila-green group-hover:text-white transition-all transform group-hover:scale-110">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ubicación</p>
                                    <p className="font-bold text-fila-dark">Carrer Major, 15, 03827 Benilloba, Alacant</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-fila-gold group-hover:bg-fila-gold group-hover:text-white transition-all transform group-hover:scale-110">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Teléfono</p>
                                    <p className="font-bold text-fila-dark">+34 965 123 456</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-fila-green group-hover:bg-fila-green group-hover:text-white transition-all transform group-hover:scale-110">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</p>
                                    <p className="font-bold text-fila-dark">hola@morosdelcastell.com</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-video relative">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3121.574697926132!2d-0.39343362402280845!3d38.70014077176709!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd6189918c50e267%3A0x1d41334808796472!2sCarrer%20Major%2C%2015%2C%2003827%20Benilloba%2C%20Alacant!5e0!3m2!1ses!2ses!4v1717005080000!5m2!1ses!2ses"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-fila-gold/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Shield />
                        </div>

                        {submitted ? (
                            <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-fila-green/10 text-fila-green rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Send size={40} />
                                </div>
                                <h2 className="text-3xl font-bold text-fila-dark mb-4">¡Mensaje Enviado!</h2>
                                <p className="text-gray-500 mb-10">Gracias por contactar con la Filà Moros del Castell. Te responderemos lo antes posible.</p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="text-fila-gold font-bold hover:underline"
                                >
                                    Enviar otro mensaje
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-fila-dark ml-1">Nombre Completo</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Tu nombre"
                                        className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all placeholder:text-gray-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-fila-dark ml-1">Correo Electrónico</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="email@ejemplo.com"
                                        className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all placeholder:text-gray-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-fila-dark ml-1">Asunto</label>
                                    <select className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all">
                                        <option>Información General</option>
                                        <option>Unirse a la Filà</option>
                                        <option>Archivo Histórico</option>
                                        <option>Otros</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-fila-dark ml-1">Mensaje</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="¿En qué podemos ayudarte?"
                                        className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all placeholder:text-gray-300 resize-none"
                                    ></textarea>
                                </div>

                                <button
                                    disabled={isSubmitting}
                                    className="w-full bg-fila-dark text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-fila-dark/20 hover:bg-black transition-all transform active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span>ENVIAR MENSAJE</span>
                                            <Send size={20} />
                                        </>
                                    )}
                                </button>

                                <div className="pt-8 border-t border-gray-100 flex justify-between items-center">
                                    <p className="text-xs text-gray-400 font-medium">Síguenos en redes:</p>
                                    <div className="flex gap-4">
                                        <a href="#" className="w-10 h-10 rounded-full bg-fila-light flex items-center justify-center text-fila-dark hover:bg-fila-gold hover:text-white transition-all">
                                            <Facebook size={20} />
                                        </a>
                                        <a href="#" className="w-10 h-10 rounded-full bg-fila-light flex items-center justify-center text-fila-dark hover:bg-fila-gold hover:text-white transition-all">
                                            <Instagram size={20} />
                                        </a>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                </div>
            </section>

            {/* Footer Decoration */}
            <footer className="py-12 bg-white border-t border-fila-gold/10 text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <p className="text-gray-400 text-sm">© 2026 Filà Moros del Castell de Benilloba. Tots els drets reservats.</p>
                </div>
            </footer>
        </main>
    );
}
