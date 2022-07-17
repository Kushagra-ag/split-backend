const { getCountriesQuery } = require('../src/misc');
const { DEFAULT_ERROR } = require('../src/constants');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let response;

  switch(queryParams['action']) {
      case 'countrySearchQuery': response = getCountriesQuery(queryParams);break;
    //   case 'addMembersToGroup': res = null;break;
      default: response = {...DEFAULT_ERROR, methodInvoked: `${event.path}/${queryParams.action}`};
  }

  console.log('response', response);
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
}