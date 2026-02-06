'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                router.refresh();
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Sesión actualizada correctamente');
            }
        });

        // Verificación inicial silenciosa y manejo de errores de refresh
        const checkSession = async () => {
            try {
                const { error } = await supabase.auth.getSession();

                // Si hay un error de refresh token (Token Not Found o similar)
                if (error && (
                    error.message.includes('Refresh Token') ||
                    error.message.includes('not found') ||
                    (error as any).status === 400
                )) {
                    console.warn('Error de autenticación detectado, limpiando sesión...', error.message);

                    // Limpieza agresiva del storage local por si acaso
                    localStorage.removeItem('castell-auth-token');
                    await supabase.auth.signOut();

                    router.push('/login');
                    router.refresh();
                }
            } catch (err) {
                console.error('Error crítico comprobando sesión:', err);
            }
        };

        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return <>{children}</>;
}
