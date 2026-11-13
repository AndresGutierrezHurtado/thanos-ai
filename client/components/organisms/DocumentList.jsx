"use client";

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SearchIcon, TrashIcon } from "lucide-react";
import Button from "../atoms/Button.jsx";
import { useApi } from "@/hooks/useApi";
import { SOURCE_LABELS, downloadDocument } from "@/lib/documents";

const SEARCH_DEBOUNCE_MS = 300;

/** Indexed documents, paginated. Uploaded ones can be deleted (Drive ones are deleted in Drive). */
export default function DocumentList({ reloadKey, onDocumentsChanged }) {
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [source, setSource] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [searchInput]);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (source) params.set("source", source);
        if (search) params.set("search", search);

        const response = await useApi("GET", `/documents?${params}`);
        if (response?.success) setData(response.data);
        setSelected(new Set());
        setLoading(false);
    }, [page, source, search]);

    useEffect(() => {
        load();
    }, [load, reloadKey]);

    const items = data?.items ?? [];
    const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
    // Deleting the last documents of the last page leaves it empty: step back
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const deletable = items.filter((item) => item.source === "local");
    const allSelected = deletable.length > 0 && deletable.every((item) => selected.has(item.driveId));

    const toggle = (driveId) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(driveId)) next.delete(driveId);
            else next.add(driveId);
            return next;
        });
    };

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(deletable.map((item) => item.driveId)));
    };

    const handleDelete = async (driveIds) => {
        const result = await Swal.fire({
            title: `¿Eliminar ${driveIds.length} documento(s)?`,
            text: "Se borrarán del servidor y del índice del asistente. Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            background: "var(--color-base-100)",
            color: "var(--color-base-content)",
            confirmButtonColor: "var(--color-primary)",
            cancelButtonColor: "var(--color-secondary)",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });
        if (!result.isConfirmed) return;

        const response = await useApi("DELETE", "/documents", { driveIds }, true);
        if (response?.data?.rejected?.length) {
            toast.warn(`${response.data.rejected.length} documento(s) no se pudieron eliminar`);
        }
        onDocumentsChanged();
    };

    const handleDownload = async (item) => {
        try {
            await downloadDocument(item.driveId, item.title);
        } catch (error) {
            toast.error(error.message || "No se pudo descargar el documento");
        }
    };

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <label className="input input-sm flex-1 min-w-48">
                    <SearchIcon size={15} className="opacity-60" />
                    <input
                        type="search"
                        placeholder="Buscar por nombre o ruta"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </label>
                <select
                    className="select select-sm w-48"
                    value={source}
                    onChange={(e) => {
                        setSource(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Todas las fuentes</option>
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                {selected.size > 0 && (
                    <Button
                        type="button"
                        className="btn-sm text-red-500 bg-red-500/10"
                        onClick={() => handleDelete([...selected])}
                        leftIcon={<TrashIcon size={15} />}
                    >
                        Eliminar seleccionados ({selected.size})
                    </Button>
                )}
            </div>

            <div className="overflow-x-auto border border-neutral-content/10 rounded-lg">
                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th className="w-8">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-xs"
                                    aria-label="Seleccionar archivos subidos de esta página"
                                    checked={allSelected}
                                    disabled={deletable.length === 0}
                                    onChange={toggleAll}
                                />
                            </th>
                            <th>Documento</th>
                            <th>Fuente</th>
                            <th>Procesado</th>
                            <th className="w-20"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && items.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center opacity-70 py-6">
                                    No hay documentos{search || source ? " con esos filtros" : ""}.
                                </td>
                            </tr>
                        )}
                        {items.map((item) => (
                            <tr key={item.driveId}>
                                <td>
                                    {item.source === "local" && (
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs"
                                            aria-label={`Seleccionar ${item.title}`}
                                            checked={selected.has(item.driveId)}
                                            onChange={() => toggle(item.driveId)}
                                        />
                                    )}
                                </td>
                                <td className="max-w-md">
                                    <p className="font-medium truncate" title={item.title}>
                                        {item.title}
                                    </p>
                                    {item.path && item.path !== item.title && (
                                        <p className="text-xs opacity-60 truncate" title={item.path}>
                                            {item.path}
                                        </p>
                                    )}
                                </td>
                                <td className="whitespace-nowrap">{SOURCE_LABELS[item.source] ?? item.source}</td>
                                <td className="whitespace-nowrap text-xs">
                                    {new Date(item.processedAt).toLocaleString("es-CO")}
                                </td>
                                <td>
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            type="button"
                                            className="btn-ghost w-8 h-8 p-0"
                                            tooltipPlacement="left"
                                            tooltip="Descargar"
                                            onClick={() => handleDownload(item)}
                                            leftIcon={<DownloadIcon size={15} />}
                                        />
                                        {item.source === "local" && (
                                            <Button
                                                type="button"
                                                className="btn-ghost w-8 h-8 p-0 text-red-500"
                                                tooltipPlacement="left"
                                                tooltip="Eliminar"
                                                onClick={() => handleDelete([item.driveId])}
                                                leftIcon={<TrashIcon size={15} />}
                                            />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between text-sm">
                <p className="opacity-70">
                    {data ? `${data.total.toLocaleString("es-CO")} documento(s)` : "Cargando…"}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        className="btn-sm btn-ghost"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => p - 1)}
                        aria-label="Página anterior"
                        leftIcon={<ChevronLeftIcon size={15} />}
                    />
                    <span>
                        Página {page} de {totalPages}
                    </span>
                    <Button
                        type="button"
                        className="btn-sm btn-ghost"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="Página siguiente"
                        leftIcon={<ChevronRightIcon size={15} />}
                    />
                </div>
            </div>
        </section>
    );
}
