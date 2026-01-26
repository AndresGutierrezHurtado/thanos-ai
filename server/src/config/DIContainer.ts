import { Request } from "express";

export default class DIContainer {
    private static instance: DIContainer;

    private constructor() {}

    static async getInstance(): Promise<DIContainer> {
        if (!this.instance) {
            return new DIContainer();
        }
        return this.instance;
    }

    // TODO: Add dependencies
}
