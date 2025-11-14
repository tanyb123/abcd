import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProject, createProjectFolders } from '../../services/projectService';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import styles from './ManualQuotationPage.module.css';

interface Material {
  stt?: string;
  name: string;
  material?: string;
  unit?: string;
  quantity: string;
  unitPrice: string;
  totalPrice: number;
  selected?: boolean;
}

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

const MATERIAL_OPTIONS = ['SUS304', 'SS400', 'SUS316', 'SUS304 2B', 'Khác'];
const UNIT_OPTIONS = ['Cái', 'Cây', 'Bộ', 'Kg', 'm'];

const ManualQuotationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([
    {
      stt: '',
      name: '',
      material: MATERIAL_OPTIONS[0],
      unit: UNIT_OPTIONS[0],
      quantity: '',
      unitPrice: '0',
      totalPrice: 0,
      selected: false,
    },
  ]);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [hasSelections, setHasSelections] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await getProject(projectId);
        if (projectData) {
          if (!projectData.driveFolderId) {
            try {
              const folders = await createProjectFolders(projectId);
              setProject({
                ...projectData,
                driveFolderId: folders.driveFolderId,
                driveFolderUrl: folders.driveFolderUrl,
              } as Project);
            } catch (error) {
              console.error('Error creating folders:', error);
              setProject(projectData as Project);
            }
          } else {
            setProject(projectData as Project);
          }
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const addMaterialRow = () => {
    setMaterials((prev) => [
      ...prev,
      {
        stt: '',
        name: '',
        material: MATERIAL_OPTIONS[0],
        unit: UNIT_OPTIONS[0],
        quantity: '',
        unitPrice: '0',
        totalPrice: 0,
        selected: false,
      },
    ]);
  };

  const handleChange = (
    index: number,
    field: keyof Material,
    value: string | boolean
  ) => {
    setMaterials((prev) => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], [field]: value };

      // Auto-recalculate total
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = parseFloat(newArr[index].quantity) || 0;
        const unitP = parseFloat(newArr[index].unitPrice) || 0;
        newArr[index].totalPrice = qty * unitP;
      }

      // Update hasSelections
      if (field === 'selected') {
        const anySelected = newArr.some((item) => item.selected);
        setHasSelections(anySelected);
      }

      return newArr;
    });
  };

  const handleApplyBulkPrice = () => {
    if (!bulkPrice || isNaN(parseFloat(bulkPrice))) {
      alert('Vui lòng nhập giá hợp lệ');
      return;
    }

    const price = parseFloat(bulkPrice);
    setMaterials((prev) =>
      prev.map((item) => {
        if (item.selected) {
          const qty = parseFloat(item.quantity) || 0;
          return {
            ...item,
            unitPrice: price.toString(),
            totalPrice: qty * price,
          };
        }
        return item;
      })
    );

    setShowBulkPriceModal(false);
    setBulkPrice('');
  };

  const toggleSelectAll = (value: boolean) => {
    setMaterials((prev) =>
      prev.map((item) => ({ ...item, selected: value }))
    );
    setHasSelections(value);
  };

  const removeSelectedRows = () => {
    setMaterials((prev) => prev.filter((item) => !item.selected));
    setHasSelections(false);
  };

  const computeSubTotal = () => {
    return materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
  };

  const handleContinue = () => {
    // Validate
    if (materials.length === 0) {
      alert('Vui lòng nhập ít nhất 1 vật tư.');
      return;
    }

    const cleaned = materials.filter((m) => (m.name || '').trim() !== '');

    if (cleaned.length === 0) {
      alert('Tên vật tư không được bỏ trống.');
      return;
    }

    const subTotal = computeSubTotal();

    const customerData = {
      id: project?.customerId || '',
      name: project?.customerName || 'Khách hàng',
      address: project?.customerAddress || '',
      phone: project?.customerPhone || '',
      email: project?.customerEmail || '',
      contactPerson: project?.customerContactPerson || '',
      taxCode: project?.customerTaxCode || '',
    };

    // Remove selected property before navigation
    const cleanedMaterials = cleaned.map(({ selected, ...rest }) => ({
      ...rest,
      quantity: parseFloat(rest.quantity) || 0,
      unitPrice: parseFloat(rest.unitPrice) || 0,
    }));

    navigate(`/projects/${projectId}/quotation/finalize`, {
      state: {
        materials: cleanedMaterials,
        subTotal,
        projectId,
        projectName: project?.name || 'Dự án mới',
        customerData,
        isManualQuotation: true,
      },
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Đang tải...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Không tìm thấy dự án</div>
        <Button onClick={() => navigate('/dashboard')}>Quay lại Dashboard</Button>
      </div>
    );
  }

  const subTotal = computeSubTotal();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>
          Báo giá thủ công: {project.name || 'Dự án'}
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Danh sách vật tư</h2>
            <div className={styles.headerActions}>
              <Button variant="secondary" onClick={addMaterialRow}>
                + Thêm dòng
              </Button>
              {hasSelections && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBulkPriceModal(true)}
                  >
                    Đặt giá hàng loạt
                  </Button>
                  <Button variant="danger" onClick={removeSelectedRows}>
                    Xóa đã chọn
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => toggleSelectAll(!hasSelections)}>
                {hasSelections ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={hasSelections && materials.every((m) => m.selected)}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th style={{ width: '60px' }}>STT</th>
                  <th>Tên vật tư</th>
                  <th style={{ width: '120px' }}>Vật liệu</th>
                  <th style={{ width: '100px' }}>Số lượng</th>
                  <th style={{ width: '100px' }}>Đơn vị</th>
                  <th style={{ width: '150px' }}>Đơn giá</th>
                  <th style={{ width: '150px' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.selected || false}
                        onChange={(e) =>
                          handleChange(index, 'selected', e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.inputSmall}
                        value={item.stt || ''}
                        onChange={(e) => handleChange(index, 'stt', e.target.value)}
                        placeholder="STT"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.input}
                        value={item.name}
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        placeholder="Nhập tên vật tư"
                      />
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        value={item.material || MATERIAL_OPTIONS[0]}
                        onChange={(e) => handleChange(index, 'material', e.target.value)}
                      >
                        {MATERIAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.inputNumber}
                        value={item.quantity}
                        onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        value={item.unit || UNIT_OPTIONS[0]}
                        onChange={(e) => handleChange(index, 'unit', e.target.value)}
                      >
                        {UNIT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.inputNumber}
                        value={item.unitPrice}
                        onChange={(e) => handleChange(index, 'unitPrice', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1000"
                      />
                    </td>
                    <td className={styles.totalCell}>
                      {item.totalPrice.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className={styles.totalLabel}>
                    Tổng cộng:
                  </td>
                  <td className={styles.totalAmount}>
                    {subTotal.toLocaleString('vi-VN')} VNĐ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleContinue}>
            Tiếp tục →
          </Button>
        </div>
      </div>

      {/* Bulk Price Modal */}
      <Modal
        open={showBulkPriceModal}
        title="Đặt giá hàng loạt"
        onClose={() => {
          setShowBulkPriceModal(false);
          setBulkPrice('');
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowBulkPriceModal(false);
                setBulkPrice('');
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleApplyBulkPrice}>
              Áp dụng
            </Button>
          </>
        }
      >
        <div className={styles.modalContent}>
          <label>Nhập giá cho các vật tư đã chọn:</label>
          <input
            type="number"
            className={styles.input}
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            placeholder="Nhập giá"
            min="0"
            step="1000"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ManualQuotationPage;

