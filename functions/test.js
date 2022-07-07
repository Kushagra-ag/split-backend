const admin = require('../firebase/admin');

exports.handler = async function (event, context) {
  const res = await admin.database().ref(`/users/HyjDA12c7bSAhUH_lV219`).once('value').then(res => res.val()).catch(e => `errrrrr ${e}`);
  console.log('logs from test func', event, context);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello World", res: res }),
  };
}