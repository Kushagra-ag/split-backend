const { calcNewExpense } = require('./methods/utils');

/**
 *  Method to add new expense to firebase
 *
 *  @param {string} date - The timestamp of the expense
 *  @param {string} grpId - The group id for the expense
 *  @param {number} amt - The expense amount
 *  @param {string} title - The expense title
 *  @param {string} desc - The expense description
 *  @param {array} cashFlowArr - The cashFlowArr array for the expense
 *  @param {object} relUserId - The relUserId object for the expense
 *  @param {object} usersPaid - The object containing people who paid for the expense
 *  @param {object} usersSplit - The object containing people among whom the expense would be split
 *  @param {string} type - Enum('standard', 'recurring')
 *  @param {string} uid - Current user uid
 *  @returns {(object | void)}
 */

const addExpense = async ({
    date = Date.now(),
    grpId,
    amt,
    cashFlowArr,
    relUserId,
    title,
    usersPaid,
    usersSplit,
    desc = '',
    type = 'standard',
    uId
}) => {
    cashFlowArr = JSON.parse(cashFlowArr);
    let paidBy = {},
        splitBet = {},
        distFlowArr = Array(cashFlowArr.length).fill(0),
        e;

    console.log('aa', cashFlowArr, cashFlowArr.length, distFlowArr);

    usersPaid.forEach(u => {
        console.log('df', relUserId[u._id], -parseFloat(u.val));
        paidBy[relUserId[u._id]] = parseFloat(u.val);
        distFlowArr[relUserId[u._id]] = -parseFloat(u.val);
    });

    usersSplit.forEach(u => {
        console.log('fd', relUserId[u._id], u.val);
        splitBet[relUserId[u._id]] = parseFloat(u.val);
        !distFlowArr[relUserId[u._id]] && (distFlowArr[relUserId[u._id]] = parseFloat(u.val));
    });

    console.log(paidBy, splitBet, distFlowArr);

    let exp = {
        sum: amt,
        paid_by: paidBy,
        between: splitBet
    };

    let involved = Array.from(new Set([...Object.keys(paidBy), ...Object.keys(splitBet)]));
    console.log('involved ppl - ', involved);

    const groupParams = calcNewExpense(exp, cashFlowArr);
    console.log('ab', groupParams);

    let members = {},
        arr = Object.keys(groupParams.indBalance);
    involved.forEach(person => {
        if (involved.indexOf(person) === -1) {
            return;
        }

        if (arr.indexOf(person) === -1) {
            members[person] = 'payee';
        } else {
            members[person] = 'receiver';
        }
    });

    console.log('involved ', members, date);
    const _id = nanoid();

    const newExpense = {
        ts: date,
        title,
        desc,
        type,
        amt,
        members,
        relUserId,
        distFlowArr: JSON.stringify(distFlowArr),
        bal: JSON.stringify(groupParams.indBalance)
    };

    let updates = {};
    updates[`/groups/${grpId}/cashFlowArr`] = JSON.stringify(groupParams.newCashFlowArr);
    updates[`/groups/${grpId}/balances`] = JSON.stringify(groupParams.grpBalance);
    updates[`/groups/${grpId}/netBal`] = firebase.database.ServerValue.increment(amt);
    updates[`/groups/${grpId}/lastActive`] = Date.now();
    updates[`/users/${uid}/lastActive`] = Date.now();
    updates[`/expenses/${grpId}/${_id}`] = newExpense;

    usersPaid.forEach(p => {
        updates[`/users/${p._id}/groups/${grpId}/amtSpent`] = firebase.database.ServerValue.increment(
            parseFloat(p.val)
        );
    });

    console.log('upd', updates);

    e = await database
        .ref()
        .update(updates)
        .then(() => ({error: false, msg: 'Expense added'}))
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return e;
};

module.exports = {
    addExpense
}