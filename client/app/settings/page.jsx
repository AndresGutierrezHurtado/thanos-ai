"use client";

import { useCallback, useState } from "react";
import { FileTextIcon, UserIcon } from "lucide-react";
import ProfileSettings from "@/components/organisms/ProfileSettings";
import DocumentSources from "@/components/organisms/DocumentSources";
import DocumentList from "@/components/organisms/DocumentList";

const TABS = [
    { id: "profile", label: "Perfil", icon: UserIcon },
    { id: "documents", label: "Documentos", icon: FileTextIcon },
];

export default function SettingsPage() {
    const [tab, setTab] = useState("profile");
    const [documentsVersion, setDocumentsVersion] = useState(0);
    const refreshDocuments = useCallback(() => setDocumentsVersion((v) => v + 1), []);

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto p-5 space-y-6">
                <header className="space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
                    <p className="opacity-70">
                        Ajusta tu perfil y la personalidad del asistente, y gestiona los documentos que consulta.
                    </p>
                </header>

                <div role="tablist" className="tabs tabs-border">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            className={`tab gap-2 ${tab === id ? "tab-active" : ""}`}
                            onClick={() => setTab(id)}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>

                {tab === "profile" && <ProfileSettings />}

                {tab === "documents" && (
                    <div className="space-y-6">
                        <DocumentSources reloadKey={documentsVersion} onDocumentsChanged={refreshDocuments} />
                        <DocumentList reloadKey={documentsVersion} onDocumentsChanged={refreshDocuments} />
                    </div>
                )}
            </div>
        </div>
    );
}
