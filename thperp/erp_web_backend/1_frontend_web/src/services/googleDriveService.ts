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
  folderId: string | null = null,
  onTokenExpired?: () => Promise<string> // Callback để refresh token khi 401
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

    let tokenToUse = accessToken;
    let response = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    });

    // Nếu gặp lỗi 401 và có callback refresh token, thử refresh
    if (response.status === 401 && onTokenExpired) {
      console.log('Token hết hạn, đang refresh token...');
      try {
        tokenToUse = await onTokenExpired();
        // Thử lại với token mới
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });
      } catch (refreshError) {
        console.error('Lỗi khi refresh token:', refreshError);
        throw new Error('Token đã hết hạn và không thể refresh. Vui lòng đăng nhập lại bằng Google.');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive API Error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Token Google Drive đã hết hạn. Vui lòng đăng nhập lại bằng Google.');
      } else if (response.status === 403) {
        throw new Error('Không có quyền truy cập Google Drive. Vui lòng cấp quyền khi đăng nhập.');
      } else if (response.status === 404) {
        throw new Error('Không tìm thấy thư mục dự án trên Google Drive.');
      } else {
        throw new Error(`Lỗi Google Drive API: ${response.status}. ${errorText}`);
      }
    }

    const json = await response.json();
    return json.files || [];
  } catch (error: any) {
    console.error('Lỗi khi lấy file Excel từ Google Drive:', error);
    // Nếu error đã có message, throw lại; nếu không, tạo message mới
    if (error.message) {
      throw error;
    }
    throw new Error(`Lỗi khi lấy file Excel từ Google Drive: ${error}`);
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

/**
 * Upload file lên Google Drive
 * @param accessToken - Token xác thực Google
 * @param file - File cần upload
 * @param folderId - ID thư mục đích (tùy chọn)
 * @returns Thông tin file đã upload
 */
export const uploadFile = async (
  accessToken: string,
  file: File,
  folderId: string | null = null
): Promise<{ id: string; name: string; webViewLink?: string }> => {
  try {
    // Tạo metadata
    const metadata: any = {
      name: file.name,
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    // Tạo form data
    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    // Upload file
    const response = await axios.post(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      formData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('Lỗi khi upload file lên Google Drive:', error);
    throw error;
  }
};

