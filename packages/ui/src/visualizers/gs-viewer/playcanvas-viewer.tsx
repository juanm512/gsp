"use client";

import * as React from "react";
import { Application, Entity } from "@playcanvas/react";
import { Camera, GSplat, Script } from "@playcanvas/react/components";
// @ts-ignore - PlayCanvas script without type declarations
import { CameraControls } from "playcanvas/scripts/esm/camera-controls.mjs";
import { useSplat } from "@playcanvas/react/hooks";

interface PlayCanvasViewerProps {
    url: string;
    onLoad?: () => void;
}

function SplatEntity({ blobUrl, onLoad }: { blobUrl: string; onLoad?: () => void }) {
    const { asset } = useSplat(blobUrl);

    React.useEffect(() => {
        if (asset) {
            onLoad?.();
        }
    }, [asset, onLoad]);

    if (!asset) return null;

    return (
        <Entity position={[0, -0.7, 0]} rotation={[0, 0, 180]}>
            <GSplat asset={asset} />
        </Entity>
    );
}

export function PlayCanvasViewer({ url, onLoad }: PlayCanvasViewerProps) {
    const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let active = true;
        let objectUrl: string | null = null;

        const fetchAndCreateBlob = async () => {
            try {
                // Fetch the file
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

                const blob = await response.blob();

                // Detect format from original URL (before query params)
                const urlPath = url.split('?')[0] ?? url;
                let extension = '.splat';
                if (urlPath.endsWith('.ply')) extension = '.ply';
                else if (urlPath.endsWith('.sog')) extension = '.sog';

                // Create blob URL with filename hint
                // Note: Blob URLs don't inherently carry filename, but we can try
                // using URL.createObjectURL and hope PlayCanvas reads content-type
                objectUrl = URL.createObjectURL(blob);

                // Append fake extension to help format detection
                // This is a workaround - ideally PlayCanvas would accept format option
                const finalUrl = objectUrl + '#model' + extension;

                if (active) {
                    setBlobUrl(finalUrl);
                }
            } catch (err: any) {
                console.error("PlayCanvas fetch error:", err);
                if (active) setError(err.message);
            }
        };

        fetchAndCreateBlob();

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-red-400">
                Error: {error}
            </div>
        );
    }

    if (!blobUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
                Downloading model...
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <Application
                graphicsDeviceOptions={{ antialias: false }}
                className="w-full h-full"
            >
                <Entity name="Camera" position={[0, 1, 5]}>
                    <Camera clearColor="#101010" />
                    <Script script={CameraControls} />
                </Entity>
                <SplatEntity blobUrl={blobUrl} onLoad={onLoad} />
            </Application>
        </div>
    );
}

