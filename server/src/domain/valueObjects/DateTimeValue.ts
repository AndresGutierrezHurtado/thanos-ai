export default class DateTimeValue {
    private readonly value: Date;

    constructor(value: Date) {
        this.value = value;
    }

    public static now(): DateTimeValue {
        return new DateTimeValue(new Date());
    }

    public getValue(): Date {
        return this.value;
    }

    public toISOString(): string {
        return this.value.toISOString();
    }
}

