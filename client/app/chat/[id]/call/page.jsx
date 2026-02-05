"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePeer } from "@/components/Peer";
import { MicIcon, MicOffIcon } from "lucide-react";

export default function CallPage() {
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const { sendStream, remoteStream } = usePeer();
    const audioRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (!cancelled) {
                    streamRef.current = s;
                    setStream(s);
                } else {
                    s.getTracks().forEach((t) => t.stop());
                }
            } catch (e) {
                if (!cancelled) setError(e);
            }
        })();
        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (stream) sendStream(stream);
    }, [stream, sendStream]);

    useEffect(() => {
        if (audioRef.current && remoteStream) audioRef.current.srcObject = remoteStream;
    }, [remoteStream]);

    if (error) return <div>Error al obtener el micrófono: {error.message}</div>;
    if (!stream) return <div>Cargando...</div>;

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            {remoteStream && <audio ref={audioRef} autoPlay playsInline />}
            <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                    streamRef.current.getTracks().forEach((t) => (t.enabled = !t.enabled));
                    setIsMuted(!isMuted);
                }}
            >
                {isMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
            </button>
        </div>
    );
}
