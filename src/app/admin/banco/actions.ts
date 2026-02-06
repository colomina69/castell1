'use server';

import { createServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function importBankMovements(movements: { fecha: string; descripcion: string; monto: number; referencia?: string }[]) {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from('movimientos_bancarios')
        .insert(movements);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/banco');
    return data;
}

export async function getBankMovements(filters?: { estado?: string; searchTerm?: string }) {
    const supabase = createServerClient();

    let query = supabase
        .from('movimientos_bancarios')
        .select('*')
        .order('fecha', { ascending: false });

    if (filters?.estado) {
        query = query.eq('estado', filters.estado);
    }

    if (filters?.searchTerm) {
        query = query.ilike('descripcion', `%${filters.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data;
}

export async function reconcilePayment(movimientoId: string, pagoId: string, monto: number) {
    const supabase = createServerClient();

    // 1. Create the link
    const { error: linkError } = await supabase
        .from('conciliaciones_pagos')
        .insert([{
            movimiento_id: movimientoId,
            pago_id: pagoId,
            monto_conciliado: monto
        }]);

    if (linkError) throw new Error(linkError.message);

    // 2. Update movement status
    const { error: updateError } = await supabase
        .from('movimientos_bancarios')
        .update({ estado: 'conciliado' })
        .eq('id', movimientoId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath('/admin/banco');
    return { success: true };
}

export async function deleteConciliation(movimientoId: string) {
    const supabase = createServerClient();

    // The foreign key with ON DELETE CASCADE will handle the link in conciliaciones_pagos
    // if we were deleting the movement, but here we just want to break the link.

    const { error: deleteLinkError } = await supabase
        .from('conciliaciones_pagos')
        .delete()
        .eq('movimiento_id', movimientoId);

    if (deleteLinkError) throw new Error(deleteLinkError.message);

    const { error: updateError } = await supabase
        .from('movimientos_bancarios')
        .update({ estado: 'pendiente' })
        .eq('id', movimientoId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath('/admin/banco');
    return { success: true };
}
