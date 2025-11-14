import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseClient';

export interface QuotationData {
  quotationNumber: string;
  quotationDate: string;
  projectName: string;
  customerData?: {
    id?: string;
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    contactPerson?: string;
    taxCode?: string;
  };
  metadata?: {
    customerName?: string;
    customerAddress?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerTaxCode?: string;
    customerContactPerson?: string;
  };
  materials?: any[];
  subTotal?: number;
  discountPercentage?: number;
  discountAmount?: number;
  vatPercentage?: number;
  vatAmount?: number;
  grandTotal?: number;
  amountInWords?: string;
  quoteValidity?: string;
  deliveryTime?: string;
  excelUrl?: string;
  pdfUrl?: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 保存报价元数据到 Firestore
 * @param projectId - 项目ID
 * @param quotationData - 所有报价数据，包括 pdfUrl 和 createdBy
 * @returns 保存的报价数据，包含 Firestore 文档ID
 */
export const saveQuotation = async (
  projectId: string,
  quotationData: QuotationData
): Promise<QuotationData & { id: string }> => {
  try {
    console.log('Đang lưu metadata báo giá vào Firestore, Project ID:', projectId);

    const { pdfUrl, createdBy } = quotationData;

    if (!projectId) {
      throw new Error('ProjectId không được để trống');
    }

    if (!pdfUrl) {
      throw new Error('PDF URL không được để trống');
    }

    if (!createdBy) {
      throw new Error('UserId (createdBy) không được để trống');
    }

    // 1. 保存报价数据到 Firestore
    const quotationRef = collection(db, `projects/${projectId}/quotations`);
    const docRef = await addDoc(quotationRef, {
      ...quotationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('Metadata báo giá đã được lưu, ID:', docRef.id);

    // 2. Cập nhật trạng thái nhiệm vụ dự án
    const projectRef = doc(db, 'projects', projectId);
    const updateData: any = {
      'tasks.quotation.status': 'completed',
      'tasks.quotation.completedAt': serverTimestamp(),
      'tasks.quotation.completedBy': createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    };

    // Loại bỏ các trường undefined để tránh lỗi Firestore
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    await updateDoc(projectRef, cleanData);

    console.log('Trạng thái dự án đã được cập nhật');

    return {
      id: docRef.id,
      ...quotationData,
    };
  } catch (error) {
    console.error('Lỗi khi lưu metadata báo giá:', error);
    throw error;
  }
};

/**
 * Lấy tất cả báo giá của một dự án cụ thể
 * @param projectId - ID dự án
 * @returns Mảng báo giá
 */
export const getQuotationsByProject = async (
  projectId: string
): Promise<(QuotationData & { id: string })[]> => {
  try {
    const quotationsRef = collection(db, `projects/${projectId}/quotations`);
    const q = query(quotationsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (QuotationData & { id: string })[];
  } catch (error) {
    console.error('Lỗi khi lấy báo giá:', error);
    throw error;
  }
};

/**
 * Lấy báo giá cụ thể theo ID
 * @param projectId - ID dự án
 * @param quotationId - ID báo giá
 * @returns Dữ liệu báo giá, hoặc null nếu không tìm thấy
 */
export const getQuotationById = async (
  projectId: string,
  quotationId: string
): Promise<(QuotationData & { id: string }) | null> => {
  try {
    const quotationRef = doc(
      db,
      `projects/${projectId}/quotations`,
      quotationId
    );
    const quotationSnapshot = await getDoc(quotationRef);

    if (quotationSnapshot.exists()) {
      return {
        id: quotationSnapshot.id,
        ...quotationSnapshot.data(),
      } as QuotationData & { id: string };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Lỗi khi lấy báo giá theo ID:', error);
    throw error;
  }
};

