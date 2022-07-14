const ExpenseMethods = require('../src/expense');
const { DEFAULT_ERROR } = require('../src/constants');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let res;

  switch(queryParams['action']) {
      case 'addExpense': res = ExpenseMethods.addExpense(queryParams);break;
    //   case 'addMembersToGroup': res = null;break;
      default: res = DEFAULT_ERROR;
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
}