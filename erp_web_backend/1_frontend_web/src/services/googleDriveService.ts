import axios from 'axios';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  size?: string;
  iconLink?: string;
}

/**
 * Lấy danh sách file từ Google Drive
 * @param accessToken - Token xác thực Google
 * @param folderId - ID thư mục cần lấy (tùy chọn)
 * @returns Mảng file/thư mục
 */
export const listFiles = async (
  accessToken: string,
  folderId: string | null = null
): Promise<GoogleDriveFile[]> => {
  try {
    let url = 'https://www.googleapis.com/drive/v3/files';
    const params: any = {
      fields: 'files(id, name, mimeType, modifiedTime, size, iconLink)',
      orderBy: 'modifiedTime desc',
    };

    // 如果有 folderId，按文件夹过滤
    if (folderId) {
      params.q = `'${folderId}' in parents and trashed = false`;
    } else {
      params.q = 'trashed = false';
    }

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params,
    });

    return response.data.files || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file từ Google Drive:', error);
    throw error;
  }
};

/**
 * Lấy danh sách file Excel từ Google Drive
 * @param accessToken - Token xác thực Google
 * @param folderId - ID thư mục (tùy chọn, nếu null thì tìm từ thư mục gốc)
 * @returns Mảng file Excel
 */
export const fetchGoogleDriveExcelFiles = async (
  accessToken: string,
  folderId: string | null = null
): Promise<GoogleDriveFile[]> => {
  try {
    const baseUrl = 'https://www.googleapis.com/drive/v3/files';
    const params = new URLSearchParams();

    // 构建查询：如果提供了 folderId，限制在该文件夹内；否则搜索所有 Excel 文件
    let query = "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false";
    if (folderId) {
      query = `'${folderId}' in parents and ${query}`;
    }

    params.append('q', query);
    params.append('orderBy', 'modifiedTime desc');
    params.append('fields', 'files(id, name, modifiedTime, iconLink)');
    const url = `${baseUrl}?${params.toString()}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Lỗi Google Drive API: ${response.status}`);
    }

    const json = await response.json();
    return json.files || [];
  } catch (error) {
    console.error('Lỗi khi lấy file Excel từ Google Drive:', error);
    throw error;
  }
};

/**
 * Tải file từ Google Drive
 * @param accessToken - Token xác thực Google
 * @param fileId - ID file cần tải
 * @returns Dữ liệu file
 */
export const downloadFile = async (
  accessToken: string,
  fileId: string
): Promise<{ name: string; mimeType: string; data: ArrayBuffer }> => {
  try {
    // Đầu tiên lấy thông tin file để biết định dạng
    const fileInfoUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`;
    const fileInfoResponse = await axios.get(fileInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const { name, mimeType } = fileInfoResponse.data;

    // Tải nội dung file
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await axios.get(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer',
    });

    return {
      name,
      mimeType,
      data: response.data,
    };
  } catch (error) {
    console.error('Lỗi khi tải file từ Google Drive:', error);
    throw error;
  }
};

/**
 * Tìm hoặc tạo thư mục trong Google Drive
 * @param accessToken - Token xác thực Google
 * @param folderName - Tên thư mục
 * @param parentFolderId - ID thư mục cha (tùy chọn)
 * @returns Thông tin thư mục
 */
export const findOrCreateFolder = async (
  accessToken: string,
  folderName: string,
  parentFolderId: string | null = null
): Promise<{ id: string; name: string }> => {
  try {
    // 首先尝试查找文件夹
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${
        parentFolderId ? ` and '${parentFolderId}' in parents` : ''
      }`
    )}&fields=files(id,name)`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchResponse.ok) {
      const searchJson = await searchResponse.json();
      if (searchJson.files && searchJson.files.length > 0) {
        return searchJson.files[0];
      }
    }

    // 如果未找到，创建新文件夹
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const createResponse = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      metadata,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: createResponse.data.id,
      name: createResponse.data.name,
    };
  } catch (error) {
    console.error('Lỗi khi tìm hoặc tạo thư mục:', error);
    throw error;
  }
};

