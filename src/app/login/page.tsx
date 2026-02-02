'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield } from '@/components/Shield';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError) throw authError;

            router.push('/perfil');
            router.refresh();
        } catch (err: any) {
            setError('Credenciales incorrectas o cuenta no confirmada.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-fila-light flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Shield />
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-fila-dark tracking-tighter mb-2">ENTRAR</h1>
                    <p className="text-gray-400 font-medium">Acceso para socios registrados</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex gap-3 text-sm rounded-r-xl">
                        <AlertCircle className="shrink-0" size={18} />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-fila-dark ml-1 uppercase tracking-widest">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="socio@email.com"
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
                        className="w-full bg-fila-dark text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-fila-dark/20 hover:bg-black transition-all transform active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        {loading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <>
                                <span>INICIAR SESIÓN</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        ¿Todavía no tienes cuenta? <Link href="/registro" className="text-fila-gold font-bold hover:underline">Registrate aquí</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
