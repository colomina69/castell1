'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export const Shield = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative w-48 h-56 mx-auto shield-container"
        >
            <div className="absolute inset-0 bg-fila-gold/20 blur-2xl rounded-full" />
            <div className="relative w-full h-full shield-image">
                <Image
                    src="/escudo.jpg"
                    alt="Escudo Filà Moros del Castell"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
        </motion.div>
    );
};
