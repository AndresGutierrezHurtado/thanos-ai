export default class DateTimeValue {
    private readonly value: Date;

    constructor(value: Date | null = null) {
        this.value = value || new Date();
    }

    public getValue(): Date {
        return this.value;
    }

    public toISOString(): string {
        return this.value.toISOString();
    }
}
