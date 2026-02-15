"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { toast } from "react-toastify";

export default function LoginPage() {
    const router = useRouter();
    const { setAuth, isAuthenticated } = useAuth();
    const [tab, setTab] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) router.replace("/");
    }, [isAuthenticated, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            toast.error("Email y contraseña son obligatorios");
            return;
        }
        setLoading(true);
        try {
            const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
            const response = await useApi("POST", endpoint, { email: email.trim(), password }, false);
            if (!response?.success || !response?.data?.token) {
                toast.error(response?.message || "Error al iniciar sesión");
                return;
            }
            const { user, token } = response.data;
            setAuth(token, user);
            toast.success(tab === "login" ? "Sesión iniciada" : "Cuenta creada");
            router.replace("/");
        } catch (err) {
            console.error(err);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-100">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-100 px-4">
            <div className="w-full max-w-md space-y-6">
                <Link href="/" className="inline-block">
                    <p className="text-3xl font-extrabold">
                        THANOS <span className="text-primary italic">AI</span>
                    </p>
                    <p className="text-sm opacity-70">Gestor de documentos</p>
                </Link>
                <div className="rounded-xl bg-base-200 border border-base-300 p-6 shadow-lg">
                    <div className="tabs tabs-boxed mb-4">
                        <button
                            type="button"
                            className={`tab flex-1 ${tab === "login" ? "tab-active" : ""}`}
                            onClick={() => setTab("login")}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            type="button"
                            className={`tab flex-1 ${tab === "register" ? "tab-active" : ""}`}
                            onClick={() => setTab("register")}
                        >
                            Registrarse
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">
                                <span className="label-text">Email</span>
                            </label>
                            <input
                                type="email"
                                className="input input-bordered w-full"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">
                                <span className="label-text">Contraseña</span>
                            </label>
                            <input
                                type="password"
                                className="input input-bordered w-full"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={tab === "login" ? "current-password" : "new-password"}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? "Espera…" : tab === "login" ? "Entrar" : "Crear cuenta"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
