export default interface IEmbeddingProvider {
    embed(texts: string[]): Promise<number[][]>;
}
