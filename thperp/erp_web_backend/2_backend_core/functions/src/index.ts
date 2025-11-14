import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export functions
export { sendEmailNotification, onNotificationCreated } from './sendEmailNotification';

