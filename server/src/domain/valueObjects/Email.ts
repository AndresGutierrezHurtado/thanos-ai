const CORPORATE_DOMAIN = "@plataforma.com.co";

export default class Email {
    private readonly value: string;

    constructor(value: string) {
        if (!value || typeof value !== "string") {
            throw new Error("El email es obligatorio");
        }
        const trimmed = value.trim().toLowerCase();
        if (!trimmed.includes("@") || trimmed.indexOf("@") === 0 || !trimmed.includes(".")) {
            throw new Error("Formato de email inválido");
        }
        const [local, domain] = trimmed.split("@");
        if (!local?.length || !domain?.length) {
            throw new Error("Formato de email inválido");
        }
        this.value = trimmed;
    }

    public getValue(): string {
        return this.value;
    }

    public isCorporate(): boolean {
        return this.value.endsWith(CORPORATE_DOMAIN);
    }

    public toString(): string {
        return this.value;
    }
}
