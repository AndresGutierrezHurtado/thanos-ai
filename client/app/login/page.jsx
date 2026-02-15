"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

export default function LoginPage() {
    const router = useRouter();
    const { setAuth, isAuthenticated } = useAuth();
    const [tab, setTab] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pendingVerifyEmail, setPendingVerifyEmail] = useState(null);
    const [otpCode, setOtpCode] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState(null);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [resetNewPassword, setResetNewPassword] = useState("");
    const [resetConfirmPassword, setResetConfirmPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) router.replace("/");
    }, [isAuthenticated, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            toast.error("Email y contraseña son obligatorios");
            return;
        }
        if (tab === "register") {
            if (!name.trim()) {
                toast.error("El nombre es obligatorio");
                return;
            }
            if (password !== confirmPassword) {
                toast.error("Las contraseñas no coinciden");
                return;
            }
        }
        setLoading(true);
        setPendingVerifyEmail(null);
        try {
            const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
            const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                credentials: "include",
                body: JSON.stringify(
                    tab === "register"
                        ? { name: name.trim(), email: email.trim(), password }
                        : { email: email.trim(), password },
                ),
            });
            const token =
                res.headers
                    .get("Authorization")
                    ?.replace(/^Bearer\s+/i, "")
                    .trim() ?? null;
            const data = await res.json();

            if (res.status === 403 && data?.code === "EMAIL_NOT_VERIFIED") {
                setPendingVerifyEmail(email.trim());
                toast.info(data?.message || "Revisa tu correo e ingresa el código.");
                return;
            }

            if (!data?.success || !data?.data?.user || !token) {
                toast.error(data?.message || "Error al iniciar sesión");
                return;
            }
            setAuth(token, data.data.user);
            toast.success(tab === "login" ? "Sesión iniciada" : "Cuenta creada");
            router.replace("/");
        } catch (err) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const code = otpCode.replace(/\D/g, "").slice(0, 6);
        if (code.length !== 6) {
            toast.error("Ingresa los 6 dígitos del código");
            return;
        }
        if (!pendingVerifyEmail) return;
        setOtpLoading(true);
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: pendingVerifyEmail, code }),
            });
            const token =
                res.headers
                    .get("Authorization")
                    ?.replace(/^Bearer\s+/i, "")
                    .trim() ?? null;
            const data = await res.json();
            if (!data?.success || !data?.data?.user || !token) {
                toast.error(data?.message || "Código inválido o expirado");
                return;
            }
            setAuth(token, data.data.user);
            toast.success("Correo verificado. Bienvenido.");
            router.replace("/");
        } catch (err) {
            toast.error("Error de conexión");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleForgotPasswordRequest = async (e) => {
        e.preventDefault();
        const emailToUse = forgotPasswordStep === "email" ? forgotPasswordEmail.trim() : email.trim();
        console.log(emailToUse);
        if (!emailToUse) {
            toast.error("Ingresa tu correo");
            return;
        }
        setForgotLoading(true);
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: emailToUse }),
            });
            const data = await res.json();
            if (!data?.success) {
                toast.error(data?.message || "Error al enviar el código");
                return;
            }
            setForgotPasswordEmail(emailToUse);
            setForgotPasswordStep("reset");
            setOtpCode("");
            toast.success(data.message || "Revisa tu correo para el código.");
        } catch (err) {
            toast.error("Error de conexión");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const code = otpCode.replace(/\D/g, "").slice(0, 6);
        if (code.length !== 6) {
            toast.error("Ingresa los 6 dígitos del código");
            return;
        }
        if (resetNewPassword !== resetConfirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }
        if (resetNewPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }
        setResetLoading(true);
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: forgotPasswordEmail,
                    code,
                    newPassword: resetNewPassword,
                    confirmPassword: resetConfirmPassword,
                }),
            });
            const data = await res.json();
            if (!data?.success) {
                toast.error(data?.message || "Error al restablecer");
                return;
            }
            toast.success(data.message || "Contraseña actualizada. Inicia sesión.");
            setForgotPasswordStep(null);
            setForgotPasswordEmail("");
            setOtpCode("");
            setResetNewPassword("");
            setResetConfirmPassword("");
        } catch (err) {
            toast.error("Error de conexión");
        } finally {
            setResetLoading(false);
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
        <div className="min-h-screen flex items-center justify-center bg-base-100 relative overflow-hidden">
            {/* Background: subtle grid + gradient */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, currentColor 1px, transparent 1px),
                        linear-gradient(to bottom, currentColor 1px, transparent 1px)
                    `,
                    backgroundSize: "48px 48px",
                }}
            />
            <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="w-full max-w-[380px] px-5 relative z-10">
                <Link
                    href="/"
                    className="block text-center mb-8 group text-xl"
                    aria-label="Volver al inicio"
                >
                    <p className="text-4xl font-extrabold">
                        THANOS <span className="text-primary italic">AI</span>
                    </p>
                    <p className="text-base tracking-[0.25em] uppercase mt-2 text-base-content/80">
                        Acceso
                    </p>
                </Link>

                <div className="rounded-2xl border border-base-300/80 bg-base-200/60 backdrop-blur-sm p-8 shadow-xl shadow-black/20">
                    {forgotPasswordStep ? (
                        <>
                            <p className="text-lg scale-y-105 tracking-wide text-primary mb-1">
                                {forgotPasswordStep === "email"
                                    ? "Restablecer contraseña"
                                    : "Nueva contraseña"}
                            </p>
                            {forgotPasswordStep === "email" ? (
                                <form onSubmit={handleForgotPasswordRequest} className="space-y-6">
                                    <p className="text-sm leading-tight opacity-60 mb-3">
                                        Ingresa tu correo y te enviaremos un código.
                                    </p>
                                    <div>
                                        <label htmlFor="forgot-email" className="sr-only">
                                            Email
                                        </label>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            placeholder="correo@plataforma.com.co"
                                            value={forgotPasswordEmail}
                                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                            required
                                            className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full py-2 rounded-lg bg-primary text-primary-content font-medium tracking-wide hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-base-100 disabled:opacity-50 transition-all duration-200"
                                    >
                                        {forgotLoading ? "…" : "Enviar código"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotPasswordStep(null);
                                            setForgotPasswordEmail("");
                                        }}
                                        className="w-full py-2 text-sm text-base-content/60 hover:text-base-content transition-colors cursor-pointer"
                                    >
                                        Volver al inicio de sesión
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-6">
                                    <p className="text-sm leading-tight opacity-60 mb-3 truncate" title={forgotPasswordEmail}>
                                        {forgotPasswordEmail}
                                    </p>
                                    <div>
                                        <label htmlFor="reset-otp" className="sr-only">
                                            Código
                                        </label>
                                        <input
                                            id="reset-otp"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                            className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200 text-center text-xl tracking-[0.4em] font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="reset-new-password" className="sr-only">
                                            Nueva contraseña
                                        </label>
                                        <input
                                            id="reset-new-password"
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={resetNewPassword}
                                            onChange={(e) => setResetNewPassword(e.target.value)}
                                            minLength={6}
                                            required
                                            className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="reset-confirm-password" className="sr-only">
                                            Confirmar contraseña
                                        </label>
                                        <input
                                            id="reset-confirm-password"
                                            type="password"
                                            placeholder="Confirmar contraseña"
                                            value={resetConfirmPassword}
                                            onChange={(e) => setResetConfirmPassword(e.target.value)}
                                            minLength={6}
                                            required
                                            className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={
                                            resetLoading ||
                                            otpCode.replace(/\D/g, "").length !== 6 ||
                                            !resetNewPassword ||
                                            resetNewPassword !== resetConfirmPassword
                                        }
                                        className="w-full py-2 rounded-lg bg-primary text-primary-content font-medium tracking-wide hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-base-100 disabled:opacity-50 transition-all duration-200"
                                    >
                                        {resetLoading ? "…" : "Restablecer contraseña"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotPasswordStep("email");
                                            setOtpCode("");
                                            setResetNewPassword("");
                                            setResetConfirmPassword("");
                                        }}
                                        className="w-full py-2 text-sm text-base-content/60 hover:text-base-content transition-colors"
                                    >
                                        Usar otro correo
                                    </button>
                                </form>
                            )}
                        </>
                    ) : pendingVerifyEmail ? (
                        <>
                            <p className="text-lg scale-y-105 tracking-wide text-primary mb-1">
                                Verifica tu correo
                            </p>
                            <p className="text-sm leading-tight opacity-60 mb-3">
                                Verifica en tu inbox el código de verificación enviado a tu correo.
                                Si no lo encuentras, revisa tu spam o correo no deseado.
                            </p>
                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div>
                                    <label htmlFor="login-otp" className="sr-only">
                                        Código de verificación
                                    </label>
                                    <input
                                        id="login-otp"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) =>
                                            setOtpCode(e.target.value.replace(/\D/g, ""))
                                        }
                                        className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200 text-center text-2xl tracking-[0.5em] font-mono"
                                    />
                                    <p className="text-xs text-base-content/50 mt-2 text-center">
                                        Código de 6 dígitos enviado a tu correo
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={otpLoading || otpCode.replace(/\D/g, "").length !== 6}
                                    className="w-full py-2 mt-2 rounded-lg bg-primary text-primary-content font-medium tracking-wide hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-base-100 disabled:opacity-50 transition-all duration-200"
                                >
                                    {otpLoading ? "…" : "Verificar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPendingVerifyEmail(null);
                                        setOtpCode("");
                                    }}
                                    className="w-full py-2 text-sm text-base-content/60 hover:text-base-content transition-colors"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            {/* Tabs: minimal underline */}
                            <div className="flex border-b border-base-300/60 mb-8">
                                <button
                                    type="button"
                                    className={`flex-1 pb-3 font-medium tracking-wide transition-colors duration-200 cursor-pointer ${
                                        tab === "login"
                                            ? "text-primary border-b-2 border-primary -mb-[2px]"
                                            : "text-base-content/50 hover:text-base-content/70"
                                    }`}
                                    onClick={() => setTab("login")}
                                >
                                    Iniciar sesión
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 pb-3 font-medium tracking-wide transition-colors duration-200 cursor-pointer ${
                                        tab === "register"
                                            ? "text-primary border-b-2 border-primary -mb-[2px]"
                                            : "text-base-content/50 hover:text-base-content/70"
                                    }`}
                                    onClick={() => setTab("register")}
                                >
                                    Registrarse
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {tab === "register" && (
                                    <div>
                                        <label htmlFor="login-name" className="sr-only">
                                            Nombre
                                        </label>
                                        <input
                                            id="login-name"
                                            type="text"
                                            placeholder="Nombre"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            autoComplete="name"
                                            required={tab === "register"}
                                            className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="login-email" className="sr-only">
                                        Email
                                    </label>
                                    <input
                                        id="login-email"
                                        type="email"
                                        placeholder="correo@plataforma.com.co"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                    />
                                </div>
                                <div className="relative">
                                    <label htmlFor="login-password" className="sr-only">
                                        Contraseña
                                    </label>
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Contraseña"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete={
                                            tab === "login" ? "current-password" : "new-password"
                                        }
                                        required
                                        className="w-full bg-transparent border-0 border-b border-base-300 py-3 pr-10 pl-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-base-content/50 hover:text-base-content focus:outline-none cursor-pointer"
                                        aria-label={
                                            showPassword
                                                ? "Ocultar contraseña"
                                                : "Mostrar contraseña"
                                        }
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {tab === "register" && (
                                    <div>
                                        <label htmlFor="login-confirm-password" className="sr-only">
                                            Confirmar contraseña
                                        </label>
                                        <input
                                            id="login-confirm-password"
                                            type="password"
                                            placeholder="Confirmar contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required={tab === "register"}
                                            className="w-full bg-transparent border-0 border-b border-base-300 py-3 px-0 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-0 transition-colors duration-200"
                                        />
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 mt-2 rounded-lg bg-primary text-primary-content font-medium tracking-wide hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-base-100 disabled:opacity-50 transition-all duration-200"
                                >
                                    {loading ? "…" : tab === "login" ? "Entrar" : "Crear cuenta"}
                                </button>
                                {tab === "login" && (
                                    <button
                                        type="button"
                                        onClick={() => setForgotPasswordStep("email")}
                                        className="w-full py-2 text-sm text-base-content/50 hover:text-primary transition-colors cursor-pointer"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                )}
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-base-content/40 mt-8 tracking-wide">
                    &copy; {new Date().getFullYear()} Thanos AI.
                </p>
            </div>
        </div>
    );
}
