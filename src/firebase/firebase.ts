import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // 또는 serviceAccount.json 사용 가능
});

export default admin;
