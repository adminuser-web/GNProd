export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DataErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

import { maskString } from './logRedaction';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: DataErrorInfo = {
    // Mask any PII/secret the underlying error message may echo — this value is
    // logged AND thrown (so it can surface elsewhere), not just console-scrubbed.
    error: maskString(error instanceof Error ? error.message : String(error)),
    operationType,
    path,
  };

  console.error('Data Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
