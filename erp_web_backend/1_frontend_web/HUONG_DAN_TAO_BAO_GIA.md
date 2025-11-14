# Hướng dẫn tạo báo giá đầu tiên

## Bước 1: Tạo dự án (nếu chưa có)

1. Mở trang Dashboard (trang chủ)
2. Trong phần "Dự án (Firestore)", nhấp vào nút **"Tạo dự án"**
3. Nhập tên dự án (ví dụ: "Dự án ABC")
4. Nhấp **"Tạo"**

## Bước 2: Tạo báo giá

Có 3 cách để tạo báo giá:

### Cách 1: Từ nút "Tạo báo giá" ở đầu trang
1. Nhấp vào nút **"Tạo báo giá"** ở góc trên bên phải
2. Nếu bạn chỉ có 1 dự án, hệ thống sẽ tự động chuyển đến trang báo giá
3. Nếu bạn có nhiều dự án, một cửa sổ sẽ hiện ra để bạn chọn dự án
4. Chọn dự án và nhấp **"Tạo báo giá"**

### Cách 2: Từ danh sách dự án
1. Trong phần "Dự án (Firestore)", tìm dự án bạn muốn tạo báo giá
2. Nhấp vào nút **"Báo giá"** bên cạnh tên dự án
3. Hoặc nhấp trực tiếp vào **tên dự án** (có gạch chân)

### Cách 3: Truy cập trực tiếp qua URL
Nếu bạn biết ID của dự án, bạn có thể truy cập trực tiếp:
```
/projects/{projectId}/quotation
```

## Bước 3: Nhập vật tư từ Google Drive

1. Trên trang báo giá, nhấp vào nút **"📥 Từ Google Drive nhập"**
2. **Lưu ý**: Bạn cần đăng nhập Google trước (nếu chưa đăng nhập, hệ thống sẽ yêu cầu)
3. Hệ thống sẽ tìm file Excel trong:
   - Thư mục dự án → thư mục con "Thống kê vật tư" (nếu có)
   - Hoặc toàn bộ Google Drive của bạn
4. Chọn file Excel chứa danh sách vật tư
5. Hệ thống sẽ tự động xử lý và hiển thị bảng vật tư

## Bước 4: Chỉnh sửa giá vật tư

1. Trong bảng vật tư, bạn có thể:
   - **Chọn vật tư**: Tích vào checkbox bên trái
   - **Nhập giá**: Nhập đơn giá vào cột "Đơn giá"
   - **Xem tổng tiền**: Tổng tiền sẽ tự động tính toán

2. **Áp dụng giá hàng loạt**:
   - Chọn nhiều vật tư bằng checkbox
   - Nhấp **"Áp dụng giá"**
   - Nhập giá muốn áp dụng
   - Nhấp **"Áp dụng"**

## Bước 5: Hoàn thiện báo giá

1. Sau khi chỉnh sửa xong, nhấp **"Tiếp tục hoàn thiện báo giá →"**
2. Trên trang hoàn thiện, bạn có thể:
   - Xem thông tin khách hàng
   - Chỉnh sửa số báo giá, ngày báo giá
   - Đặt thời gian hiệu lực và thời gian giao hàng
   - Đặt phần trăm giảm giá (nếu có)
   - Đặt phần trăm VAT (mặc định 10%)
   - Xem tổng tiền và tổng tiền bằng chữ

3. Nhấp **"Tạo Excel và PDF"**
   - Hệ thống sẽ tạo file Excel và PDF
   - Sau khi tạo xong, bạn có thể tải về bằng nút **"Tải Excel"** hoặc **"Tải PDF"**

## Lưu ý quan trọng

### Về Google Drive:
- Bạn cần đăng nhập Google để sử dụng tính năng nhập từ Google Drive
- File Excel cần có định dạng đúng với các cột: STT, Tên vật tư, Vật liệu, SL (số lượng), KL (khối lượng), ĐVT (đơn vị tính), Đơn giá

### Về dự án:
- Mỗi báo giá phải gắn với một dự án
- Nếu chưa có dự án, bạn phải tạo dự án trước

### Về Cloud Functions:
- Tính năng tạo Excel/PDF cần Cloud Functions đã được triển khai
- Đảm bảo các functions sau đã được deploy:
  - `generateExcelQuotation` (region: asia-southeast1)
  - `exportSheetToPdf` (region: us-central1)
  - `importMaterialsFromDrive`

## Khắc phục sự cố

### Không thấy gì khi nhấp "Tạo báo giá"?
- Kiểm tra xem bạn đã tạo dự án chưa
- Nếu chưa có dự án, hệ thống sẽ yêu cầu bạn tạo dự án trước

### Không thể nhập từ Google Drive?
- Đảm bảo bạn đã đăng nhập Google
- Kiểm tra quyền truy cập Google Drive
- Đảm bảo file Excel có định dạng đúng

### Không thể tạo Excel/PDF?
- Kiểm tra Cloud Functions đã được deploy chưa
- Kiểm tra console để xem lỗi cụ thể
- Đảm bảo bạn đã đăng nhập và có quyền truy cập

## Cần hỗ trợ?

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console của trình duyệt (F12) để xem lỗi
2. Kiểm tra Cloud Functions logs
3. Liên hệ đội phát triển







