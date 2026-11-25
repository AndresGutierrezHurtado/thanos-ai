import { FileTextIcon, FolderIcon } from "lucide-react";
import { splitMentions } from "@/lib/mentions";

/** Texto de un mensaje con sus menciones (@) como etiquetas. */
export default function MentionText({ text, onOpenDocument }) {
    return splitMentions(text).map((part, index) => {
        if (part.type === "text") return <span key={index}>{part.text}</span>;

        const Icon = part.kind === "folder" ? FolderIcon : FileTextIcon;
        const clickable = part.kind === "doc" && onOpenDocument;
        return (
            <span
                key={index}
                title={part.label}
                onClick={clickable ? () => onOpenDocument(part.id, part.label) : undefined}
                className={`inline-flex items-center gap-1 align-middle max-w-full rounded-md bg-base-content/15 px-1.5 py-0.5 text-sm font-medium ${clickable ? "cursor-pointer hover:underline" : ""}`}
            >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{part.label}</span>
            </span>
        );
    });
}
