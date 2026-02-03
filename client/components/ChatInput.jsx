"use client";

export default function ChatInput({
    value,
    onChange,
    onSubmit,
    disabled = false,
    file = null,
    onChangeFile,
}) {
    return (
        <form
            onSubmit={onSubmit}
            encType="multipart/form-data"
            className="mt-6 rounded-full bg-base-100 border border-base-300 p-2 flex items-center gap-3 shadow-sm"
        >
            <label className="btn btn-ghost btn-sm px-4 rounded-full">
                Adjuntar
                <input
                    name="mediaContent"
                    type="file"
                    className="hidden"
                    onChange={onChangeFile}
                    disabled={disabled}
                />
            </label>

            <div className="flex-1">
                <input
                    name="content"
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={value}
                    onChange={onChange}
                    className="input input-ghost w-full text-base focus:outline-none"
                    disabled={disabled}
                />
                {file && (
                    <p className="mt-1 text-xs opacity-70 truncate">{file.name}</p>
                )}
            </div>

            <button
                type="submit"
                className="btn btn-primary px-8 rounded-full"
                disabled={disabled}
            >
                {disabled ? "Enviando..." : "Enviar"}
            </button>
        </form>
    );
}
