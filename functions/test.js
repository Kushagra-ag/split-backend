import admin from 'firebase/admin';

// import * as admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
// console.log(serviceAccount);

// import serviceAccount from "../split-50cbf-firebase-adminsdk-1tev9-8d185587b6";
// console.log(serviceAccount);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

export const handler = async function (event, context) {
  const res = await admin.database().ref(`/users/HyjDA12c7bSAhUH_lV219`).once('value').then(res => res.val()).catch(e => `errrrrr ${e}`);
  console.log('logs from test func', event, context);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello World", res: res }),
  };
}