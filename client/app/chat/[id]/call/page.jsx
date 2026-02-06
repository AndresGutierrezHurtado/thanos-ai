"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePeer } from "@/components/Peer";
import { MicIcon, MicOffIcon, ArrowLeftIcon, XIcon, PhoneMissedIcon, PhoneCallIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function CallPage() {
    const params = useParams();
    const router = useRouter();
    const chatId = params?.id ?? null;

    // States
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [callTime, setCallTime] = useState(0);

    // Refs
    const audioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    // Hooks
    const { sendSpeech, speechResponseAudio, speechError } = usePeer();

    // Effects
    useEffect(() => {
        const interval = setInterval(() => {
            setCallTime(callTime + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [callTime]);

    // Get access to the microphone
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 16000,
                    },
                });
                if (!cancelled) {
                    streamRef.current = mediaStream;
                    setStream(mediaStream);
                } else {
                    mediaStream.getTracks().forEach((track) => track.stop());
                }
            } catch (err) {
                if (!cancelled) setError(err);
            }
        })();

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    // Configure MediaRecorder when we have the stream
    useEffect(() => {
        if (!stream) return;

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm",
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            audioChunksRef.current = [];

            // Convert to base64
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    "",
                ),
            );

            setIsLoading(true);
            sendSpeech(chatId, base64Audio);
        };

        mediaRecorderRef.current = mediaRecorder;
    }, [stream, chatId, sendSpeech]);

    // Clear loading when response or error arrives
    useEffect(() => {
        if (speechResponseAudio !== null || speechError) setIsLoading(false);
    }, [speechResponseAudio, speechError]);

    // Play the audio response
    useEffect(() => {
        if (speechResponseAudio && audioRef.current) {
            // Convert base64 to Blob
            const binaryString = atob(speechResponseAudio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);

            audioRef.current.src = url;
            audioRef.current.play().catch((err) => console.error("Error playing audio:", err));
        }
    }, [speechResponseAudio]);

    const toggleRecording = () => {
        if (!mediaRecorderRef.current) return;

        if (isRecording) {
            // Stop recording
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            // Start recording
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
        }
    };

    if (error || speechError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-error">Error: {error?.message || speechError}</div>
            </div>
        );
    }

    if (!stream) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>Cargando micrófono...</div>
            </div>
        );
    }

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-20">
            <audio ref={audioRef} />
            <div className="flex flex-col items-center justify-center gap-2">
                <span className="badge badge-primary badge-lg badge-soft flex items-center gap-2">
                    <PhoneCallIcon size={16} />
                    <p className="text-base font-medium scale-y-105">En llamada {formatTime(callTime)}</p>
                </span>
                <h2 className="text-2xl font-semibold scale-y-105 tracking-tight opacity-90">Thanos AI</h2>
            </div>
            <div className="avatar outline-2 outline-offset-40 outline-dashed outline-primary/40 rounded-full">
                <div className="ring-primary ring-offset-base-100 w-60 rounded-full outline-2 outline-offset-20 outline-dashed outline-primary/60">
                    <img src="/assistant.png" alt="Assistant image" className="w-full h-full object-cover" />
                </div>
            </div>
            <div className="flex items-center justify-center gap-8">
                <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`btn btn-primary p-0 w-12 h-12 rounded-lg tooltip tooltip-bottom ${
                        isRecording ? "bg-info animate-pulse" : "bg-primary"
                    } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                    data-tip={isRecording ? "Detener grabación" : "Grabar voz"}
                >
                    {isRecording ? <MicOffIcon size={25} /> : <MicIcon size={25} />}
                </button>
                <button
                    type="button"
                    onClick={() => router.push(`/chat/${chatId}`)}
                    className="btn btn-error bg-error/20 text-error w-12 h-12 rounded-lg p-0 tooltip tooltip-bottom"
                    data-tip="Cancelar llamada"
                >
                    {/* hang off icon */}
                    <PhoneMissedIcon size={25} />
                </button>
            </div>
        </div>
    );
}
