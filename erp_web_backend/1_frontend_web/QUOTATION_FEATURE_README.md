# 报价功能使用说明

## 概述

基于移动应用的报价功能，已在Web应用中实现类似的报价系统。该功能支持：
- 从 Google Drive 根文件夹获取物料
- 报价计算和管理
- 导出 Excel 和 PDF 格式的报价单

## 功能特性

### 1. 物料导入
- 从 Google Drive 导入物料数据
- 支持从项目文件夹的 "Thống kê vật tư" 子文件夹读取
- 如果没有项目文件夹，则从整个 Google Drive 搜索 Excel 文件
- 自动处理物料数据，包括汇总行、备注行和配件行

### 2. 报价管理
- 物料列表显示和编辑
- 批量选择和应用价格
- 实时计算总价
- 支持折扣和 VAT 计算
- 报价历史记录查看

### 3. 导出功能
- 生成 Excel 格式报价单
- 自动转换为 PDF 格式
- 保存报价元数据到 Firestore
- 支持下载和分享

## 文件结构

```
src/
├── services/
│   ├── quotationService.ts      # 报价数据服务
│   └── googleDriveService.ts    # Google Drive 服务
├── hooks/
│   ├── useMaterialsProcessor.ts # 物料处理 Hook
│   └── useQuotationGenerator.ts # 报价生成 Hook
└── pages/
    └── quotation/
        ├── QuotationPage.tsx           # 主报价页面
        ├── QuotationPage.module.css    # 报价页面样式
        ├── FinalizeQuotationPage.tsx   # 完成报价页面
        └── FinalizeQuotationPage.module.css # 完成报价页面样式
```

## 使用方法

### 1. 访问报价页面

导航到报价页面：
```
/projects/:projectId/quotation
```

### 2. 导入物料

1. 点击 "从 Google Drive 导入" 按钮
2. 系统会自动查找项目文件夹中的 "Thống kê vật tư" 子文件夹
3. 如果没有项目文件夹，会搜索整个 Google Drive
4. 选择要导入的 Excel 文件
5. 系统会自动处理并显示物料列表

### 3. 编辑报价

1. 在物料表格中，可以：
   - 选择物料（复选框）
   - 编辑单价
   - 批量应用价格
   - 查看自动计算的总价

2. 批量操作：
   - 选择多个物料
   - 点击 "应用价格" 按钮
   - 输入要应用的价格
   - 系统会自动计算每个物料的总价

### 4. 完成报价

1. 点击 "继续完善报价" 按钮
2. 在完成报价页面：
   - 查看和编辑客户信息
   - 设置报价编号、日期、有效期
   - 设置折扣和 VAT
   - 查看总计和文字金额

3. 生成报价单：
   - 点击 "生成 Excel 和 PDF" 按钮
   - 系统会调用 Cloud Functions 生成文件
   - 生成完成后可以下载 Excel 或 PDF

### 5. 查看报价历史

在报价页面底部可以查看历史报价：
- 查看报价编号、日期、总价
- 打开 PDF 查看
- 重新报价（加载历史物料数据）

## 技术实现

### Google Drive 集成

使用 Firebase Auth 的 Google 登录获取访问令牌：
```typescript
const { getGoogleAccessToken } = useAuth();
const accessToken = await getGoogleAccessToken();
```

### Cloud Functions

报价生成使用以下 Cloud Functions：
- `generateExcelQuotation` (asia-southeast1) - 生成 Excel 报价单
- `exportSheetToPdf` (us-central1) - 将 Excel 转换为 PDF
- `importMaterialsFromDrive` - 从 Google Drive 导入物料

### 数据存储

报价数据存储在 Firestore：
```
projects/{projectId}/quotations/{quotationId}
```

包含的字段：
- quotationNumber: 报价编号
- quotationDate: 报价日期
- materials: 物料列表
- subTotal: 小计
- discountAmount: 折扣金额
- vatAmount: VAT 金额
- grandTotal: 总计
- excelUrl: Excel 文件 URL
- pdfUrl: PDF 文件 URL
- createdBy: 创建人
- createdAt: 创建时间

## 配置要求

### Firebase 配置

确保在 `.env` 文件中配置了 Firebase 相关环境变量：
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### Google Drive API

确保 Firebase 项目已启用 Google Drive API，并且用户已授权以下权限：
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/drive.file`

### Cloud Functions

确保以下 Cloud Functions 已部署：
- `generateExcelQuotation` (region: asia-southeast1)
- `exportSheetToPdf` (region: us-central1)
- `importMaterialsFromDrive`

## 注意事项

1. **Google 登录**: 用户需要先通过 Google 登录才能使用 Google Drive 功能
2. **项目文件夹**: 建议为每个项目创建 Google Drive 文件夹，并在其中创建 "Thống kê vật tư" 子文件夹
3. **Excel 格式**: 导入的 Excel 文件需要符合特定格式，包含以下列：
   - STT/No: 序号
   - Tên vật tư: 物料名称
   - Vật liệu: 材料
   - SL: 数量
   - KL: 重量
   - ĐVT: 单位
   - Đơn giá: 单价

## 与移动应用的差异

Web 版本针对 Web 环境进行了优化：
- 使用 React Router 进行路由导航
- 使用 CSS Modules 进行样式管理
- 使用 TypeScript 提供类型安全
- 优化了 UI/UX 以适应桌面浏览器
- 使用 `window.open()` 下载文件，而不是移动端的分享功能

## 故障排除

### 无法获取 Google Access Token
- 确保用户已通过 Google 登录
- 检查 Firebase Auth 配置
- 确认已授权 Google Drive 权限

### 无法导入物料
- 检查 Google Drive 文件夹是否存在
- 确认 Excel 文件格式正确
- 查看浏览器控制台的错误信息

### 无法生成报价单
- 确认 Cloud Functions 已部署
- 检查用户权限
- 查看 Cloud Functions 日志

## 未来改进

- [ ] 支持手动添加物料
- [ ] 支持从库存系统选择物料
- [ ] 支持报价模板
- [ ] 支持批量生成报价
- [ ] 支持报价审批流程
- [ ] 支持报价对比功能








