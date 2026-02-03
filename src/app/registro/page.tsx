'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield } from '@/components/Shield';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegistroPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showErrorCard, setShowErrorCard] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (showErrorCard) {
            const timer = setTimeout(() => {
                setShowErrorCard(false);
                router.push('/');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showErrorCard, router]);

    const handleRegistro = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowErrorCard(false);

        try {
            // 1. Validar si el email está en la tabla de socios
            const { data: socio, error: socioError } = await supabase
                .from('socios')
                .select('*')
                .eq('email', email.trim().toLowerCase())
                .single();

            if (socioError || !socio) {
                setShowErrorCard(true);
                setLoading(false);
                return;
            }

            // 2. Intentar el registro en Supabase Auth
            const { data, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: `${socio.nombre} ${socio.primer_apellido}`,
                    }
                }
            });

            if (authError) throw authError;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen bg-fila-light flex items-center justify-center p-6 text-left">
                <div className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-fila-green/10 text-fila-green rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-fila-dark mb-4">¡Casi listo!</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Hemos enviado un enlace de confirmación a <span className="font-bold text-fila-dark">{email}</span>.
                        Por favor, revisa tu bandeja de entrada para activar tu cuenta de socio.
                    </p>
                    <Link href="/login" className="bg-fila-dark text-white px-10 py-4 rounded-full font-bold hover:bg-black transition-all inline-block">
                        Ir al Login
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-fila-light flex items-center justify-center p-6 relative">
            {/* Notification Card */}
            {showErrorCard && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 w-full max-w-sm z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl border-2 border-red-500 p-6 flex items-start gap-4 mx-4 sm:mx-0">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-black text-fila-dark tracking-tighter uppercase mb-1">Registro no permitido</h3>
                            <p className="text-sm text-gray-500 leading-tight">Su email no figura como socio. Por favor, póngase en contacto con la Junta Directiva.</p>
                        </div>
                        <button onClick={() => setShowErrorCard(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-md w-full bg-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Shield />
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-fila-dark tracking-tighter mb-2">REGISTRO</h1>
                    <p className="text-gray-400 font-medium">Exclusivo para socios la Filà</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex gap-3 text-sm rounded-r-xl">
                        <AlertCircle className="shrink-0" size={18} />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleRegistro} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-fila-dark ml-1 uppercase tracking-widest">Email de Socio</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@ejemplo.com"
                                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-fila-dark ml-1 uppercase tracking-widest">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 focus:border-fila-gold focus:ring-4 focus:ring-fila-gold/5 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-fila-green text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-fila-green/20 hover:bg-fila-green/90 transition-all transform active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        {loading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <>
                                <span>DARSE DE ALTA</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        ¿Ya tienes cuenta? <Link href="/login" className="text-fila-gold font-bold hover:underline">Inicia sesión aquí</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
