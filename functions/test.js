const admin = require('../firebase/admin');
const { updateFriendsData } = require('../src/methods/stateful');

exports.handler = async function (event, context) {
  const o = JSON.parse(event.body);
  const res = await updateFriendsData(o.ownerId, o.users)
  // console.log('logs from test func', event, context);
  
  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello World" }),
  };
}