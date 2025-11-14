import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

export type Project = {
  id: string;
  name?: string;
  createdAt?: any; // Firestore Timestamp
};

export async function fetchRecentProjects(max: number = 5): Promise<Project[]> {
  // Try ordering by createdAt if it exists; if not, fallback to simple get
  try {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch {
    const snap = await getDocs(collection(db, 'projects'));
    const docs = snap.docs.slice(0, max);
    return docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }
}

export async function createProject(name: string): Promise<string> {
  // Ensure the document stores its own id field for easier querying/debugging
  const ref = doc(collection(db, 'projects'));
  await setDoc(ref, {
    id: ref.id,
    name,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), data as any);
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId));
}



