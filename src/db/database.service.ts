import { Injectable, OnModuleInit } from '@nestjs/common';
import { createDb, type Database } from './database';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public db: Database;

  constructor() {
    this.db = createDb();
  }

  onModuleInit() {
    this.db = createDb();
  }

  getDb() {
    return this.db;
  }
}
