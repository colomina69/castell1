'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                // Limpiar cualquier estado local si es necesario
                router.refresh();
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Sesión actualizada correctamente');
            }

            // Manejo específico de errores de refresh token que dispara Supabase internamente
            // Si no hay sesión pero hay un error de auth persistente en la consola,
            // podemos forzar un sign out para limpiar el storage.
        });

        // Verificación inicial silenciosa
        const checkSession = async () => {
            const { error } = await supabase.auth.getSession();
            if (error && error.message.includes('Refresh Token')) {
                console.warn('Refresh Token inválido detectado, limpiando sesión...');
                await supabase.auth.signOut();
                router.push('/login');
            }
        };

        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return <>{children}</>;
}
