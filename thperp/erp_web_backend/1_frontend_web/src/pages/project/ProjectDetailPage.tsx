import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProject, createProjectFolders, trackProjectView } from '../../services/projectService';
import ExcelUpload from '../../components/ExcelUpload/ExcelUpload';
import styles from './ProjectDetailPage.module.css';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEngineer, setIsEngineer] = useState(false);

  useEffect(() => {
    if (!projectId || !currentUser) return;

    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await getProject(projectId);
        
        if (!projectData) {
          setError('Không tìm thấy dự án');
          return;
        }

        setProject(projectData);
        setIsEngineer(userRole === 'ky_su');

        // Track project view để trigger notification
        await trackProjectView(projectId, currentUser.uid, userRole || '');

        // Nếu chưa có driveFolderId, tạo folders
        if (!projectData.driveFolderId) {
          try {
            const folders = await createProjectFolders(projectId);
            setProject((prev: any) => ({
              ...prev,
              driveFolderId: folders.driveFolderId,
              driveFolderUrl: folders.driveFolderUrl,
            }));
          } catch (err) {
            console.error('Error creating folders:', err);
          }
        }
      } catch (err: any) {
        console.error('Error loading project:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dự án');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, currentUser, userRole]);

  const handleUploadSuccess = (fileInfo: { id: string; name: string }) => {
    alert(`Đã upload thành công file: ${fileInfo.name}`);
    // Có thể refresh project data nếu cần
  };

  const handleUploadError = (errorMessage: string) => {
    alert(`Lỗi: ${errorMessage}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Đang tải...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Không tìm thấy dự án'}</div>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{project.name || 'Dự án'}</h1>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          ← Quay lại
        </button>
      </div>

      <div className={styles.content}>
        {isEngineer && (
          <div className={styles.section}>
            <h2>Upload File Excel Bóc Tách Vật Tư</h2>
            <p className={styles.sectionDescription}>
              Kéo thả file Excel vào đây để tự động thêm vào thư mục gốc của dự án.
              File này sẽ được sử dụng để tạo báo giá.
            </p>
            <ExcelUpload
              projectId={projectId!}
              projectFolderId={project.driveFolderId || null}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
        )}

        {(userRole === 'giam_doc' || userRole === 'pho_giam_doc' || userRole === 'thuong_mai') && (
          <div className={styles.section}>
            <h2>Báo Giá</h2>
            <p className={styles.sectionDescription}>
              Tạo báo giá từ file Excel trong thư mục dự án.
            </p>
            <button
              onClick={() => navigate(`/projects/${projectId}/quotation`)}
              className={styles.primaryButton}
            >
              Tạo Báo Giá
            </button>
          </div>
        )}

        {project.driveFolderUrl && (
          <div className={styles.section}>
            <h2>Thư Mục Dự Án</h2>
            <a
              href={project.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.driveLink}
            >
              Mở thư mục trên Google Drive →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;

