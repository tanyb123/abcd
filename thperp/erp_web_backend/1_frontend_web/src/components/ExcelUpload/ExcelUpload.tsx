import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFile } from '../../services/googleDriveService';
import styles from './ExcelUpload.module.css';

interface ExcelUploadProps {
  projectId: string;
  projectFolderId: string | null;
  onUploadSuccess?: (fileInfo: { id: string; name: string }) => void;
  onUploadError?: (error: string) => void;
}

const ExcelUpload: React.FC<ExcelUploadProps> = ({
  projectId,
  projectFolderId,
  onUploadSuccess,
  onUploadError,
}) => {
  const { getGoogleAccessToken } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      const isValidType =
        validTypes.includes(file.type) ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.csv');

      if (!isValidType) {
        onUploadError?.('Vui lòng chọn file Excel (.xlsx, .xls, .csv)');
        return;
      }

      if (!projectFolderId) {
        onUploadError?.('Thư mục dự án chưa được tạo. Vui lòng tạo thư mục trước.');
        return;
      }

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Get Google access token
        const accessToken = await getGoogleAccessToken();

        // Upload file to project root folder
        const fileInfo = await uploadFile(accessToken, file, projectFolderId);

        setUploadProgress(100);
        onUploadSuccess?.(fileInfo);
      } catch (error: any) {
        console.error('Error uploading file:', error);
        onUploadError?.(
          error.message || 'Có lỗi xảy ra khi upload file. Vui lòng thử lại.'
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [projectFolderId, getGoogleAccessToken, onUploadSuccess, onUploadError]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  return (
    <div className={styles.uploadContainer}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${
          isUploading ? styles.uploading : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className={styles.uploadingContent}>
            <div className={styles.spinner}></div>
            <p>Đang upload file...</p>
            {uploadProgress > 0 && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.icon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className={styles.instruction}>
              Kéo thả file Excel vào đây hoặc{' '}
              <label className={styles.browseLink}>
                chọn file
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className={styles.fileInput}
                  disabled={isUploading}
                />
              </label>
            </p>
            <p className={styles.hint}>
              File sẽ được tự động thêm vào thư mục gốc của dự án
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ExcelUpload;

