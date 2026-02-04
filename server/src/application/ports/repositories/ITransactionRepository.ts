
export default interface ITransactionRepository {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}