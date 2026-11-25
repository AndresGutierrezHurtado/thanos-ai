// Menciones con "@" en el texto del mensaje: "@[Título](doc:ID)" o "@[Carpeta](folder:ID)".
// Mismo formato que lee el servidor (server/src/application/services/mentions.ts).
const MENTION = /@\[([^\]\n]{1,200})\]\((doc|folder):([\w-]{1,300})\)/g;

/** Texto partido en trozos de texto plano y menciones, en orden. */
export function splitMentions(text) {
    const parts = [];
    let last = 0;
    for (const match of text.matchAll(MENTION)) {
        if (match.index > last) parts.push({ type: "text", text: text.slice(last, match.index) });
        parts.push({ type: "mention", label: match[1], kind: match[2], id: match[3] });
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
    return parts;
}

export function toMention(kind, id, label) {
    // "]" y saltos de línea romperían la marca
    const safe = label.replace(/[\]\n]/g, " ").slice(0, 200);
    return `@[${safe}](${kind}:${id})`;
}

/** Lo que el usuario escribe tras "@" justo antes del cursor, o null si no está mencionando. */
export function mentionQueryAt(text, cursor) {
    const match = text.slice(0, cursor).match(/(?:^|\s)@([^\s@[\]()]{0,50})$/);
    return match ? { query: match[1], start: cursor - match[1].length - 1 } : null;
}

/**
 * Texto del input partido en texto plano y menciones elegidas. En el input una mención se ve
 * como "@Título"; `mentions` ({ kind, id, label }) dice cuáles de esos textos son menciones.
 */
export function splitDisplayMentions(text, mentions) {
    if (mentions.length === 0) return [{ type: "text", text }];

    // Etiquetas largas primero: "@Plan" no debe tapar "@Plan de calidad"
    const byLabel = new Map(mentions.map((m) => [`@${m.label}`, m]));
    const labels = [...byLabel.keys()].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(labels.map(escapeRegExp).join("|"), "g");

    const parts = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
        if (match.index > last) parts.push({ type: "text", text: text.slice(last, match.index) });
        parts.push({ type: "mention", text: match[0], mention: byLabel.get(match[0]) });
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
    return parts;
}

/** El texto a enviar: cada "@Título" elegido pasa a su marca "@[Título](doc:ID)". */
export function encodeMentions(text, mentions) {
    return splitDisplayMentions(text, mentions)
        .map((part) =>
            part.type === "mention" ? toMention(part.mention.kind, part.mention.id, part.mention.label) : part.text,
        )
        .join("");
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
