const { getGeoInfo, checkNewGuestUser } = require("../src/users");

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  let res;

  switch(queryParams['action']) {
      case 'getGeoInfo': res = await getGeoInfo(queryParams);break;
      case 'checkNewGuestUser': res = await checkNewGuestUser(queryParams);break;
      default: null;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
};