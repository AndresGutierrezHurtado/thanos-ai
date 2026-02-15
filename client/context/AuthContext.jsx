"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    getToken,
    setToken as saveToken,
    removeToken,
    getStoredUser,
    setStoredUser,
    decodeJwtPayload,
} from "@/lib/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setTokenState] = useState(null);
    const [loading, setLoading] = useState(true);

    const setAuth = useCallback((newToken, newUser) => {
        if (newToken) {
            saveToken(newToken);
            setTokenState(newToken);
        }
        if (newUser) {
            setStoredUser(newUser);
            setUser(newUser);
        }
    }, []);

    const logout = useCallback(() => {
        removeToken();
        setStoredUser(null);
        setTokenState(null);
        setUser(null);
    }, []);

    useEffect(() => {
        const stored = getToken();
        if (stored) {
            setTokenState(stored);
            const storedUser = getStoredUser();
            if (storedUser?.id && storedUser?.email) {
                setUser(storedUser);
            } else {
                const payload = decodeJwtPayload(stored);
                if (payload?.userId && payload?.email) {
                    const u = { id: payload.userId, email: payload.email };
                    setStoredUser(u);
                    setUser(u);
                }
            }
        }
        setLoading(false);
    }, []);

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!token,
        setAuth,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
