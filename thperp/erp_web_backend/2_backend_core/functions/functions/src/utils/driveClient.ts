import { google } from 'googleapis';
import * as path from 'path';
import { SERVICE_ACCOUNT_KEY_PATH } from '../config';

/**
 * Returns an authenticated Google Drive client using the unified service account.
 */
export const getDriveClient = async () => {
  // Try multiple paths for service account credentials
  const possiblePaths = [
    path.join(__dirname, SERVICE_ACCOUNT_KEY_PATH),
    path.join(process.cwd(), 'service-account-credentials.json'),
    path.join(process.cwd(), 'functions', 'service-account-credentials.json'),
  ];

  let keyFile: string | undefined;
  for (const possiblePath of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(possiblePath)) {
        keyFile = possiblePath;
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  // If no file found, try using environment variable or default credentials
  const auth = keyFile
    ? new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/drive'],
      })
    : new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

  return google.drive({ version: 'v3', auth });
};

