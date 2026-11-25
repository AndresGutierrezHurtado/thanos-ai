/**
 * Mentions the user inserts with "@" in a message: "@[Título](doc:ID)" for a document and
 * "@[Nombre](folder:ID)" for a folder. They are stored in the message text as typed.
 */
export interface Mention {
    kind: "doc" | "folder";
    id: string;
    label: string;
}

// At most this many mentions of one message are resolved
export const MAX_MENTIONS = 5;

const MENTION = /@\[([^\]\n]{1,200})\]\((doc|folder):([\w-]{1,300})\)/g;

export function parseMentions(text: string): Mention[] {
    const mentions: Mention[] = [];
    const seen = new Set<string>();
    for (const [, label, kind, id] of text.matchAll(MENTION)) {
        const key = `${kind}:${id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mentions.push({ kind: kind as Mention["kind"], id, label });
        if (mentions.length === MAX_MENTIONS) break;
    }
    return mentions;
}

/** How the model sees a mention: its name and the id the tools take, `"Título" [doc:ID]`. */
export function renderMentions(text: string): string {
    return text.replace(MENTION, (_, label: string, kind: string, id: string) => `"${label}" [${kind}:${id}]`);
}
