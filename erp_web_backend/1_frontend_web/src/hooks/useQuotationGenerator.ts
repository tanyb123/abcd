import { useState } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../services/firebaseClient';
import { saveQuotation, QuotationData } from '../services/quotationService';
import { Material } from './useMaterialsProcessor';

interface CustomerData {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  taxCode?: string;
}

interface UseQuotationGeneratorOptions {
  projectId: string;
  customerData?: CustomerData;
  materials: Material[];
}

/**
 * 报价生成器 Hook
 * 用于生成 Excel 和 PDF 格式的报价
 */
export const useQuotationGenerator = ({
  projectId,
  customerData,
  materials,
}: UseQuotationGeneratorOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [excelUrl, setExcelUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  /**
   * 格式化报价数据以导出到 Excel
   */
  const formatQuotationDataForExcel = (quotationData: QuotationData) => {
    const {
      quotationNumber,
      quotationDate,
      projectName,
      customerData: custData = {},
      metadata = {},
      materials: mats = [],
      subTotal,
      discountPercentage,
      discountAmount,
      vatPercentage,
      vatAmount,
      grandTotal,
      amountInWords,
      quoteValidity,
      deliveryTime,
    } = quotationData;

    // 构建匹配 Excel 模板的数据结构
    return {
      metadata: {
        // 公司信息
        companyName:
          'CÔNG TY TNHH SẢN XUẤT CƠ KHÍ THƯƠNG MẠI DỊCH VỤ TÂN HÒA PHÁT',
        companyAddress:
          'Số 7 Quốc lộ 1A, KP3B, Phường Thanh Lộc, Quận 12, TP.HCM',
        companyPhone: '0978.268.559',
        companyEmail: 'chomcauinoxtanhoaphat.com.vn',
        taxCode: '0315155409',

        // 客户信息 - 使用 metadata（如果有），否则使用 customerData，不显示 N/A
        customerName: metadata?.customerName || custData?.name || '',
        customerAddress:
          metadata?.customerAddress || custData?.address || '',
        customerPhone: metadata?.customerPhone || custData?.phone || '',
        customerEmail: metadata?.customerEmail || custData?.email || '',
        customerTaxCode:
          metadata?.customerTaxCode || custData?.taxCode || '',
        customerContactPerson:
          metadata?.customerContactPerson || custData?.contactPerson || '',

        // 报价信息
        quotationNumber,
        quotationDate: new Date(quotationDate).toLocaleDateString('vi-VN'),
        projectName,
        quoteValidity,
        deliveryTime,
      },

      // 物料将从第 8 行开始添加
      materials: mats.map((item, index) => {
        // 以不同方式处理备注行
        const startsWithPlus = (item.name || '').trim().startsWith('+');
        const nameIsNote = (item.name || '')
          .toUpperCase()
          .includes('GHI CHÚ');
        const inferredNote =
          item.isNote ||
          nameIsNote ||
          startsWithPlus ||
          ((!item.unit || item.unit === '') &&
            (!item.material || item.material === '') &&
            (item.quantity === null ||
              item.quantity === undefined ||
              item.quantity === 0));

        if (inferredNote) {
          return {
            isNote: true,
            no: null,
            stt: null,
            name: item.name || '',
            material: '',
            unit: '',
            quantity: null,
            unitPrice: null,
            total: null,
            weight: null,
          };
        }

        const weight = item.weight ?? 0;
        const inputUnitPrice = item.unitPrice || 0;

        // 如果没有重量（手动报价）-> 直接使用单价
        const calculatedUnitPrice =
          weight && weight > 0 ? weight * inputUnitPrice : inputUnitPrice;

        const quantity = item.quantity || 0;
        const totalPrice = quantity * calculatedUnitPrice;

        // 确定最终的 STT 值
        let finalStt = '';
        if (
          item.stt !== undefined &&
          item.stt !== null &&
          String(item.stt).trim() !== ''
        ) {
          finalStt = String(item.stt).trim();
        } else if (
          item.no !== undefined &&
          item.no !== null &&
          String(item.no).trim() !== ''
        ) {
          finalStt = String(item.no).trim();
        } else {
          finalStt = String(index + 1);
        }

        return {
          isNote: false,
          no: finalStt,
          stt: finalStt,
          name: item.name || '',
          material: item.material || '',
          unit: item.unit || '',
          quantity: quantity,
          unitPrice: calculatedUnitPrice,
          total: totalPrice || item.totalPrice || 0,
          weight: weight,
        };
      }),

      // 汇总数据
      summary: {
        subTotal,
        discountPercentage: discountPercentage || 0,
        discountAmount: discountAmount || 0,
        vatPercentage: vatPercentage || 0,
        vatAmount: vatAmount || 0,
        grandTotal: grandTotal || 0,
        amountInWords: amountInWords || 'Không đồng',
      },
    };
  };

  /**
   * 生成并保存 Excel 格式的报价
   */
  const generateExcelQuotation = async (
    quotationData: QuotationData,
    accessToken: string
  ) => {
    try {
      setIsLoading(true);

      // 格式化数据以导出到 Excel
      const formattedData = formatQuotationDataForExcel(quotationData);

      if (!accessToken) {
        throw new Error('无法获取 Google access token');
      }

      // 调用云函数生成 Excel 文件（使用用户令牌）
      const functions = getFunctions(app, 'asia-southeast1');
      const generateExcelFunc = httpsCallable(functions, 'generateExcelQuotation');
      const result = await generateExcelFunc({
        formattedData,
        projectId,
        accessToken,
      });

      // 获取 Excel 文件 URL
      const { excelUrl, spreadsheetId } = (result.data as any);
      setExcelUrl(excelUrl);

      // 自动转换为 PDF
      const pdfUrl = await convertExcelToPdf(
        spreadsheetId,
        quotationData.quotationNumber,
        accessToken
      );

      // 将报价元数据保存到 Firestore，包含两个 URL
      await saveQuotation(projectId, {
        ...quotationData,
        excelUrl,
        pdfUrl: pdfUrl || excelUrl,
        createdBy: quotationData.createdBy || '',
      });

      return { excelUrl, pdfUrl, spreadsheetId };
    } catch (error: any) {
      console.error('生成 Excel 报价时出错:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 使用新的云函数将 Excel 转换为 PDF
   */
  const convertExcelToPdf = async (
    spreadsheetId: string,
    fileName: string,
    accessToken: string
  ): Promise<string | null> => {
    if (!spreadsheetId) {
      console.error('缺少用于 PDF 转换的 spreadsheetId');
      return null;
    }

    try {
      setIsPdfLoading(true);

      // 调用部署在 us-central1 的 PDF 函数
      const functionsUS = getFunctions(app, 'us-central1');
      const exportToPdfFunc = httpsCallable(functionsUS, 'exportSheetToPdf');

      const result = await exportToPdfFunc({
        spreadsheetId,
        fileName,
        projectId,
        accessToken,
      });

      // 获取 PDF 文件 URL
      const { pdfUrl } = (result.data as any);
      setPdfUrl(pdfUrl);

      return pdfUrl;
    } catch (error) {
      console.error('将 Excel 转换为 PDF 时出错:', error);
      return null;
    } finally {
      setIsPdfLoading(false);
    }
  };

  /**
   * 下载 Excel 报价文件
   */
  const downloadExcelQuotation = async () => {
    try {
      if (!excelUrl) {
        throw new Error('还没有 Excel 报价文件可以下载。');
      }

      // 在新标签页中打开 URL 以下载文件
      window.open(excelUrl, '_blank');
    } catch (error: any) {
      console.error('下载 Excel 报价时出错:', error);
      throw error;
    }
  };

  /**
   * 下载 PDF 报价文件
   */
  const downloadPdfQuotation = async () => {
    try {
      if (!pdfUrl) {
        throw new Error('还没有 PDF 报价文件可以下载。');
      }

      // 在新标签页中打开 URL 以下载文件
      window.open(pdfUrl, '_blank');
    } catch (error: any) {
      console.error('下载 PDF 报价时出错:', error);
      throw error;
    }
  };

  return {
    generateExcelQuotation,
    convertExcelToPdf,
    downloadExcelQuotation,
    downloadPdfQuotation,
    isLoading,
    isPdfLoading,
    excelUrl,
    pdfUrl,
  };
};







