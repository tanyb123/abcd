import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export email notification functions
export { sendEmailNotification, onNotificationCreated } from './sendEmailNotification';

// Export project folder functions
export { createProjectFolders } from './createProjectFolders';

// Export material importer functions
export { importMaterialsFromDrive } from './materialImporter';

// Export quotation Excel generator
export { generateExcelQuotation } from './quotationExcelGenerator';
