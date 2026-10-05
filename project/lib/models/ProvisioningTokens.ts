import { defineModel, type Document, type ModelClass } from '@/lib/db';

export interface ISetPasswordToken extends Document {
  userId: string;
  tokenHash: string;
  purpose: 'set_password';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export const SetPasswordToken: ModelClass<ISetPasswordToken> = defineModel<ISetPasswordToken>({
  name: 'SetPasswordToken', table: 'set_password_tokens',
  refs: { userId: 'User' },
});

export interface IImportJob extends Document {
  facilityId: string;
  kind: 'patients' | 'doctors';
  uploadedBy?: string;
  fileName?: string;
  totalRows: number;
  createdCount: number;
  linkedCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IImportJobRow extends Document {
  jobId: string;
  rowNumber: number;
  raw: Record<string, unknown>;
  status: 'pending' | 'created' | 'linked' | 'skipped' | 'failed';
  error?: string;
  userId?: string;
  fileNumber?: string;
  createdAt: Date;
}

export const ImportJob: ModelClass<IImportJob> = defineModel<IImportJob>({
  name: 'ImportJob', table: 'import_jobs',
  refs: { facilityId: 'Facility', uploadedBy: 'User' },
});

export const ImportJobRow: ModelClass<IImportJobRow> = defineModel<IImportJobRow>({
  name: 'ImportJobRow', table: 'import_job_rows',
  refs: { jobId: 'ImportJob', userId: 'User' },
});
