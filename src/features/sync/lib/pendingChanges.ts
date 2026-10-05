/**
 * Counts rows edited while disconnected, keyed `table/row`, so ten edits to
 * one item read as one pending change. It is a display hint, not a queue:
 * the CRDT itself is the outbox, and reconnecting sends every change the
 * server has not seen regardless of this count.
 */
export class PendingChanges {
  private readonly keys = new Set<string>();

  add(table: string, rowId: string): void {
    this.keys.add(`${table}/${rowId}`);
  }

  addValues(): void {
    this.keys.add('values');
  }

  clear(): void {
    this.keys.clear();
  }

  get count(): number {
    return this.keys.size;
  }
}
