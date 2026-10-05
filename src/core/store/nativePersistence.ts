import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { type OptionalSchemas, type Store } from 'tinybase/with-schemas';
import { createExpoSqlitePersister } from 'tinybase/persisters/persister-expo-sqlite/with-schemas';

import { type PersistedHandle } from './types';

let database: SQLiteDatabase | null = null;

function db(): SQLiteDatabase {
  database ??= openDatabaseSync('tandem.db');
  return database;
}

/**
 * Persists a TinyBase store into one SQLite table as a JSON document. For a
 * MergeableStore the document includes every cell's CRDT timestamp, which is
 * what lets a phone that was offline for a week still merge correctly.
 */
export async function persistToSqlite<S extends OptionalSchemas>(
  store: Store<S>,
  table: string,
): Promise<PersistedHandle> {
  const persister = createExpoSqlitePersister(store, db(), table);
  await persister.load();
  await persister.startAutoSave();
  return {
    close: async () => {
      await persister.destroy();
    },
    erase: async () => {
      await persister.destroy();
      await db().execAsync(`DROP TABLE IF EXISTS "${table}"`);
    },
  };
}
