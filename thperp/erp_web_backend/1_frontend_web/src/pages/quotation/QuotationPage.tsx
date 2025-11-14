import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMaterialsProcessor } from '../../hooks/useMaterialsProcessor';
import { getQuotationsByProject } from '../../services/quotationService';
import { getProject, createProjectFolders } from '../../services/projectService';
import { GoogleDriveFile } from '../../services/googleDriveService';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import styles from './QuotationPage.module.css';

interface Project {
  id: string;
  name?: string;
  driveFolderId?: string;
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerContactPerson?: string;
  customerTaxCode?: string;
}

const QuotationPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, getGoogleAccessToken, googleAccessToken: savedToken, signInWithGoogle } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [hasSelections, setHasSelections] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const {
    materials,
    setMaterials,
    showMaterialsTable,
    driveFiles,
    isPickerVisible,
    isLoadingFiles,
    isGoogleDriveLoading,
    handleImportFromGoogleDrive,
    handleFileSelect,
    handlePriceChange,
    handleRequote,
    setIsPickerVisible,
  } = useMaterialsProcessor(project);

  // Tải thông tin dự án và lịch sử báo giá
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;

      try {
        // Tải thông tin dự án từ Firestore
        const projectData = await getProject(projectId);
        if (projectData) {
          // Nếu chưa có driveFolderId, tự động tạo folder
          if (!projectData.driveFolderId) {
            try {
              const folders = await createProjectFolders(projectId);
              setProject({
                ...projectData,
                driveFolderId: folders.driveFolderId,
                driveFolderUrl: folders.driveFolderUrl,
              } as Project);
            } catch (folderError) {
              console.error('Lỗi khi tạo folder:', folderError);
              // Vẫn set project dù không tạo được folder
              setProject(projectData as Project);
            }
          } else {
            setProject(projectData as Project);
          }
        } else {
          setProject({
            id: projectId,
            name: 'Dự án không tìm thấy',
          });
        }

        // Tải lịch sử báo giá
        const pastQuotations = await getQuotationsByProject(projectId);
        setQuotations(pastQuotations);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
      } finally {
        setIsLoadingQuotations(false);
      }
    };

    loadData();
  }, [projectId]);

  // Lấy Google Access Token
  useEffect(() => {
    const fetchToken = async () => {
      if (user) {
        try {
          // Thử sử dụng token đã có trong context trước
          if (savedToken) {
            setAccessToken(savedToken);
            return;
          }

          // Nếu chưa có, thử lấy token
          const token = await getGoogleAccessToken();
          setAccessToken(token);
        } catch (error) {
          console.error('Lỗi khi lấy Google Access Token:', error);
          // Không set accessToken nếu lỗi, để user biết cần đăng nhập lại
        }
      }
    };
    fetchToken();
  }, [user, getGoogleAccessToken, savedToken]);

  // Xử lý nhập từ Google Drive
  const handleImportClick = async () => {
    try {
      // Lấy token nếu chưa có
      let token = accessToken || savedToken;
      if (!token) {
        token = await getGoogleAccessToken();
        setAccessToken(token);
      }
      
      // Truyền callback để refresh token nếu gặp 401
      await handleImportFromGoogleDrive(token, async () => {
        // Callback để refresh token khi gặp 401
        const newToken = await getGoogleAccessToken();
        setAccessToken(newToken);
        return newToken;
      });
    } catch (error: any) {
      if (error.message.includes('đăng nhập') || error.message.includes('Token')) {
        // Nếu lỗi về token, yêu cầu đăng nhập lại
        const shouldRetry = confirm(
          'Token Google Drive đã hết hạn. Bạn có muốn đăng nhập lại bằng Google không?'
        );
        if (shouldRetry) {
          try {
            await signInWithGoogle();
            // Sau khi đăng nhập lại, thử lại
            const newToken = await getGoogleAccessToken();
            setAccessToken(newToken);
            await handleImportFromGoogleDrive(newToken, async () => {
              const refreshedToken = await getGoogleAccessToken();
              setAccessToken(refreshedToken);
              return refreshedToken;
            });
          } catch (retryError: any) {
            alert(`Nhập dữ liệu thất bại: ${retryError.message}`);
          }
        }
      } else {
        alert(`Nhập dữ liệu thất bại: ${error.message}`);
      }
    }
  };

  // Xử lý chọn file
  const handleFileSelectClick = async (file: GoogleDriveFile) => {
    try {
      // Lấy token nếu chưa có
      let token = accessToken || savedToken;
      if (!token) {
        token = await getGoogleAccessToken();
        setAccessToken(token);
      }
      
      await handleFileSelect(file, file.name, token);
    } catch (error: any) {
      if (error.message.includes('đăng nhập')) {
        alert('Vui lòng đăng nhập Google trước. Nhấp vào nút "Đăng nhập với Google" trên trang đăng nhập.');
      } else {
        alert(`Xử lý file thất bại: ${error.message}`);
      }
    }
  };

  // Xử lý thay đổi giá
  const handlePriceChangeClick = (text: string, index: number) => {
    handlePriceChange(text, index);
    // Cập nhật trạng thái chọn
    const anySelected = materials.some((item) => item.selected);
    setHasSelections(anySelected);
  };

  // Chuyển đổi chọn
  const handleToggleSelect = (index: number) => {
    setMaterials((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        selected: !updated[index].selected,
      };
      const anySelected = updated.some((item) => item.selected);
      setHasSelections(anySelected);
      return updated;
    });
  };

  // Chọn tất cả/Bỏ chọn tất cả
  const toggleSelectAll = (value: boolean) => {
    setMaterials((prev) =>
      prev.map((item) => ({
        ...item,
        selected: value,
      }))
    );
    setHasSelections(value);
  };

  // Áp dụng giá hàng loạt
  const handleApplyBulkPrice = () => {
    if (!bulkPrice || isNaN(parseFloat(bulkPrice))) {
      alert('Vui lòng nhập giá hợp lệ');
      return;
    }

    const price = parseFloat(bulkPrice);

    setMaterials((prev) => {
      return prev.map((item) => {
        if (item.selected) {
          const weight = parseFloat(String(item.weight || 0));
          const quantity = parseFloat(String(item.quantity || 0));

          let totalPrice;
          if (weight > 0) {
            totalPrice = quantity * weight * price;
          } else {
            totalPrice = quantity * price;
          }

          return {
            ...item,
            unitPrice: price,
            totalPrice: totalPrice,
          };
        }
        return item;
      });
    });

    setShowBulkPriceModal(false);
    setBulkPrice('');
  };

  // Tính tổng tiền
  const subTotal = materials.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0
  );

  // Định dạng tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Định dạng số
  const formatNumber = (num: number) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    const roundedNum = Math.round(num * 10) / 10;
    return roundedNum.toString().replace('.', ',');
  };

  // Điều hướng đến trang hoàn thiện báo giá
  const handleNavigateToFinalize = () => {
    if (!projectId || !project) return;

    const customerData = {
      id: project.customerId || '',
      name: project.customerName || 'Khách hàng',
      address: project.customerAddress || '',
      phone: project.customerPhone || '',
      email: project.customerEmail || '',
      contactPerson: project.customerContactPerson || '',
      taxCode: project.customerTaxCode || '',
    };

    navigate(`/projects/${projectId}/quotation/finalize`, {
      state: {
        materials,
        subTotal,
        projectId,
        projectName: project.name || 'Dự án mới',
        customerData,
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>
          Báo giá: {project?.name || 'Dự án'}
        </h1>
      </div>

      {/* 1. Phần nhập vật tư */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Nhập vật tư</h2>
        {!accessToken && !savedToken && (
          <div className={styles.googleLoginPrompt}>
            <p className={styles.promptText}>
              Để nhập vật tư từ Google Drive, vui lòng đăng nhập Google trước:
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const success = await signInWithGoogle();
                  if (success) {
                    // Sau khi đăng nhập thành công, token sẽ được lưu tự động
                    const token = await getGoogleAccessToken();
                    setAccessToken(token);
                    alert('Đăng nhập Google thành công! Bây giờ bạn có thể nhập vật tư từ Google Drive.');
                  }
                } catch (error: any) {
                  alert(`Đăng nhập Google thất bại: ${error.message}`);
                }
              }}
            >
              🔐 Đăng nhập với Google
            </Button>
          </div>
        )}
        <div className={styles.buttonGroup}>
          <Button
            variant="primary"
            onClick={handleImportClick}
            disabled={isGoogleDriveLoading || (!accessToken && !savedToken)}
            loading={isGoogleDriveLoading}
          >
            {isGoogleDriveLoading ? 'Đang tải...' : '📥 Nhập từ Google Drive'}
          </Button>
        </div>
      </section>

      {/* 2. Phần bảng vật tư */}
      {showMaterialsTable && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Bảng tính vật tư</h2>

          {materials.length > 0 && (
            <div className={styles.bulkActions}>
              <Button
                variant="secondary"
                onClick={() => toggleSelectAll(true)}
              >
                Chọn tất cả
              </Button>
              <Button
                variant="secondary"
                onClick={() => toggleSelectAll(false)}
              >
                Bỏ chọn
              </Button>
              <Button
                variant="success"
                onClick={() => setShowBulkPriceModal(true)}
                disabled={!hasSelections}
              >
                Áp dụng giá
              </Button>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th style={{ width: '80px' }}>STT</th>
                  <th>Tên vật tư</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>KL</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item, index) => {
                  if (item.isNote) {
                    return (
                      <tr key={index} className={styles.noteRow}>
                        <td colSpan={8} className={styles.noteCell}>
                          {item.name}
                        </td>
                      </tr>
                    );
                  }

                  const isRoman =
                    item.stt && /^[IVXLCDM]+$/i.test(String(item.stt).trim());

                  return (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.selected || false}
                          onChange={() => handleToggleSelect(index)}
                        />
                      </td>
                      <td
                        className={`${styles.sttCell} ${
                          isRoman ? styles.romanCell : ''
                        }`}
                      >
                        {item.stt || ''}
                      </td>
                      <td>
                        <div className={styles.materialName}>{item.name}</div>
                        {item.material && (
                          <div className={styles.materialType}>
                            {item.material}
                          </div>
                        )}
                        {item.quyCach && (
                          <div className={styles.materialType}>
                            Quy cách: {item.quyCach}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {formatNumber(item.quantity || 0)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {formatNumber(item.weight || 0)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.unit || ''}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.priceInput}
                          value={(item.unitPrice || 0) > 0 ? item.unitPrice : ''}
                          onChange={(e) =>
                            handlePriceChangeClick(e.target.value, index)
                          }
                          placeholder="Nhập..."
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>
                        {(item.totalPrice || 0) > 0
                          ? formatCurrency(item.totalPrice || 0)
                          : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {materials.length > 0 && (
            <div className={styles.footer}>
              <div className={styles.summary}>
                <span className={styles.summaryLabel}>Tổng cộng:</span>
                <span className={styles.summaryValue}>
                  {formatCurrency(subTotal)}
                </span>
              </div>
              <Button
                variant="success"
                onClick={handleNavigateToFinalize}
                className={styles.continueButton}
              >
                Tiếp tục hoàn thiện báo giá →
              </Button>
            </div>
          )}
        </section>
      )}

      {/* 3. Phần lịch sử báo giá */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Lịch sử báo giá</h2>
        {isLoadingQuotations ? (
          <div>Đang tải...</div>
        ) : quotations.length === 0 ? (
          <div className={styles.emptyText}>Chưa có báo giá nào.</div>
        ) : (
          <div className={styles.historyList}>
            {quotations.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <div className={styles.historyNumber}>
                    {item.quotationNumber ||
                      `Báo giá #${item.id.substring(0, 5)}`}
                  </div>
                  <div className={styles.historyDate}>
                    Ngày tạo:{' '}
                    {item.createdAt
                      ? new Date(
                          item.createdAt.seconds * 1000
                        ).toLocaleDateString('vi-VN')
                      : 'Không rõ'}
                  </div>
                  <div className={styles.historyTotal}>
                    Tổng cộng: {formatCurrency(item.grandTotal || 0)}
                  </div>
                </div>
                <div className={styles.historyActions}>
                  {item.pdfUrl && (
                    <Button
                      variant="primary"
                      onClick={() => window.open(item.pdfUrl, '_blank')}
                    >
                      Xem PDF
                    </Button>
                  )}
                  <Button
                    variant="success"
                    onClick={() => {
                      handleRequote(item);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Báo giá lại
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal chọn file */}
      <Modal
        open={isPickerVisible}
        title="Chọn file Excel từ Google Drive"
        onClose={() => setIsPickerVisible(false)}
      >
        {isLoadingFiles ? (
          <div>Đang tải...</div>
        ) : (
          <div className={styles.fileList}>
            {driveFiles.length === 0 ? (
              <div>Không tìm thấy file nào.</div>
            ) : (
              driveFiles.map((file) => (
                <div
                  key={file.id}
                  className={styles.fileItem}
                  onClick={() => handleFileSelectClick(file)}
                >
                  <span className={styles.fileIcon}>📄</span>
                  <span className={styles.fileName}>{file.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* Modal giá hàng loạt */}
      <Modal
        open={showBulkPriceModal}
        title="Áp dụng giá cho các mục đã chọn"
        onClose={() => setShowBulkPriceModal(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowBulkPriceModal(false)}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleApplyBulkPrice}>
              Áp dụng
            </Button>
          </>
        }
      >
        <div className={styles.formRow}>
          <label>Đơn giá</label>
          <input
            type="number"
            className={styles.input}
            placeholder="Nhập giá muốn áp dụng"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default QuotationPage;

