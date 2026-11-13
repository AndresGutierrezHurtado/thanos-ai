"use client";

import React, { useState, useEffect } from "react";
import { User, Sparkles, SaveIcon } from "lucide-react";
import InputField from "../molecules/InputField.jsx";
import TextareaField from "../molecules/TextareaField.jsx";
import Button from "../atoms/Button.jsx";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi.js";

export default function ProfileSettings() {
    const { user, setAuth } = useAuth();
    const [userName, setUserName] = useState("");
    const [systemPrompt, setSystemPrompt] = useState("");
    const [saving, setSaving] = useState(false);

    // Initialize values when user is loaded
    useEffect(() => {
        if (user) {
            setUserName(user.name || "");
            setSystemPrompt(user.systemPrompt || "");
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setSaving(true);
        try {
            const response = await useApi("PUT", "/auth/me", { name: userName, systemPrompt }, true);
            if (response.success && response.data?.user) {
                setAuth(null, response.data.user);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 max-w-3xl">
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
                rows={8}
                maxLength={2500}
                className="mb-5"
            />

            <div className="flex items-center justify-end">
                <Button
                    type="submit"
                    className="btn-primary"
                    loading={saving}
                    disabled={saving}
                    leftIcon={<SaveIcon size={18} />}
                >
                    Guardar cambios
                </Button>
            </div>
        </form>
    );
}
