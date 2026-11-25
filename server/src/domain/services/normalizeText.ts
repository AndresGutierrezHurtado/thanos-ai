/** Lowercase, without accents and with single spaces: "Nómina  Mayo" -> "nomina mayo". */
export default function normalizeText(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
