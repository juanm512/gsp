"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../select";
import { Card } from "../../card";
import { Loader2 } from "lucide-react";
import { SparkViewer } from "./spark-viewer";
import { PlayCanvasViewer } from "./playcanvas-viewer";
import { cn } from "../../index";

export type GSEngine = "spark" | "playcanvas";

interface GSViewerProps {
    url: string;
    className?: string;
    initialEngine?: GSEngine;
}

export function GSViewer({ url, className, initialEngine = "spark" }: GSViewerProps) {
    const [engine, setEngine] = React.useState<GSEngine>(initialEngine);
    const [loading, setLoading] = React.useState(true);
    const [progress, setProgress] = React.useState(0);

    // Reset loading when url or engine changes
    React.useEffect(() => {
        setLoading(true);
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(p => (p < 90 ? p + (90 - p) * 0.1 : p));
        }, 200);
        return () => clearInterval(interval);
    }, [url, engine]);

    const handleLoad = () => {
        setProgress(100);
        setTimeout(() => setLoading(false), 500);
    };

    return (
        <div className={cn("relative w-full h-full bg-slate-950 flex flex-col", className)}>
            <div className="absolute top-4 left-4 z-10 w-48">
                <Select value={engine} onValueChange={(v) => setEngine(v as GSEngine)}>
                    <SelectTrigger className="bg-slate-900/80 backdrop-blur border-slate-700 text-white">
                        <SelectValue placeholder="Select Engine" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="spark">SparkJS (Beta)</SelectItem>
                        <SelectItem value="playcanvas">PlayCanvas</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-500">
                    <Card className="bg-slate-900 border-slate-700 p-6 flex flex-col items-center gap-4 min-w-[200px] shadow-2xl">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-white text-sm font-medium">Cargando Modelo 3D...</span>
                            <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex-1 w-full relative">
                {engine === "spark" && (
                    <Canvas
                        camera={{ position: [0, 2, 5], fov: 60 }}
                        className="w-full h-full"
                        gl={{ antialias: false, alpha: false }}
                    >
                        <color attach="background" args={["#101010"]} />
                        <OrbitControls makeDefault />
                        <React.Suspense fallback={null}>
                            <SparkViewer url={url} onLoad={handleLoad} />
                        </React.Suspense>
                    </Canvas>
                )}
                {engine === "playcanvas" && (
                    <PlayCanvasViewer url={url} onLoad={handleLoad} />
                )}
            </div>
        </div>
    );
}

