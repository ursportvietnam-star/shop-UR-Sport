import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
  type WithFieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';

export type AdminCollection =
  | 'blogPosts'
  | 'categorySeo'
  | 'media'
  | 'newsletterSubscribers'
  | 'orders'
  | 'products'
  | 'reviews'
  | 'seoGscData'
  | 'seoGscImports'
  | 'seoAiActions'
  | 'seoDrafts'
  | 'seoOpportunities'
  | 'seoReports'
  | 'vouchers';

export type AdminSetting =
  | 'banners'
  | 'blogCategories'
  | 'cheapChampion'
  | 'customCss'
  | 'flashSale'
  | 'floatingMenu'
  | 'navigation'
  | 'supportPolicies';

export const adminTimestamp = serverTimestamp;

export const subscribeAdminCollection = <T extends { id: string }>(
  collectionName: AdminCollection,
  onData: (items: T[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe => {
  const collectionQuery = query(collection(db, collectionName), orderBy('createdAt', 'desc'));

  return onSnapshot(
    collectionQuery,
    (snapshot) => {
      onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as T[]);
    },
    (error) => {
      onError?.(error);
    },
  );
};

export const getAdminSetting = async <T = DocumentData>(settingId: AdminSetting) => {
  const snapshot = await getDoc(doc(db, 'settings', settingId));
  return snapshot.exists() ? (snapshot.data() as T) : null;
};

export const getAdminDocument = async <T = DocumentData>(collectionName: AdminCollection, id: string) => {
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? (snapshot.data() as T) : null;
};

export const saveAdminSetting = async <T extends WithFieldValue<DocumentData>>(settingId: AdminSetting, data: T) => {
  await setDoc(doc(db, 'settings', settingId), data);
};

export const mergeAdminDocument = async <T extends WithFieldValue<DocumentData>>(
  collectionName: AdminCollection,
  id: string,
  data: T,
) => {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
};

export const updateAdminDocument = async <T extends Partial<DocumentData>>(
  collectionName: AdminCollection,
  id: string,
  data: T,
) => {
  await updateDoc(doc(db, collectionName, id), data);
};

export const addAdminDocument = async <T extends WithFieldValue<DocumentData>>(
  collectionName: AdminCollection,
  data: T,
) => {
  return addDoc(collection(db, collectionName), data);
};

export const deleteAdminDocument = async (collectionName: AdminCollection, id: string) => {
  await deleteDoc(doc(db, collectionName, id));
};
