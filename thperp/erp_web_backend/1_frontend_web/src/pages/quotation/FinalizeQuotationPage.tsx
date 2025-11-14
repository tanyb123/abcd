import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuotationGenerator } from '../../hooks/useQuotationGenerator';
import Button from '../../components/Button/Button';
import styles from './FinalizeQuotationPage.module.css';

// Chuyển đổi số thành chữ tiếng Việt
const convertNumberToWords = (number: number): string => {
  const units = [
    'không',
    'một',
    'hai',
    'ba',
    'bốn',
    'năm',
    'sáu',
    'bảy',
    'tám',
    'chín',
  ];
  const teens = [
    'mười',
    'mười một',
    'mười hai',
    'mười ba',
    'mười bốn',
    'mười lăm',
    'mười sáu',
    'mười bảy',
    'mười tám',
    'mười chín',
  ];
  const tens = [
    '',
    'mười',
    'hai mươi',
    'ba mươi',
    'bốn mươi',
    'năm mươi',
    'sáu mươi',
    'bảy mươi',
    'tám mươi',
    'chín mươi',
  ];
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  const handleHundreds = (num: number, isFirstGroup: boolean): string => {
    let result = '';
    const originalNum = num;

    if (num >= 100) {
      result += units[Math.floor(num / 100)] + ' trăm ';
      num %= 100;
    }

    if (num > 0) {
      if (num < 10 && !isFirstGroup && originalNum > 99) {
        if (num === 1 && Math.floor(originalNum / 100) > 0) {
          result += 'linh một';
        } else {
          result += 'lẻ ' + units[num];
        }
      } else if (num < 10) {
        result += units[num];
      } else if (num < 20) {
        result += teens[num - 10];
      } else {
        const ten = Math.floor(num / 10);
        const unit = num % 10;
        result += tens[ten];
        if (unit > 0) {
          if (unit === 1 && ten > 1) {
            result += ' mốt';
          } else if (unit === 5 && ten > 0) {
            result += ' lăm';
          } else {
            result += ' ' + units[unit];
          }
        }
      }
    }

    return result.trim();
  };

  const convert = (num: number): string => {
    if (num === 0) return 'không';

    let result = '';
    let scaleIndex = 0;

    while (num > 0) {
      const group = num % 1000;
      if (group !== 0) {
        const isFirstGroup = scaleIndex === 0;
        const groupText = handleHundreds(group, isFirstGroup);
        result =
          groupText +
          (scaleIndex > 0 ? ' ' + scales[scaleIndex] + ' ' : '') +
          result;
      }

      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    return result.trim().replace(/\s\s+/g, ' ');
  };

  const integerPart = Math.floor(number);
  let result = convert(integerPart) + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const FinalizeQuotationPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getGoogleAccessToken, googleAccessToken: savedToken } = useAuth();

  const {
    materials: routeMaterials,
    subTotal: routeSubTotal,
    projectName: routeProjectName,
    customerData: routeCustomerData,
    isManualQuotation: routeIsManualQuotation,
  } = location.state || {};

  const [materials] = useState(routeMaterials || []);
  const [subTotal] = useState(routeSubTotal || 0);
  const [projectName] = useState(routeProjectName || 'Dự án mới');
  const [customerData] = useState(routeCustomerData || {});

  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate] = useState(new Date().toISOString());
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatPercentage, setVatPercentage] = useState(10);
  const [vatAmount, setVatAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [amountInWords, setAmountInWords] = useState('');
  const [quoteValidity, setQuoteValidity] = useState('30');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const {
    generateExcelQuotation,
    downloadExcelQuotation,
    downloadPdfQuotation,
    isLoading,
    excelUrl,
    pdfUrl,
  } = useQuotationGenerator({
    projectId: projectId || '',
    customerData,
    materials,
  });

  // Tạo số báo giá
  useEffect(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    setQuotationNumber(`THP-${year}-${random}`);
  }, []);

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
        }
      }
    };
    fetchToken();
  }, [user, getGoogleAccessToken, savedToken]);

  // Tính tổng tiền
  useEffect(() => {
    const discount = (subTotal * discountPercentage) / 100;
    setDiscountAmount(discount);

    const afterDiscount = subTotal - discount;
    const vat = (afterDiscount * vatPercentage) / 100;
    setVatAmount(vat);

    const total = afterDiscount + vat;
    setGrandTotal(total);
    setAmountInWords(convertNumberToWords(total));
  }, [subTotal, discountPercentage, vatPercentage]);

  // Định dạng tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Tạo báo giá Excel
  const handleGenerateExcel = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập');
      return;
    }

    try {
      // Lấy token nếu chưa có
      let token = accessToken || savedToken;
      if (!token) {
        token = await getGoogleAccessToken();
        setAccessToken(token);
      }

      const quotationData = {
        quotationNumber,
        quotationDate,
        projectName,
        customerData,
        materials,
        subTotal,
        discountPercentage,
        discountAmount,
        vatPercentage,
        vatAmount,
        grandTotal,
        amountInWords,
        quoteValidity: `${quoteValidity} ngày`,
        deliveryTime,
        createdBy: user.uid,
        isManualQuotation: routeIsManualQuotation || false,
        source: routeIsManualQuotation ? 'manual' : 'excel',
      };

      await generateExcelQuotation(quotationData, token);
      alert('Tạo báo giá thành công!');
    } catch (error: any) {
      if (error.message.includes('đăng nhập')) {
        alert('Vui lòng đăng nhập Google trước. Nhấp vào nút "Đăng nhập với Google" trên trang đăng nhập.');
      } else {
        alert(`Tạo báo giá thất bại: ${error.message}`);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <h1 className={styles.title}>Hoàn thiện báo giá: {projectName}</h1>
      </div>

      <div className={styles.content}>
        {/* Thông tin khách hàng */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Thông tin khách hàng</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Tên khách hàng:</label>
              <span>{customerData.name || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Địa chỉ:</label>
              <span>{customerData.address || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Điện thoại:</label>
              <span>{customerData.phone || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Email:</label>
              <span>{customerData.email || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* Thông tin báo giá */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Thông tin báo giá</h2>
          <div className={styles.formGrid}>
            <div className={styles.formRow}>
              <label>Số báo giá:</label>
              <input
                type="text"
                className={styles.input}
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label>Ngày báo giá:</label>
              <input
                type="date"
                className={styles.input}
                value={quotationDate.split('T')[0]}
                readOnly
              />
            </div>
            <div className={styles.formRow}>
              <label>Thời gian hiệu lực (ngày):</label>
              <input
                type="number"
                className={styles.input}
                value={quoteValidity}
                onChange={(e) => setQuoteValidity(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label>Thời gian giao hàng:</label>
              <input
                type="text"
                className={styles.input}
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="Ví dụ: 30 ngày"
              />
            </div>
          </div>
        </section>

        {/* Tính toán giá */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tính toán giá</h2>
          <div className={styles.calculationTable}>
            <div className={styles.calcRow}>
              <span>Tạm tính:</span>
              <span>{formatCurrency(subTotal)}</span>
            </div>
            <div className={styles.calcRow}>
              <span>
                Giảm giá (%):
                <input
                  type="number"
                  className={styles.smallInput}
                  value={discountPercentage}
                  onChange={(e) =>
                    setDiscountPercentage(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  max="100"
                />
              </span>
              <span>{formatCurrency(discountAmount)}</span>
            </div>
            <div className={styles.calcRow}>
              <span>
                VAT (%):
                <input
                  type="number"
                  className={styles.smallInput}
                  value={vatPercentage}
                  onChange={(e) =>
                    setVatPercentage(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  max="100"
                />
              </span>
              <span>{formatCurrency(vatAmount)}</span>
            </div>
            <div className={`${styles.calcRow} ${styles.totalRow}`}>
              <span>Tổng cộng:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className={styles.amountInWords}>
              <strong>Tổng cộng bằng chữ:</strong> {amountInWords}
            </div>
          </div>
        </section>

        {/* Nút thao tác */}
        <section className={styles.section}>
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleGenerateExcel}
              loading={isLoading}
              disabled={!accessToken}
            >
              {isLoading ? 'Đang tạo...' : 'Tạo Excel và PDF'}
            </Button>
            {excelUrl && (
              <Button variant="success" onClick={downloadExcelQuotation}>
                Tải Excel
              </Button>
            )}
            {pdfUrl && (
              <Button variant="success" onClick={downloadPdfQuotation}>
                Tải PDF
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FinalizeQuotationPage;

