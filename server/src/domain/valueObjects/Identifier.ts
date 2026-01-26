export default class Identifier {
    private readonly value: string;

    constructor(value: string) {
        if (!value) {
            throw new Error("Identifier cannot be empty");
        }

        this.value = value;
    }

    public getValue(): string {
        return this.value;
    }

    public toString(): string {
        return this.value;
    }
}

