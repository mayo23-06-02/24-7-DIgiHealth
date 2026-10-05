import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface ISystemConfig extends Omit<Document, '_id'> {
  _id: string;
  features: any;
  maintenanceMode: boolean;
  popiaVersion: string;
  consultationFeeDefault: number;
  emergencyNumbers: string[];
  supportedLanguages: string[];
}

export interface IOfflineActionQueue extends Document {
  userId: string;
  action: string;
  payload: any;
  retryCount: number;
  lastAttempt: Date;
  syncedAt?: Date;
}

export const SystemConfig: ModelClass<ISystemConfig> = defineModel<ISystemConfig>({
  name: 'SystemConfig', table: 'system_config',
});
export const OfflineActionQueue: ModelClass<IOfflineActionQueue> = defineModel<IOfflineActionQueue>({
  name: 'OfflineActionQueue', table: 'offline_action_queue',
  refs: { userId: 'User' },
});
