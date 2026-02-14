import admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, '../../llnyuhomepage-firebase-adminsdk-fbsvc-c48065a156.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

export default admin;
