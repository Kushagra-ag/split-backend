const ExpenseMethods = require('../src/expenses');
const { DEFAULT_ERROR } = require('../src/constants');

exports.handler = async function (event, context) {
  const queryParams = JSON.parse(event.body);
  console.log('recd params', queryParams);
  let res;

  switch(queryParams['action']) {
      case 'addExpense': res = await ExpenseMethods.addExpense(queryParams);break;
      case 'deleteExpense': res = await ExpenseMethods.deleteExpense(queryParams);break;
      default: res = {...DEFAULT_ERROR, methodInvoked: `${event.path}/${queryParams.action}`};
  }

  console.log('response', res);
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
}