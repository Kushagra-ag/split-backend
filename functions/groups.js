const { createGroup, setDeafultGrp, getGroupDetails } = require('../src/groups');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let res;

  switch(queryParams['action']) {
      case 'createGroup': res = await createGroup({event, context, queryParams});break;
      case 'setDeafultGrp': res = await setDeafultGrp({queryParams, event, context});break;
      case 'getGroupDetails': res = await getGroupDetails({queryParams, event, context});break;
      case 'addMembersToGroup': res = null;break;
      default: null;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
    headers: {
        "access-control-allow-origin": "*",
      },
  };
}