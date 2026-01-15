"use client";

import * as React from "react";
import { useThree, useFrame } from "@react-three/fiber";
// @ts-ignore - Types might not be perfect yet
import { SplatLoader, SplatMesh, SparkRenderer } from "@sparkjsdev/spark";

import * as THREE from "three";

interface SparkViewerProps {
    url: string;
    onLoad?: () => void;
}

export function SparkViewer({ url, onLoad }: SparkViewerProps) {
    const { gl, scene, camera } = useThree();
    const rendererRef = React.useRef<any>(null);
    const meshRef = React.useRef<any>(null);
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
        let active = true;

        const init = async () => {
            try {
                // Initialize SparkRenderer
                // @ts-ignore - API signature variation
                const renderer = new SparkRenderer({ renderer: gl });
                rendererRef.current = renderer;

                const loader = new SplatLoader();
                const splats = await loader.loadAsync(url);

                const mesh = new SplatMesh({ packedSplats: splats });

                // Fix orientation (Common issue with GS exports needing flip)
                mesh.rotation.x = Math.PI; // Flip around X often fixes upside down "floor on ceiling"

                if (active) {
                    // Start scale at 0 for effect
                    mesh.scale.set(0, 0, 0);
                    scene.add(mesh);
                    meshRef.current = mesh;
                    onLoad?.();
                }
            } catch (err) {
                console.error("Error loading SparkJS:", err);
            }
        };

        init();

        return () => {
            active = false;
            if (rendererRef.current) {
                rendererRef.current.dispose?.();
            }
            if (meshRef.current) {
                scene.remove(meshRef.current);
                meshRef.current.dispose?.();
            }
        };
    }, [url, gl, scene, onLoad]);

    useFrame((state, delta) => {
        if (rendererRef.current) {
            rendererRef.current.update?.({ scene });
        }

        // Simple entrance effect: Scale up from 0 to 1
        if (meshRef.current) {
            const targetScale = 1;
            if (meshRef.current.scale.x < targetScale) {
                // Smooth damp or lerp
                const speed = 2.0;
                const newScale = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * speed);
                meshRef.current.scale.setScalar(newScale);
                // Stop updating once close enough to save perf
                if (Math.abs(targetScale - newScale) < 0.001) meshRef.current.scale.setScalar(targetScale);
            }
        }
    });

    return null;
}
