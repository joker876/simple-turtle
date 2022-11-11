interface IQueue<T> {
    push(...items: T[]): void;
    next(): T | undefined;
    peek(): T | undefined;
    size(): number;
}
export class StepsQueue<T> implements IQueue<T> {
    private readonly _storage: T[] = [];

    push(...items: T[]): void {
        this._storage.push(...items);
    }
    next(): T | undefined {
        return this._storage.shift();
    }
    peek(): T | undefined {
        return this._storage[0];
    }
    size(): number {
        return this._storage.length;
    }
    all(): T[] {
        return this._storage;
    }
}