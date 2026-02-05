"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const PeerContext = createContext(null);

export function usePeer() {
    const ctx = useContext(PeerContext);
    if (!ctx) throw new Error("usePeer must be used inside PeerProvider");
    return ctx;
}

export function PeerProvider({ children }) {
    const [remoteStream, setRemoteStream] = useState(null);

    const peer = useMemo(() => {
        if (typeof window === "undefined") return null;
        return new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
    }, []);

    const sendStream = (stream) => {
        if (!stream) return;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    };

    useEffect(() => {
        const onTrack = (event) => {
            const stream = event.streams?.[0];
            if (stream) setRemoteStream(stream);
        };
        peer.addEventListener("track", onTrack);
        return () => peer.removeEventListener("track", onTrack);
    }, [peer]);

    const value = useMemo(() => ({ peer, sendStream, remoteStream }), [peer, remoteStream]);

    return <PeerContext.Provider value={value}>{children}</PeerContext.Provider>;
}
