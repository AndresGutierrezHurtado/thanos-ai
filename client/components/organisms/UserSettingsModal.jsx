import React, { useState, useEffect } from "react";
import { User, Sparkles, SaveIcon, XIcon } from "lucide-react";
import Modal from "../atoms/Modal.jsx";
import InputField from "../molecules/InputField.jsx";
import TextareaField from "../molecules/TextareaField.jsx";
import Button from "../atoms/Button.jsx";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi.js";

export default function UserSettingsModal({ modalRef, onClose }) {
    const { user, setAuth } = useAuth();
    const [userName, setUserName] = useState("");
    const [systemPrompt, setSystemPrompt] = useState("");

    // Initialize values when user is loaded
    useEffect(() => {
        if (user) {
            setUserName(user.name || "");
            setSystemPrompt(user.systemPrompt || "");
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const response = await useApi("PUT", "/auth/me", { name: userName, systemPrompt }, true);

        if (!response.success) return;

        if (response.data?.user) {
            setAuth(null, response.data.user);
        }

        modalRef?.current?.close();

        if (onClose) {
            onClose();
        }
    };

    return (
        <Modal
            title="Configuración de Personalización"
            subtitle="Ajusta los detalles de tu perfil y la personalidad del asistente Thanos AI"
            modalRef={modalRef}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-2">
                <InputField
                    id="userName"
                    name="userName"
                    label="Nombre de Usuario"
                    value={userName}
                    onChange={(val) => setUserName(val)}
                    placeholder="Ej. Andrés Gutiérrez"
                    labelLeftIcon={User}
                    labelInfo="Tu nombre visible en la plataforma y en las conversaciones."
                    required
                />

                <TextareaField
                    id="systemPrompt"
                    name="systemPrompt"
                    label="Instrucciones del Sistema"
                    value={systemPrompt}
                    onChange={(val) => setSystemPrompt(val)}
                    placeholder="Ej. Eres Thanos AI, un asistente experto y preciso..."
                    labelIcon={Sparkles}
                    labelInfo="Modifica el comportamiento, tono y límites del asistente de inteligencia artificial."
                    rows={6}
                    maxLength={2500}
                    className="mb-5"
                />

                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        className="bg-base-content/10"
                        onClick={() => {
                            if (modalRef.current) {
                                modalRef.current.close();
                            }
                            if (onClose) {
                                onClose();
                            }
                        }}
                        leftIcon={<XIcon size={18} />}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" className="btn-primary" leftIcon={<SaveIcon size={18} />}>
                        Guardar cambios
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
