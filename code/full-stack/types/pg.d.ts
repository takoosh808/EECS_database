declare module "pg" {
  export interface PoolConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  }

  export interface QueryResult<T = unknown> {
    rows: T[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
  }

  const pg: {
    Pool: typeof Pool;
  };

  export default pg;
}
