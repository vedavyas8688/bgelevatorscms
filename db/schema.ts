import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{kind:text('kind').notNull(),id:text('id').notNull(),data:text('data').notNull(),version:integer('version').notNull().default(1)},t=>[primaryKey({columns:[t.kind,t.id]})]);
