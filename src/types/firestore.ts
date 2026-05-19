import type { FieldValue } from 'firebase/firestore';

export interface FirestoreTimestamp {
  seconds?: number;
  nanoseconds?: number;
  toDate?: () => Date;
  getTime?: Date['getTime'];
  isEqual?: FieldValue['isEqual'];
}

export type FirestoreWriteTimestamp = FirestoreTimestamp;

export type FirestoreId = string;
