import { getToken } from "@/lib/authStorage";

/**
 * Realiza una petición con streaming SSE.
 * Incluye Authorization Bearer si hay token.
 */
export async function streamRequest(method, endpoint, body, { onChunk, onFinal }) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
    const payload = { ...body, stream: true };
    const headers = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
    };
    const token = typeof getToken === "function" ? getToken() : null;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method,
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(response.statusText || "Error en la petición");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
                const json = JSON.parse(line.slice(6));
                if (json.text !== undefined && onChunk) {
                    onChunk(json.text);
                }
                if (json.success === true && json.data !== undefined && onFinal) {
                    onFinal(json.data);
                }
            } catch (_) {
                // ignorar líneas no JSON
            }
        }
    }

    if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith("data: ")) {
            try {
                const json = JSON.parse(line.slice(6));
                if (json.success === true && json.data !== undefined && onFinal) {
                    onFinal(json.data);
                }
            } catch (_) {}
        }
    }
}
