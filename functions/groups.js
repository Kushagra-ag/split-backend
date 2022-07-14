const GroupMethods = require('../src/groups');
const { DEFAULT_ERROR } = require('../src/constants');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let res;

  switch(queryParams['action']) {
      case 'createGroup': res = await GroupMethods.createGroup(queryParams);break;
      case 'setDeafultGrp': res = await GroupMethods.setDeafultGrp(queryParams);break;
      case 'getGroupDetails': res = await GroupMethods.getGroupDetails(queryParams);break;
      case 'addGroupMembers': res = await GroupMethods.addGroupMembers(queryParams);break;
      case 'removeGroupMember': res = await GroupMethods.removeGroupMember(queryParams);break;
      case 'joinGroupInfo': res = await GroupMethods.joinGroupInfo(queryParams);break;
      case 'deleteGroup': res = await GroupMethods.deleteGroup(queryParams);break;
      default: res = DEFAULT_ERROR;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
}