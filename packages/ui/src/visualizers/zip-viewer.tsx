"use client";

import * as React from "react";
import { unzip, HTTPRangeReader } from "unzipit";
import { Loader2, AlertCircle, ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../index";
import { Dialog, DialogContent } from "../dialog";
import { Button } from "../button";

interface ZipViewerProps {
    url: string;
    filename?: string;
    className?: string;
}

interface ZipImage {
    name: string;
    url: string;
}

export function ZipViewer({ url, filename, className }: ZipViewerProps) {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [images, setImages] = React.useState<ZipImage[]>([]);
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

    React.useEffect(() => {
        let active = true;
        const loadZip = async () => {
            try {
                setLoading(true);
                setError(null);

                let entries;
                try {
                    // Try efficient range reading first (requires proper CORS for HEAD requests)
                    const reader = new HTTPRangeReader(url);
                    const result = await unzip(reader);
                    entries = result.entries;
                } catch (rangeError) {
                    console.warn("Range reader failed (likely CORS on HEAD), falling back to full download:", rangeError);
                    // Fallback to simple full download
                    const result = await unzip(url);
                    entries = result.entries;
                }

                const imageEntries = Object.entries(entries).filter(([name]) => {
                    const lower = name.toLowerCase();
                    return !lower.startsWith("__macosx") &&
                        (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp"));
                });

                // Sort by name nicely (natural sort)
                imageEntries.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }));

                if (!active) return;

                // Load first 20 thumbnails immediately for preview
                // We don't want to load ALL if there are thousands
                const previewLimit = 50;
                const loadedImages: ZipImage[] = [];

                for (const [name, entry] of imageEntries.slice(0, previewLimit)) {
                    const blob = await entry.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    loadedImages.push({ name, url: imageUrl });
                }

                setImages(loadedImages);
                if (imageEntries.length === 0) {
                    setError("No se encontraron imágenes válidas en el ZIP");
                }
            } catch (err: any) {
                console.error("Error reading ZIP:", err);
                setError(err.message || "Error leyendo el archivo ZIP");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadZip();

        return () => {
            active = false;
            // Cleanup object URLs
            images.forEach(img => URL.revokeObjectURL(img.url));
        };
    }, [url]);

    const handleNext = () => {
        if (selectedIndex === null) return;
        setSelectedIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
    };

    const handlePrev = () => {
        if (selectedIndex === null) return;
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
    };

    return (
        <div className={cn("flex flex-col h-full bg-slate-950 rounded-lg overflow-hidden", className)}>
            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>Leyendo contenido del ZIP...</p>
                </div>
            )}

            {error && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                    <p className="text-white font-medium mb-1">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.map((img, idx) => (
                            <button
                                key={img.name}
                                onClick={() => setSelectedIndex(idx)}
                                className="group relative aspect-square bg-slate-900 rounded-md overflow-hidden border border-slate-800 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <img
                                    src={img.url}
                                    alt={img.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 truncate text-[10px] text-white/80 text-center">
                                    {img.name.split('/').pop()}
                                </div>
                            </button>
                        ))}
                    </div>
                    {images.length === 50 && (
                        <p className="text-center text-xs text-slate-500 mt-4">
                            Mostrando primeras 50 imágenes. Descargar para ver todo.
                        </p>
                    )}
                </div>
            )}

            {/* Lightbox Dialog */}
            <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
                <DialogContent className="max-w-7xl w-full h-[90vh] bg-black/95 border-slate-800 p-0 flex flex-col">
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <div className="bg-black/50 px-3 py-1 rounded text-white text-sm">
                            {selectedIndex !== null ? `${selectedIndex + 1} / ${images.length}` : ''}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={() => setSelectedIndex(null)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {selectedIndex !== null && images[selectedIndex] && (
                            <img
                                src={images[selectedIndex]!.url}
                                alt={images[selectedIndex]!.name}
                                className="max-w-full max-h-full object-contain"
                            />
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full"
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Minimal scroll area if not available in imports, or can rely on standard div
