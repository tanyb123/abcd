import { useState, useCallback } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../services/firebaseClient';
import { fetchGoogleDriveExcelFiles, findOrCreateFolder } from '../services/googleDriveService';

export interface Material {
  stt?: string;
  no?: string;
  name: string;
  material?: string;
  quyCach?: string;
  unit?: string;
  quantity: number;
  weight?: number;
  unitPrice?: number;
  totalPrice?: number;
  selected?: boolean;
  isNote?: boolean;
  isAccessory?: boolean;
  isSummary?: boolean;
  totalWeight?: number;
  inventoryStatus?: 'found' | 'notFound';
}

interface Project {
  id?: string;
  driveFolderId?: string;
  name?: string;
}

export const useMaterialsProcessor = (project: Project | null) => {
  // 物料数据和表格可见性状态
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showMaterialsTable, setShowMaterialsTable] = useState(false);

  // Google Drive 集成状态
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isGoogleDriveLoading, setIsGoogleDriveLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    async (driveFile: any, fileName: string, accessToken: string) => {
      setIsPickerVisible(false);
      setIsProcessingFile(true);

      try {
        if (!accessToken) {
          throw new Error('Không thể lấy Google access token. Vui lòng đăng nhập lại.');
        }

        // 调用 Cloud Function `importMaterialsFromDrive`
        // 注意：function 部署在 asia-southeast1 region
        const functions = getFunctions(app, 'asia-southeast1');
        const importMaterials = httpsCallable(functions, 'importMaterialsFromDrive');
        const result = await importMaterials({
          driveFileId: driveFile.id,
          accessToken,
        });

        // 处理返回结果
        const { materials: importedMaterials } = (result.data as any) || {};

        if (importedMaterials && importedMaterials.length > 0) {
          // 始终保留汇总行 (isSummary)
          const filteredMaterials = importedMaterials.filter(
            (item: any) =>
              item?.isSummary ||
              !(item?.name && item.name.toUpperCase().includes('LÊ SỸ BÌNH'))
          );

          // 处理物料：过滤不需要的行并标记特殊行
          const processedMaterials = filteredMaterials.map((item: any) => {
            // 1) 优先检查汇总行
            if (item.isSummary) {
              return {
                ...item,
                weight: item.totalWeight || item.weight || 0,
                selected: false,
                isNote: false,
                isAccessory: false,
              };
            }

            const name = (item.name || '').trim().toUpperCase();

            // 2) 检查配件
            const isAccessory = /^(PHỤ KIỆN ĐI KÈM)/.test(name);
            if (isAccessory) {
              return {
                ...item,
                isNote: false,
                isAccessory: true,
                no: '',
                stt: '',
                quantity: 0,
                weight: 0,
                unitPrice: 0,
                totalPrice: 0,
                selected: false,
              };
            }

            // 3) 检查备注
            const isNote =
              /^(GHI CHÚ|\+|-|\*)/.test(name) ||
              (item.name &&
                !item.quantity &&
                !item.unit &&
                !item.material &&
                !item.quyCach);
            if (isNote) {
              return {
                ...item,
                isNote: true,
                no: '',
                stt: '',
                quantity: 0,
                weight: 0,
                unitPrice: 0,
                totalPrice: 0,
                selected: false,
              };
            }

            // 4) 普通物料：计算总价
            const quantity = parseFloat(item.quantity || 0);
            const weight = parseFloat(item.weight || 0);
            const unitPrice = parseFloat(item.unitPrice || 0);
            const totalPrice =
              weight > 0 ? quantity * weight * unitPrice : quantity * unitPrice;

            return {
              ...item,
              isNote: false,
              isAccessory: false,
              selected: true,
              stt: item.stt || item.no || '',
              no: item.stt || item.no || '',
              totalPrice,
            };
          });

          console.log(`已处理 ${processedMaterials.length} 项物料`);

          // 设置数据到状态并显示
          setMaterials(processedMaterials);
          setShowMaterialsTable(true);
        } else {
          throw new Error(`Không tìm thấy dữ liệu vật tư hợp lệ trong file "${fileName}".`);
        }
      } catch (error: any) {
        console.error('Lỗi khi gọi importMaterialsFromDrive:', error);
        let errorMessage = error.message;
        
        // Xử lý các lỗi Firebase Functions
        if (error.code === 'functions/unauthenticated') {
          errorMessage = 'Xác thực thất bại. Vui lòng đăng xuất và đăng nhập lại.';
        } else if (error.code === 'functions/permission-denied') {
          errorMessage = 'Google Drive access token đã hết hạn. Vui lòng thử lại.';
        } else if (error.code === 'functions/internal') {
          errorMessage = 'Lỗi nội bộ của server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
        } else if (error.code === 'functions/invalid-argument') {
          errorMessage = 'Tham số không hợp lệ. Vui lòng kiểm tra lại.';
        } else if (error.message?.includes('CORS')) {
          errorMessage = 'Lỗi CORS. Vui lòng kiểm tra cấu hình Firebase Functions.';
        }
        
        throw new Error(`Lỗi xử lý file: ${errorMessage}`);
      } finally {
        setIsProcessingFile(false);
      }
    },
    []
  );

  /**
   * 从 Google Drive 导入物料
   */
  const handleImportFromGoogleDrive = useCallback(
    async (accessToken: string) => {
      setIsGoogleDriveLoading(true);
      try {
        if (!accessToken) {
          throw new Error('无法获取 access token。');
        }

        // 检查是否有项目信息和 Drive 文件夹 ID
        if (project && project.driveFolderId) {
          // 1) 在项目根目录中查找或创建子文件夹 "Thống kê vật tư"
          const statsFolder = await findOrCreateFolder(
            accessToken,
            'Thống kê vật tư',
            project.driveFolderId
          );

          // 2) 从该文件夹列出最新的 Excel 文件
          const files = await fetchGoogleDriveExcelFiles(
            accessToken,
            statsFolder.id
          );
          if (files && files.length > 0) {
            setDriveFiles(files);
            setIsPickerVisible(true);
          } else {
            throw new Error(
              '在此项目的文件夹中未找到任何 Excel 文件。请先将 Excel 文件上传到项目文件夹。'
            );
          }
        } else {
          // 回退到搜索整个 Drive（如果没有项目文件夹 ID）
          const files = await fetchGoogleDriveExcelFiles(accessToken, null);
          if (files && files.length > 0) {
            setDriveFiles(files);
            setIsPickerVisible(true);
          } else {
            throw new Error('在您的 Google Drive 中未找到任何 Excel 文件。');
          }
        }
      } catch (error: any) {
        console.error('操作 Google Drive 时出错:', error);
        throw error;
      } finally {
        setIsGoogleDriveLoading(false);
      }
    },
    [project]
  );

  /**
   * 处理价格变更
   */
  const handlePriceChange = useCallback((text: string, index: number) => {
    setMaterials((currentMaterials) => {
      const newMaterials = JSON.parse(JSON.stringify(currentMaterials));
      const item = newMaterials[index];
      const price = parseFloat(text) || 0;
      item.unitPrice = price;

      // 汇总行：总价 = 单价
      if (item.isSummary) {
        item.totalPrice = price;
        return newMaterials;
      }

      // 根据是否存在重量计算总价
      const quantity = parseFloat(item.quantity || 0);
      const weight = parseFloat(item.weight || 0);

      if (weight > 0) {
        // 如果有重量：总价 = 数量 × 重量 × 单价
        item.totalPrice = quantity * weight * price;
      } else {
        // 如果没有重量：总价 = 数量 × 单价（适用于单位为"套"的项目）
        item.totalPrice = quantity * price;
      }

      return newMaterials;
    });
  }, []);

  /**
   * 处理重新报价
   */
  const handleRequote = useCallback((quotation: any) => {
    if (quotation.materials && Array.isArray(quotation.materials)) {
      const materialsWithLatestSTT = quotation.materials.map((item: any) => {
        const quantity = parseFloat(item.quantity || 0);
        const weight = parseFloat(item.weight || 0);
        const unitPrice = parseFloat(item.unitPrice || 0);

        // 根据 QuotationScreen 的逻辑重新计算总价
        const totalPrice = item.isSummary
          ? unitPrice
          : weight > 0
          ? quantity * weight * unitPrice
          : quantity * unitPrice;

        return {
          ...item,
          stt: item.no || item.stt || '',
          totalPrice,
        };
      });

      setMaterials(materialsWithLatestSTT);
      setShowMaterialsTable(true);
    }
  }, []);

  return {
    materials,
    setMaterials,
    showMaterialsTable,
    driveFiles,
    isPickerVisible,
    isLoadingFiles,
    isGoogleDriveLoading,
    isProcessingFile,
    handleImportFromGoogleDrive,
    handleFileSelect,
    handlePriceChange,
    handleRequote,
    setIsPickerVisible,
  };
};

