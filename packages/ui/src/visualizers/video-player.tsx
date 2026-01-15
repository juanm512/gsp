"use client";

import * as React from "react";
import { AlertCircle, FileVideo, Play, Loader2 } from "lucide-react";
import { cn } from "../index";

interface VideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    src: string;
    poster?: string;
    className?: string;
}

export function VideoPlayer({ src, poster, className, ...props }: VideoPlayerProps) {
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    return (
        <div className={cn("relative w-full aspect-video bg-black rounded-lg overflow-hidden group", className)}>
            {!error && (
                <video
                    ref={videoRef}
                    src={src}
                    poster={poster}
                    controls
                    className="w-full h-full object-contain"
                    onLoadedData={() => setLoading(false)}
                    onError={(e) => {
                        setLoading(false);
                        const target = e.target as HTMLVideoElement;
                        setError(target.error?.message || "Error cargando el video");
                    }}
                    {...props}
                />
            )}

            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
                    <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
                    <p className="text-sm font-medium text-white mb-1">No se pudo reproducir el video</p>
                    <p className="text-xs">{error}</p>
                </div>
            )}
        </div>
    );
}
