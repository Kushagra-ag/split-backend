const UserMethods = require("../src/users");
const { DEFAULT_ERROR } = require('../src/constants');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  let res;

  switch(queryParams['action']) {
      case 'signInUserCheck': res = await UserMethods.signInUserCheck(queryParams);break;  
      case 'getUsers': res = await UserMethods.getUsers(queryParams);break;
      case 'getGeoInfo': res = await UserMethods.getGeoInfo(queryParams);break;
      case 'checkNewGuestUser': res = await UserMethods.checkNewGuestUser(queryParams);break;
      case 'syncUserFriends': res = await UserMethods.syncUserFriends(queryParams);break;
      case 'getUserGroups': res = await UserMethods.getUserGroups(queryParams);break;
      case 'updateUserProfile': res = await UserMethods.updateUserProfile(queryParams);break;
      default: res = {...DEFAULT_ERROR, methodInvoked: `${event.path}/${queryParams.action}`};
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
};