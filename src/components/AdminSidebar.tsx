'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    X,
    Users,
    Euro,
    Ticket,
    Calendar,
    ArrowLeft,
    LogOut,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

interface AdminSidebarProps {
    isMenuOpen: boolean;
    setIsMenuOpen: (open: boolean) => void;
}

export function AdminSidebar({ isMenuOpen, setIsMenuOpen }: AdminSidebarProps) {
    const [adminData, setAdminData] = useState<{ nombre: string; apellidos: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const fetchAdminInfo = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: socio } = await supabase
                    .from('socios')
                    .select('nombre, primer_apellido, segundo_apellido')
                    .eq('email', user.email)
                    .single();

                if (socio) {
                    setAdminData({
                        nombre: socio.nombre,
                        apellidos: `${socio.primer_apellido} ${socio.segundo_apellido || ''}`.trim()
                    });
                }
            }
            setLoading(false);
        };

        fetchAdminInfo();
    }, []);

    const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
        const isActive = pathname === href;
        return (
            <Link
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-fila-gold text-white shadow-lg shadow-fila-gold/20' : 'text-gray-500 hover:bg-fila-light hover:text-fila-dark'}`}
            >
                <Icon size={20} />
                <span>{label}</span>
            </Link>
        );
    };

    const getInitials = () => {
        if (!adminData) return "A";
        return `${adminData.nombre[0]}${adminData.apellidos[0]}`.toUpperCase();
    };

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-fila-dark/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Side Menu */}
            <aside className={`
                fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 z-[70] flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6 flex flex-col h-full min-h-screen">
                    <div className="flex items-center justify-between mb-10 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 relative rounded-xl overflow-hidden shadow-lg shadow-black/5 ring-1 ring-gray-100">
                                <Image
                                    src="/escudo.jpg"
                                    alt="Escudo"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-fila-gold uppercase tracking-[0.2em]">Panel Admin</p>
                                <h2 className="text-xl font-black text-fila-dark leading-none tracking-tighter">CASTELL</h2>
                            </div>
                        </div>
                        <button onClick={() => setIsMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="space-y-1.5 mb-8">
                        <NavItem href="/admin" icon={Users} label="Gestión Socios" />
                        <NavItem href="/admin/cobros" icon={Euro} label="Gestión Cobros" />
                        <NavItem href="/admin/cuotas" icon={Euro} label="Configurar Cuotas" />
                        <NavItem href="/admin/eventos" icon={Calendar} label="Gestión Eventos" />
                        <NavItem href="/admin/loteria" icon={Ticket} label="Gestión Lotería" />
                        <NavItem href="/admin/banco" icon={Euro} label="Punteo Bancario" />
                    </nav>

                    {/* User Profile Section - Now integrated below the menu */}
                    <div className="pt-8 border-t border-gray-100">
                        <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-3xl border border-gray-100/50 hover:bg-gray-50 transition-all cursor-default group mb-4">
                            <div className="w-11 h-11 rounded-2xl bg-fila-dark flex items-center justify-center text-fila-gold font-black text-sm shrink-0 shadow-lg shadow-fila-dark/10 group-hover:scale-105 transition-transform">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : getInitials()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-fila-dark truncate uppercase tracking-tight">
                                    {loading ? 'Cargando...' : adminData ? adminData.nombre : 'Admin'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Conectado</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions integrated right here */}
                        <div className="space-y-1">
                            <Link
                                href="/perfil"
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-400 hover:bg-fila-light/50 hover:text-fila-dark transition-all"
                            >
                                <ArrowLeft size={20} />
                                <span>Volver al Perfil</span>
                            </Link>
                            <button
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    router.push('/');
                                }}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-300 hover:bg-red-50 hover:text-red-500 transition-all w-full text-left"
                            >
                                <LogOut size={20} />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
