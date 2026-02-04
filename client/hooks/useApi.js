import { useState, useEffect } from "react";
import { toast } from "react-toastify";

async function fetchApi(method, endpoint, body) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
    const options = {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        method,
        credentials: "include",
        body: JSON.stringify(body),
    };

    if (body instanceof FormData) {
        delete options.headers["Content-Type"];
        options.body = body;
    }

    if (method === "GET" || !body) {
        delete options.body;
    }

    const response = await fetch(url, options);
    const data = await response.json();
    return data;
}

export async function useApi(method, endpoint, body, notify = false) {
    const data = await fetchApi(method, endpoint, body);

    if (notify && data.success) {
        toast.success(data.message);
    } else if (notify && !data.success) {
        toast.error(data.message);
    }

    return data;
}

export async function useApiStream(method, endpoint, body) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;

    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(response.statusText || "Error en la petición");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        text += chunk;
    }

    return text;
}


export function useGetData(endpoint) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trigger, setTrigger] = useState(0);

    const location = useLocation();

    useEffect(() => {
        const fetchData = async () => {
            const response = await useApi("GET", endpoint);

            if (response) setLoading(false);
            if (!response.success) return;

            setData(response.data);
        };

        fetchData();
    }, [trigger, endpoint, location.pathname]);

    const reload = (hard = false) => {
        if (hard) setLoading(true);
        setTrigger((prev) => prev + 1);
    };

    return { data, loading, trigger, reload };
}
