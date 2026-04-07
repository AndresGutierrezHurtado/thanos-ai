import React from "react";
import { XIcon } from "lucide-react";
import Button from "./Button";

export default function Modal({ title, subtitle, modalRef, onClose, variant, children }) {
    // Cierra el dialog y dispara limpieza externa si existe callback.
    const handleClose = () => {
        if (modalRef.current) {
            modalRef.current.close();
        }
        if (onClose) {
            onClose();
        }
    };

    return (
        <dialog className="modal" ref={modalRef} onClose={onClose}>
            {variant === "ghost" ? (
                <div className="modal-box w-11/12 max-w-3xl bg-transparent p-0 shadow-none">
                    <div className="flex bg-base-200 p-2 rounded-t-lg justify-between items-center">
                        <h3 className="font-bold text-lg">{title}</h3>
                        <Button
                            type="button"
                            className="w-9 h-9 p-0 rounded-lg"
                            onClick={handleClose}
                        >
                            <XIcon size={18} />
                        </Button>
                    </div>

                    <div>{children}</div>
                </div>
            ) : (
                <div className="modal-box w-11/12 max-w-3xl bg-base-200 space-y-5">
                    <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                            <h3 className="font-bold text-lg">{title}</h3>
                            {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
                        </div>
                        <Button
                            type="button"
                            className="w-9 h-9 p-0 rounded-lg"
                            onClick={handleClose}
                        >
                            <XIcon size={18} />
                        </Button>
                    </div>

                    <div>{children}</div>
                </div>
            )}

            <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={handleClose}>
                    close
                </button>
            </form>
        </dialog>
    );
}
