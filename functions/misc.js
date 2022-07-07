const { getCountriesQuery } = require('../src/misc');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let res;

  switch(queryParams['action']) {
      case 'countrySearchQuery': res = getCountriesQuery({event, context, queryParams});break;
    //   case 'addMembersToGroup': res = null;break;
      default: null;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
}