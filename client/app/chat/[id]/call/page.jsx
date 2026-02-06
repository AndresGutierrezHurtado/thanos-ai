"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePeer } from "@/components/Peer";
import { MicIcon, MicOffIcon } from "lucide-react";
import { useParams } from "next/navigation";

export default function CallPage() {
    const params = useParams();
    const chatId = params?.id ?? null;

    // States
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    // Refs
    const audioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    // Hooks
    const { sendSpeech, speechResponseAudio, speechError } = usePeer();

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

            // Send to the server
            sendSpeech(chatId, base64Audio);
        };

        mediaRecorderRef.current = mediaRecorder;
    }, [stream, chatId, sendSpeech]);

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

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <audio ref={audioRef} />

            <button
                type="button"
                onClick={toggleRecording}
                className={`btn btn-primary p-8 rounded-full ${
                    isRecording ? "bg-info animate-pulse" : "bg-primary"
                }`}
            >
                {isRecording ? <MicOffIcon size={40} /> : <MicIcon size={40} />}
            </button>

            <p className="text-sm opacity-70">
                {isRecording ? "Grabando... Click para enviar" : "Click para hablar"}
            </p>
        </div>
    );
}
