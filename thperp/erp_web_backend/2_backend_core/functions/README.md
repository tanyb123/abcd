# Firebase Functions cho ERP Web Backend

## Cài đặt

1. Cài đặt dependencies:
```bash
cd functions
npm install
```

2. Cấu hình SMTP password:
```bash
firebase functions:config:set smtp.password="your-app-password"
```

Hoặc sử dụng environment variable:
```bash
export SMTP_PASSWORD="your-app-password"
```

**Lưu ý:** Với Gmail, bạn cần tạo "App Password" thay vì sử dụng mật khẩu thông thường:
1. Vào Google Account Settings
2. Security → 2-Step Verification → App passwords
3. Tạo app password mới cho "Mail"
4. Sử dụng password đó trong config

## Build và Deploy

```bash
npm run build
firebase deploy --only functions
```

## Functions

### sendEmailNotification
Callable function để gửi email thông báo.

**Input:**
```typescript
{
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}
```

### onNotificationCreated
Firestore trigger tự động gửi email khi có notification mới được tạo.

**Điều kiện:**
- User phải có field `gmail` hoặc `email` trong collection `users`
- User phải có `emailNotificationsEnabled !== false` (mặc định là true)

**Email sẽ được gửi từ:** taotentanyb@gmail.com

