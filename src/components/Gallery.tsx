'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Folder, Image as ImageIcon, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface FilaFolder {
    name: string;
    itemCount: number;
    coverUrl: string;
}

interface FilaImage {
    name: string;
    url: string;
    year: string;
}

export const Gallery = () => {
    const [folders, setFolders] = useState<FilaFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [folderImages, setFolderImages] = useState<FilaImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingImages, setLoadingImages] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    // Fetch folders and covers
    useEffect(() => {
        const fetchFolders = async () => {
            setLoading(true);
            try {
                const { data: rootItems, error: rootError } = await supabase.storage.from('fila').list('');

                if (rootError) throw rootError;

                const potentialFolders = rootItems
                    ?.filter(item => !item.name.includes('.'))
                    .map(item => item.name) || [];

                const foldersWithDetails: FilaFolder[] = [];

                for (const folder of potentialFolders) {
                    const { data: files, error: folderError } = await supabase.storage
                        .from('fila')
                        .list(folder, { limit: 100 });

                    if (folderError) continue;

                    const validImages = files?.filter(f =>
                        ['jpg', 'jpeg', 'png'].some(ext => f.name.toLowerCase().endsWith(ext))
                    ) || [];

                    if (validImages.length > 0) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('fila')
                            .getPublicUrl(`${folder}/${validImages[0].name}`);

                        foldersWithDetails.push({
                            name: folder,
                            itemCount: validImages.length,
                            coverUrl: publicUrl
                        });
                    }
                }

                setFolders(foldersWithDetails.sort((a, b) => b.name.localeCompare(a.name)));
            } catch (err) {
                console.error('Error fetching folders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFolders();
    }, []);

    // Fetch images when a folder is selected
    useEffect(() => {
        if (!selectedFolder) {
            setFolderImages([]);
            return;
        }

        const fetchFolderImages = async () => {
            setLoadingImages(true);
            try {
                const { data: files, error } = await supabase.storage
                    .from('fila')
                    .list(selectedFolder, { limit: 100 });

                if (error) throw error;

                const images = files
                    ?.filter(f => ['jpg', 'jpeg', 'png'].some(ext => f.name.toLowerCase().endsWith(ext)))
                    .map(f => {
                        const { data: { publicUrl } } = supabase.storage
                            .from('fila')
                            .getPublicUrl(`${selectedFolder}/${f.name}`);
                        return {
                            name: f.name,
                            url: publicUrl,
                            year: selectedFolder
                        };
                    }) || [];

                setFolderImages(images);
            } catch (err) {
                console.error('Error fetching folder images:', err);
            } finally {
                setLoadingImages(false);
            }
        };

        fetchFolderImages();
    }, [selectedFolder]);

    const navigateImage = (direction: number) => {
        if (selectedImageIndex === null) return;
        const newIndex = (selectedImageIndex + direction + folderImages.length) % folderImages.length;
        setSelectedImageIndex(newIndex);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-12 h-12 text-fila-gold animate-spin mb-4" />
            <p className="text-fila-dark font-medium">Cargando el archivo histórico...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <AnimatePresence mode="wait">
                {!selectedFolder ? (
                    // Folders Grid
                    <motion.div
                        key="folders"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                    >
                        {folders.map((f) => (
                            <motion.div
                                key={f.name}
                                whileHover={{ y: -10 }}
                                onClick={() => setSelectedFolder(f.name)}
                                className="group cursor-pointer premium-card bg-white rounded-3xl overflow-hidden border border-fila-gold/10 hover:border-fila-gold/30 transition-all shadow-xl"
                            >
                                <div className="aspect-[4/3] relative overflow-hidden">
                                    <Image
                                        src={f.coverUrl}
                                        alt={f.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-fila-dark shadow-sm flex items-center gap-1.5">
                                        <ImageIcon size={12} />
                                        {f.itemCount} fotos
                                    </div>
                                </div>
                                <div className="p-6 flex justify-between items-center bg-gradient-to-br from-white to-fila-light">
                                    <div>
                                        <h3 className="text-2xl font-black text-fila-dark tracking-tighter">AÑO {f.name}</h3>
                                        <p className="text-gray-500 text-sm">Benilloba, Historia Viva</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-fila-green/5 text-fila-green flex items-center justify-center group-hover:bg-fila-green group-hover:text-white transition-colors">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    // Images Grid
                    <motion.div
                        key="images"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-4 mb-12">
                            <button
                                onClick={() => setSelectedFolder(null)}
                                className="w-12 h-12 rounded-full bg-white border border-fila-gold/20 flex items-center justify-center text-fila-dark hover:bg-fila-gold hover:text-white transition-all shadow-md group"
                            >
                                <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <div>
                                <h2 className="text-4xl font-black text-fila-dark tracking-tighter">AÑO {selectedFolder}</h2>
                                <p className="text-gray-500">{folderImages.length} imágenes encontradas</p>
                            </div>
                        </div>

                        {loadingImages ? (
                            <div className="flex flex-col items-center justify-center py-40">
                                <Loader2 className="w-10 h-10 text-fila-gold animate-spin mb-4" />
                                <p className="text-fila-dark font-medium">Abriendo álbum...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {folderImages.map((img, index) => (
                                    <motion.div
                                        key={img.url}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className="aspect-square relative rounded-2xl overflow-hidden cursor-zoom-in group premium-card border border-white"
                                    >
                                        <Image
                                            src={img.url}
                                            alt={img.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-fila-green/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImageIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
                    >
                        <button
                            onClick={() => setSelectedImageIndex(null)}
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
                        >
                            <X size={40} />
                        </button>

                        <button
                            onClick={() => navigateImage(-1)}
                            className="absolute left-6 text-white/50 hover:text-white transition-colors p-2 hidden md:block"
                        >
                            <ChevronLeft size={60} />
                        </button>

                        <button
                            onClick={() => navigateImage(1)}
                            className="absolute right-6 text-white/50 hover:text-white transition-colors p-2 hidden md:block"
                        >
                            <ChevronRight size={60} />
                        </button>

                        <div className="relative w-full h-full max-w-6xl flex flex-col items-center justify-center gap-6">
                            <motion.div
                                key={folderImages[selectedImageIndex].url}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src={folderImages[selectedImageIndex].url}
                                    alt="Full screen view"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>
                            <div className="text-center text-white">
                                <p className="text-sm font-bold tracking-widest text-fila-gold mb-1">AÑO {folderImages[selectedImageIndex].year}</p>
                                <p className="text-white/60 text-xs">Arxiu Històric Filà Moros del Castell</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
