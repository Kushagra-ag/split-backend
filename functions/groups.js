const { createGroup, setDeafultGrp, getGroupDetails, addGroupMembers, removeGroupMember } = require('../src/groups');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let res;

  switch(queryParams['action']) {
      case 'createGroup': res = await createGroup(queryParams);break;
      case 'setDeafultGrp': res = await setDeafultGrp(queryParams);break;
      case 'getGroupDetails': res = await getGroupDetails(queryParams);break;
      case 'addGroupMembers': res = await addGroupMembers(queryParams);break;
      case 'removeGroupMember': res = await removeGroupMember(queryParams);break;
      default: null;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
}