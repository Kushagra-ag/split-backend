import { getGeoInfo } from "../../src/users";

export const handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  let res;

  switch(queryParams['action']) {
      case 'getGeoInfo': res = await getGeoInfo({event, context, queryParams});break;
    //   case 'addMembersToGroup': res = null;break;
      default: null;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
};