/**
 * File: adapters/persistence/postgres/src/driver.ts
 * Purpose: Defines the minimal PostgreSQL driver boundary and optional node-postgres pool adapter without making pg a platform dependency.
 * Author: Raushan Raj
 */
import { createId } from '../../../../packages/core/src/ids';
import { PersistenceUnavailableError } from '../../../../packages/persistence/src/errors';

export interface PostgresQueryResult<T=Record<string,unknown>> { rows:T[]; rowCount:number; }
export interface PostgresQueryExecutor { query<T=Record<string,unknown>>(text:string,params?:unknown[]):Promise<PostgresQueryResult<T>>; }
export interface PostgresTransaction extends PostgresQueryExecutor { readonly id:string; }
export interface PostgresDatabase extends PostgresQueryExecutor { transaction<T>(work:(tx:PostgresTransaction)=>Promise<T>):Promise<T>; close?():Promise<void>; }
export interface PostgresPoolOptions { connectionString:string; maxConnections?:number; statementTimeoutMs?:number; ssl?:boolean|Record<string,unknown>; }

export function wrapNodePostgresPool(pool:any):PostgresDatabase{
  return{
    async query<T>(text:string,params:unknown[]=[]){const result=await pool.query(text,params);return{rows:result.rows as T[],rowCount:Number(result.rowCount??result.rows?.length??0)};},
    async transaction<T>(work:(tx:PostgresTransaction)=>Promise<T>){const client=await pool.connect();const tx:PostgresTransaction={id:createId('tx'),async query<R>(text:string,params:unknown[]=[]){const result=await client.query(text,params);return{rows:result.rows as R[],rowCount:Number(result.rowCount??result.rows?.length??0)};}};try{await client.query('BEGIN');const value=await work(tx);await client.query('COMMIT');return value;}catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}finally{client.release();}},
    async close(){await pool.end();},
  };
}
export function createOptionalNodePostgresDatabase(options:PostgresPoolOptions):PostgresDatabase{
  if(!options.connectionString?.trim())throw new Error('PostgreSQL connectionString is required. Resolve it from a secret reference before constructing the adapter.');
  let pg:any;try{pg=require('pg');}catch{throw new PersistenceUnavailableError('Optional PostgreSQL driver "pg" is not installed. Install it in the deployment that enables PostgreSQL persistence.');}
  const pool=new pg.Pool({connectionString:options.connectionString,max:options.maxConnections??10,statement_timeout:options.statementTimeoutMs??30_000,ssl:options.ssl});return wrapNodePostgresPool(pool);
}
