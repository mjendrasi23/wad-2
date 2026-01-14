import { Injectable } from '@angular/core';
import { ApiError } from '../models/api-error';
import { seedMockDb } from './mock-seed';
import { MockDb } from './mock-db';
import { MOCK_AUTH_TOKEN_KEY, MOCK_DB_KEY } from './mock-constants';

@Injectable({ providedIn: 'root' })
export class MockDbService {
  load(): MockDb {
    const raw = localStorage.getItem(MOCK_DB_KEY);
    if (!raw) return this.reset();

    try {
      const db = JSON.parse(raw) as MockDb;
      if (db?.version !== 1) return this.reset();
      return db;
    } catch {
      return this.reset();
    }
  }

  save(db: MockDb): void {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  }

  update(mutator: (db: MockDb) => void): MockDb {
    const db = this.load();
    mutator(db);
    this.save(db);
    return db;
  }

  reset(): MockDb {
    const fresh = seedMockDb();
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(fresh));
    localStorage.removeItem(MOCK_AUTH_TOKEN_KEY);
    return fresh;
  }

  require(): MockDb {
    const db = this.load();
    if (!db) throw new ApiError('Demo data is unavailable.', 500, 'MOCK_DB_MISSING');
    return db;
  }
}

