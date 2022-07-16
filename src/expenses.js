const {nanoid} = require('nanoid');
const admin = require('../firebase/admin');
const { calcNewExpense, addNullTx } = require('./methods/utils');

const database = admin.database();

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
 *  @returns {object}
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
    updates[`/groups/${grpId}/netBal`] = admin.database.ServerValue.increment(amt);
    updates[`/groups/${grpId}/lastActive`] = Date.now();
    updates[`/users/${uId}/lastActive`] = Date.now();
    updates[`/expenses/${grpId}/${_id}`] = newExpense;

    usersPaid.forEach(p => {
        updates[`/users/${p._id}/groups/${grpId}/amtSpent`] = admin.database.ServerValue.increment(
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

/**
 *  Method to delete expense
 *
 *  @param {string} grpId - The group id for the expense
 *  @param {string} expId - The expense Id
 *  @returns {object}
 */

const deleteExpense = async ({grpId, expId, uId}) => {
    let grpBal,
        expBal,
        cashFlowArr,
        expAmt,
        relUserId,
        updates = {};

    const res = await database
        .ref(`/groups/${grpId}`)
        .once('value')
        .then(async snap => {
            snap = snap.val();
            grpBal = JSON.parse(snap.balances);
            cashFlowArr = JSON.parse(snap.cashFlowArr);
            relUserId = snap.relUserId;
            
            const expRes = await database
                .ref(`/expenses/${grpId}/${expId}`)
                .once('value')
                .then(async snap => {
                    snap = snap.val();
                    console.log('ss', snap.distFlowArr, typeof(snap.distFlowArr));
                    const distFlowArr = JSON.parse(snap.distFlowArr);
                    expBal = JSON.parse(snap.bal);
                    expAmt = snap.amt;
                    console.log('after ss');

                    for (let payee in expBal) {
                        for (let rec in expBal[payee]) {
                            console.log('rec- ', rec, ' payee- ', payee);

                            // Calculating updated amtSpent
                            // const _id = Object.keys(relUserId).find(id => relUserId[id] == rec);
                            // if (!amtSpentArr[`/users/${_id}/groups/${grpId}/amtSpent`]) amtSpentArr[`/users/${_id}/groups/${grpId}/amtSpent`] = 0;
                            // amtSpentArr[`/users/${_id}/groups/${grpId}/amtSpent`] -= expBal[payee][rec];
                            // console.log('amtSpentArr', amtSpentArr);

                            let amtPrev = grpBal[payee] && grpBal[payee][rec] ? grpBal[payee][rec] : 0,
                                amtNet;
                            console.log('amtPrev ', amtPrev);

                            amtNet = amtPrev - expBal[payee][rec];
                            console.log('amtNett ', amtNet);

                            grpBal[payee] = grpBal[payee] ? grpBal[payee] : {};
                            grpBal[payee][rec] = amtNet;

                            // let amtNet = amtPrev - expBal[rec][payee];
                            // console.log('amtNet ', amtNet);
                            // grpBal[payee][rec] = amtNet;

                            // Updating the cashflowarr array
                            cashFlowArr[payee] = parseFloat((cashFlowArr[payee] + expBal[payee][rec]).toFixed(2));
                            cashFlowArr[rec] = parseFloat((cashFlowArr[rec] - expBal[payee][rec]).toFixed(2));

                            if (amtNet == 0) {
                                console.log('deleted');
                                delete grpBal[payee][rec];
                            } else if (amtNet < 0) {
                                console.log('deleted!');
                                delete grpBal[payee][rec];

                                grpBal[rec] = grpBal[rec] ? grpBal[rec] : {};
                                grpBal[rec][payee] = -amtNet;
                            }
                        }
                    }

                    distFlowArr.forEach((amount, idx) => {
                        const _id = Object.keys(relUserId).find(id => relUserId[id] == idx);
                        if (amount < 0) {
                            updates[`/users/${_id}/groups/${grpId}/amtSpent`] =
                                admin.database.ServerValue.increment(amount);
                        }
                    });

                    console.log('after del', grpBal, cashFlowArr, distFlowArr);

                    // A null tx to optimize the distribution further (if possible)
                    const groupParams = addNullTx(cashFlowArr);

                    updates[`/groups/${grpId}/cashFlowArr`] = JSON.stringify(groupParams.newCashFlowArr);
                    updates[`/groups/${grpId}/balances`] = JSON.stringify(groupParams.grpBalance);
                    updates[`/groups/${grpId}/netBal`] = admin.database.ServerValue.increment(-expAmt);
                    updates[`/users/${uId}/groups/${grpId}/amtSpent`] = admin.database.ServerValue.increment(
                        -expAmt
                    );
                    updates[`/groups/${grpId}/lastActive`] = Date.now();
                    updates[`/users/${uId}/lastActive`] = Date.now();
                    updates[`/expenses/${grpId}/${expId}`] = null;

                    // let netSum = 0;
                    // Object.keys(amtSpentArr).forEach(key => {
                    //     netSum += amtSpentArr[key];
                    //     updates[key] = admin.database.ServerValue.increment(amtSpentArr[key]);
                    // });

                    // netSum = -netSum;

                    // if(netSum != expAmt) {
                    //     updates[`/users/${uId}/groups/${grpId}/amtSpent`] = admin.database.ServerValue.increment((amtSpentArr[`/users/${uId}/groups/${grpId}/amtSpent`] || 0) - parseFloat((expAmt - netSum).toFixed(2)))
                    // }

                    console.log(updates);

                    const e = await database
                        .ref()
                        .update(updates)
                        .then(() => {console.log('Updated!'); return { error: false, msg: 'Expense deleted' };})
                        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

                    return e;
                })
                .catch(e => {
                    console.log('err from deleteExpense inner ', e);
                    return { error: true, msg: 'Please check your internet connection', e };
                });

            return expRes;
        })
        .catch(e => {
            console.log('err from deleteExpense outer ', e);
            return { error: true, msg: 'Please check your internet connection', e };
        });

    return res;
};

module.exports = {
    addExpense,
    deleteExpense
}