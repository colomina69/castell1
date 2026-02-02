'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Calendar, ChevronRight } from 'lucide-react';

interface TimelineItem {
    year: string;
    title: string;
    description: string;
    imageUrl: string;
}

export const Timeline = ({ items }: { items: TimelineItem[] }) => {
    return (
        <div className="relative py-12 px-4 max-w-4xl mx-auto">
            {/* Vertical Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-fila-gold/20 hidden md:block" />

            <div className="space-y-24">
                {items.map((item, index) => (
                    <motion.div
                        key={item.year + index}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className={`relative flex flex-col items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                            } gap-8 md:gap-16`}
                    >
                        {/* Timeline Dot */}
                        <div className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 bg-fila-gold rounded-full border-4 border-white shadow-lg hidden md:flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>

                        {/* Image Card */}
                        <div className="w-full md:w-1/2">
                            <div className="premium-card rounded-3xl overflow-hidden aspect-[4/3] relative shadow-2xl border-4 border-white">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute top-4 left-4 bg-fila-green text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                                    {item.year}
                                </div>
                            </div>
                        </div>

                        {/* Content Card */}
                        <div className={`w-full md:w-1/2 text-center ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                            <div className="inline-flex items-center gap-2 text-fila-gold font-bold text-xl mb-4">
                                <Calendar size={20} />
                                <span>Año {item.year}</span>
                            </div>
                            <h3 className="text-3xl font-extrabold text-fila-dark mb-4 tracking-tight uppercase">{item.title}</h3>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {item.description}
                            </p>
                            <div className={`mt-6 flex ${index % 2 === 0 ? 'justify-center md:justify-start' : 'justify-center md:justify-end'}`}>
                                <button className="flex items-center gap-2 text-fila-green font-bold hover:gap-4 transition-all">
                                    Saber más <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
