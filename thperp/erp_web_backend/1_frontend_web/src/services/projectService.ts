import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, functions } from './firebaseClient';
import { httpsCallable } from 'firebase/functions';

export interface Project {
  id: string;
  name?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  createdAt?: any;
  [key: string]: any;
}

/**
 * Lấy thông tin project
 */
export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (projectDoc.exists()) {
      return { id: projectDoc.id, ...projectDoc.data() } as Project;
    }
    return null;
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
};

/**
 * Tạo project folders trên Google Drive
 */
export const createProjectFolders = async (
  projectId: string
): Promise<{ driveFolderId: string; driveFolderUrl: string }> => {
  try {
    // functions đã được export từ firebaseClient với region asia-southeast1
    const createFolders = httpsCallable(functions, 'createProjectFolders');
    const result = await createFolders({ projectId });
    const data = result.data as any;
    return {
      driveFolderId: data.driveFolderId,
      driveFolderUrl: data.driveFolderUrl,
    };
  } catch (error) {
    console.error('Error creating project folders:', error);
    throw error;
  }
};

/**
 * Track project view và trigger notification cho engineers
 */
export const trackProjectView = async (
  projectId: string,
  userId: string,
  userRole: string
): Promise<void> => {
  try {
    // Chỉ trigger notification nếu user là giám đốc hoặc thương mại
    const rolesToTrigger = ['giam_doc', 'pho_giam_doc', 'thuong_mai'];
    if (!rolesToTrigger.includes(userRole)) {
      return;
    }

    // Lấy thông tin project
    const project = await getProject(projectId);
    if (!project) {
      return;
    }

    // Lấy danh sách engineers
    const engineersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'ky_su')
    );
    const engineersSnapshot = await getDocs(engineersQuery);

    // Tạo notification cho mỗi engineer
    const notifications = engineersSnapshot.docs.map((engineerDoc) => ({
      userId: engineerDoc.id,
      message: `${project.name || 'Một dự án'} đã được mở bởi ${userRole === 'giam_doc' || userRole === 'pho_giam_doc' ? 'giám đốc' : 'thương mại'}. Vui lòng kiểm tra và thêm file Excel bóc tách vật tư nếu cần.`,
      type: 'PROJECT_OPENED' as const,
      read: false,
      createdAt: serverTimestamp(),
      navLink: {
        screen: 'project',
        params: { projectId },
      },
      projectId,
      projectName: project.name,
    }));

    // Lưu notifications vào Firestore
    await Promise.all(
      notifications.map((notification) =>
        addDoc(collection(db, 'notifications'), notification)
      )
    );
  } catch (error) {
    console.error('Error tracking project view:', error);
    // Không throw error để không ảnh hưởng đến việc mở project
  }
};

