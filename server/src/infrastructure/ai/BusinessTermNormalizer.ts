export default class BusinessTermNormalizer {
    private static glossary: Record<string, string> = {
        mice: "Reuniones, Incentivos, Conferencias y Exposiciones",
        "evento corporativo": "Evento Corporativo",
        "orden de evento de banquete": "Orden de Evento de Banquete",
        beo: "Orden de Evento de Banquete",
        beos: "Orden de Evento de Banquete",
        audiovisual: "Tecnología Audiovisual",
        "micrófono de solapa": "Micrófono Lavalier",
        "salas auxiliares": "Breakout Rooms",
        "centro de convenciones": "Centro de Convenciones",
        "no show": "No Show",
        "mejor tarifa disponible": "Mejor Tarifa Disponible",
        "talento humano": "Recursos Humanos",
        rrhh: "Recursos Humanos",
        kpi: "Indicador Clave de Desempeño",
        crm: "Gestión de Relaciones con Clientes",
    };

    static normalize(text: string): { normalizedText: string; detectedTerms: string[] } {
        let normalizedText = text.toLocaleLowerCase().trim();
        const detectedTerms: string[] = [];

        for (const [alias, canonical] of Object.entries(this.glossary)) {
            const regex = new RegExp(`\\b${alias}\\b`, "gi");
            if (regex.test(normalizedText)) {
                detectedTerms.push(canonical);
                normalizedText = normalizedText.replace(regex, `${alias} (${canonical})`);
            }
        }

        return { normalizedText, detectedTerms };
    }
}
