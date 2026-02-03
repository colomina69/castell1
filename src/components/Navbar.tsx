'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Instagram, Facebook, LogOut } from 'lucide-react';

export const Navbar = ({ showLogout, onLogout }: { showLogout?: boolean, onLogout?: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { name: 'Inicio', href: '/' },
        { name: 'Historia', href: '/historia' },
        { name: 'Galería', href: '/galeria' },
        { name: 'Contacto', href: '/contacto' },
    ];

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-fila-gold/20 px-6 py-4 flex justify-between items-center transition-all">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 relative transition-transform group-hover:scale-110">
                        <Image
                            src="/escudo.jpg"
                            alt="Escudo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-bold tracking-tight text-fila-dark uppercase text-sm group-hover:text-fila-gold transition-colors">
                        {showLogout ? 'ÁREA PERSONAL' : 'Moros del Castell'}
                    </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    {!showLogout && navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-fila-dark hover:text-fila-green transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                    {showLogout ? (
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-full transition-all"
                        >
                            <LogOut size={18} />
                            <span>Cerrar Sesión</span>
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-fila-gold/10 text-fila-gold px-4 py-2 rounded-full text-xs font-bold hover:bg-fila-gold hover:text-white transition-all ml-4"
                        >
                            ÁREA PRIVADA
                        </Link>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden text-fila-green p-2 hover:bg-fila-green/10 rounded-full transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 z-40 bg-fila-dark/95 backdrop-blur-xl transition-all duration-500 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <div className="flex flex-col h-full pt-32 pb-12 px-12">
                    <div className="space-y-8">
                        {(!showLogout ? navLinks : [{ name: 'Inicio', href: '/' }]).map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="block text-4xl font-black text-white hover:text-fila-gold transition-colors tracking-tighter uppercase"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className="mt-auto space-y-12">
                        {showLogout ? (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    if (onLogout) onLogout();
                                }}
                                className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-red-600/20"
                            >
                                <LogOut size={24} />
                                <span>CERRAR SESIÓN</span>
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center bg-fila-gold text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-fila-gold/20"
                            >
                                ÁREA PRIVADA
                            </Link>
                        )}

                        <div className="flex justify-center gap-8 text-white/50">
                            <Facebook className="hover:text-white transition-colors" size={32} />
                            <Instagram className="hover:text-white transition-colors" size={32} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
