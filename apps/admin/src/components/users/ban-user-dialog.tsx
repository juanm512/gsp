"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@acme/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@acme/ui/dialog";

interface BanUserDialogProps {
    user: {
        id: string;
        name: string;
        banned: boolean | null;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
}

export function BanUserDialog({
    user,
    open,
    onOpenChange,
    onConfirm,
}: BanUserDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const isBanned = !!user.banned;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating ban status:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                        <TriangleAlert className="h-6 w-6 text-red-500" />
                    </div>
                    <DialogTitle className="text-center text-white">
                        {isBanned ? "¿Habilitar usuario?" : "¿Deshabilitar usuario?"}
                    </DialogTitle>
                    <DialogDescription className="text-center text-slate-400">
                        {isBanned
                            ? `¿Estás seguro de que quieres habilitar el acceso a ${user.name}?`
                            : `¿Estás seguro de que quieres deshabilitar a ${user.name}? El usuario perderá acceso inmediato al sistema.`}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="sm:justify-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant={isBanned ? "default" : "destructive"}
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={isBanned ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            isBanned ? "Habilitar Acceso" : "Deshabilitar Usuario"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
