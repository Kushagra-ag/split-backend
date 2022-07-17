const admin = require('../firebase/admin');
// const 'react-native-get-random-values';
// const { Buffer } = require('buffer';
const {nanoid} = require('nanoid');
const { getUsers } = require('./users');
const { addUsersToGroup, updateFriendsData } = require('./methods/stateful');
const { splitEqual } = require('./methods/utils');

const database = admin.database();

/**
 *	Method to create a new group and add in firebase - Tasks performed - create group in firebase, check default group collision, update groups and friends attribute of each user
 *
 *	@param {string} name - The group name
 *  @param {string} ownerId - The user id of the group owner
 *  @param {array} users - The array of all group member ids (make sure to include the ownerId too)
 *  @param {object} defaults - The default configuration of splitting of expenses among grp members
 *  @param {boolean} defaultGrp - Whether to mark this grp as default grp
 *  @param {string} currency - Currency symbol of the default currency of the group
 *  @param {string} status - Enum('active', 'pending_deletion')
 *  @param {number} noOfExp - No of expenses
 *	@returns {(Object | void)}
 */

const createGroup = async ({
    name, desc = null, ownerId, users = [], newUsersData = [], defaultGrp = false, currency = '₹', status = 'active', noOfExp = 0, netBal = 0
}) => {

    if (!name || !ownerId) return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };
    if(!users.length) return { error: true, msg: 'No users are selected', e: 'Users array empty in createGroup'};

    const n = users.length;
    let e = null, defaults=null, defaultConfig = {};

    // Initializing an array of length n with zeroes
    const cashFlowArr = JSON.stringify(Array(n).fill(0));

    const grpId = nanoid(),
        ts = Date.now(),
        lastActive = ts,
        inviteLink = `${Buffer.from(grpId, 'utf8').toString('base64')}`;
    
    // configuring default split for each member
    defaults = splitEqual(users.map(u => ({_id: u})), 100);console.log(defaults);
    defaults.forEach(user => {
        defaultConfig[user._id] = user.val;
    });

    // Check default grp collision
    defaultGrp && (e = await setDeafultGrp({userId: ownerId, grpId}));
    if (e?.error) return e;
    console.log('afetr collision check', defaultGrp);

    let groupConfig = {
        name,
        desc,
        ownerId,
        status,
        defaultConfig,
        noOfExp,
        netBal,
        ts,
        lastActive,
        cashFlowArr,
        inviteLink,
        cur: currency
    };

    let updates = {};
    updates[`/users/${ownerId}/owned_grps/${grpId}`] = true;

    // Update the user object with current grp and vice-versa
    let { u, updatedUsers, removeUserFriends, err } = await addUsersToGroup(users, newUsersData, grpId);
    console.log('updated users', updatedUsers);
    console.log('remove users', removeUserFriends);
    if (err?.error) return err;

    //Generate rel user id and members object
    updatedUsers.forEach((_, i) => {
        updates[`/groups/${grpId}/relUserId/${_}`] = i;
        updates[`/users/${_}/groups/${grpId}/relUserId`] = i;
        updates[`/users/${_}/groups/${grpId}/amtSpent`] = 0;
        // if(!defaults?._) {
        //     defaults[_] = parseFloat((100/n).toFixed(2));
        // }
    });

    // Update the friends attribute
    let { fUpdates, fLocalNew, fErr } = await updateFriendsData(ownerId, updatedUsers, removeUserFriends);

    const finalUpdates = { ...updates, ...u, ...fUpdates };

    // Creating the group
    e = await database
        .ref(`/groups/${grpId}`)
        .set(groupConfig)
        .then()
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    if (e?.error) return e;

    console.log('before sec call- ', finalUpdates, groupConfig);
    e = await database
        .ref()
        .update(finalUpdates)
        .then(() => console.log('sec call complete'))
        .catch(e => {
            console.log('errr', e);
            return { error: true, msg: 'Please check your internet connection', e };
        });

    if (e?.error) return e;

    return {
        fLocalNew,
        _id: grpId
    };
};

/**
 *  Method to set or unset a default group for the user
 *
 *  @param {string} userId - The array of all user ids to be added to the group
 *  @param {string} grpId - The group id
 *  @param {boolean} setDefault - Flag indicating to set or unset a default group for the user
 *  @returns {(object | void)}
 */

const setDeafultGrp = async ({userId, grpId, setDefault = true}) => {
    if (!userId || !grpId) return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };

    let u = await database
        .ref(`/users/${userId}/defaultGrp`)
        .once('value')
        .then(async snap => {
            if (setDefault || (!setDefault && snap.exists())) {
                snap = snap.val();

                let updates = {};
                updates[`/users/${userId}/defaultGrp`] = setDefault ? grpId : null;
                updates[`/groups/${grpId}/defaultGrp/${userId}`] = setDefault ? true : null;
                snap && (updates[`/groups/${snap}/defaultGrp/${userId}`] = null);

                console.log(updates);

                let r = await database
                    .ref()
                    .update(updates)
                    .then(() => console.log('hohoho'))
                    .catch(e => {
                        console.log(e);
                        return { error: true, msg: 'Please check your internet connection', e };
                    });
                return r;
            }
            return { error: true, msg: 'No default group set!', e: 'No default group set!' };
        })
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return u;
};

/**
 *  Method to fetch group details of a particular group
 *
 *  @param {string} grpId - The group id
 *  @returns {(object | void)}
 */

const getGroupDetails = async ({ grpId }) => {
    if (!grpId) return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };

    const group = await database
        .ref(`/groups/${grpId}`)
        .once('value')
        .then(grp => {
            if (grp.exists()) {
                // console.log('grrp', grp);
                grp = grp.val();
                grp._id = grpId;
                return grp;
            }
            return { error: true, msg: "The group doesn't exist", e: `The group ${grpId} doesn't exist` };
        })
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return group;
};

/**
 *  Method to add users in a particular group in firebase, also performs duplicate check
 *
 *  @param {array} users - User ids of users to be added to the group
 *  @param {string} uId - The user's uid
 *  @param {object} newUsersData - Basic info of new (non-existing) users, if any
 *  @param {string} grpId - The group id
 *  @returns {(object | void)}
 */

const addGroupMembers = async ({ users, uId, newUsersData, grpId }) => {
    if (!users || !uId || !grpId)
        return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };

    let n = users.length;

    if (n === 0) return { error: true, msg: 'No users detected', e: 'Users array empty' };

    console.log('in addmembers - methods/groups.js');
    const e = await database
        .ref(`/groups/${grpId}`)
        .once('value')
        .then(async snap => {
            if (snap.exists()) {
                snap = snap.val();
                const relUserId = snap.relUserId,
                    existingMembersId = Object.keys(relUserId);

                let cashFlowArr = JSON.parse(snap.cashFlowArr),
                    i = cashFlowArr.length,
                    updates = {};

                let { u, updatedUsers, removeUserFriends, err } = await addUsersToGroup(users, newUsersData, grpId);
                console.log('uuu', updatedUsers);
                if (err) return err;

                while (n--) {
                    let userId = updatedUsers[n];

                    // duplicate member check
                    if (existingMembersId.indexOf(userId) !== -1) {
                        console.log('duplicate detected', userId);
                        continue;
                    }

                    updates[`/groups/${grpId}/relUserId/${userId}`] = i;
                    // updates[`/groups/${grpId}/members/${userId}`] = true;
                    updates[`/users/${userId}/groups/${grpId}/relUserId`] = i;
                    i = i + 1;

                    // update the friend list
                    let { fUpdates, fErr } = await updateFriendsData(
                        userId,
                        Array.from(new Set([uId, ...updatedUsers, ...existingMembersId])),
                        removeUserFriends
                    );
                    console.log('from friend func - ', fUpdates, fErr);
                    updates = { ...updates, ...u, ...fUpdates };
                    // console.log(updates);
                }
                console.log('af loop', i, cashFlowArr.length);
                // No user was added
                if (cashFlowArr.length === i) return {error: false, e: 'No unique members found'};

                cashFlowArr.push(...Array(i - cashFlowArr.length).fill(0));

                updates[`/groups/${grpId}/cashFlowArr`] = JSON.stringify(cashFlowArr);
                updates[`/groups/${grpId}/lastActive`] = Date.now();

                let res = await database
                    .ref()
                    .update(updates)
                    .then(() => ({error: false, e: 'No unique members found'}))
                    .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

                return res;
            }

            return { error: true, msg: 'Please check your internet connection', e: `The group ${grpId} doesn't exist` };
        })
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return e;
};

/**
 *  Method to remove user from a particular group in firebase
 *
 *  @param {string} userId - The user's uid
 *  @param {string} grpId - The group id
 *  @returns {object}
 */

const removeGroupMember = async ({userId, grpId}) => {
    if (!userId || !grpId) return { error: true, msg: 'Invalid parameters', e: 'Invalid parameters' };

    const e = await database
        .ref(`/groups/${grpId}`)
        .once('value')
        .then(async snap => {
            if (snap.exists()) {
                snap = snap.val();
                const relIdUser = snap.relUserId[userId],
                    cashFlowArr = JSON.parse(snap.cashFlowArr);

                if(relIdUser === undefined) return { error: true, msg: 'The user is not part of the group' };

                if (cashFlowArr[relIdUser] != 0) return { error: true, msg: 'The user is not settled up' };

                // cashFlowArr.splice(relIdUser, 1);

                // for(let o in snap.relUserId) {
                //     if(snap.relUserId[o] > relIdUser) {
                //         snap.relUserId[o] -= 1;
                //     }
                // }

                let updates = {};

                updates[`/groups/${grpId}/relUserId/${userId}`] = null;
                updates[`/groups/${grpId}/defaultGrp/${userId}`] = null;
                // updates[`/groups/${grpId}/cashFlowArr`] = JSON.stringify(cashFlowArr);
                updates[`/groups/${grpId}/members/${userId}`] = null;
                updates[`/users/${userId}/groups/${grpId}`] = null;
                updates[`/users/${userId}/defaultGrp/${grpId}`] = null;

                // updates[`/groups/${grpId}/lastActive`] = Date.now();
                console.log(updates);

                const r = await database
                    .ref()
                    .update(updates)
                    .then(() => ({error: false, msg: 'User successfully removed'}))
                    .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

                return r;
            } else return { error: true, msg: 'Some unexpected error occured', e: `The group ${grpId} doesn't exist` };
        })
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return e;
};

/**
 *  Method to fetch joining info of a particular group from firebase
 *
 *  @param {string} encodedGrpId - The user's uid (base64 encoded)
 *  @param {string} userId - The user's uid
 *  @returns {object}
 */

 const joinGroupInfo = async ({encodedGrpId, userId}) => {
    if (!encodedGrpId) return { error: true, msg: 'Invalid parameters', e: 'Invalid parameters' };

    const grpId = Buffer.from(encodedGrpId, 'base64').toString('utf8');
    console.log('decoded id- ', grpId);

    const grp = await getGroupDetails({grpId});
    if (grp?.error) {
        return { error: true, msg: 'Invalid link', e: 'Invalid link code' };
    }
    console.log('dc', grp);
    if (Object.keys(grp.members).indexOf(userId) !== -1) {
        return { error: false, msg: 'The user is already added to the group', e: 'Already a member', _id: grpId };
    }

    let users = await getUsers({users: Object.keys(grp.members)});
    
    if (users?.error) {
        console.log(users);
        return { error: true, msg: 'Please check your internet connection', e };
    }

    users = users.userInfo;

    console.log('before cmn friends loop', users);

    return { ...grp, grpMembers: users };
};

/**
 *  Method to delete a group from firebase
 *
 *  @param {string} grpId - The group id
 *  @returns {object}
 */

 const deleteGroup = async ({grpId}) => {
    if (!grpId) return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };

    const e = await database
        .ref(`/groups/${grpId}`)
        .once('value')
        .then(async snap => {
            if (snap.exists()) {
                snap = snap.val();
                let users = Object.keys(snap.members),
                    updates = {};
                const defaultUsers = snap.defaultGrp ? Object.keys(snap.defaultGrp) : [];

                // removing the group from all relevant user objects
                users.forEach(async userId => {
                    updates[`/users/${userId}/groups/${grpId}`] = null;

                    if (defaultUsers.indexOf(userId) !== -1) {
                        updates[`/users/${userId}/defaultGrp`] = null;
                    }
                });

                // removing the group and expense object itself
                updates[`/groups/${grpId}`] = null;
                updates[`/expenses/${grpId}`] = null;

                const e = await database
                    .ref()
                    .update(updates)
                    .then(() => ({error: false, msg: 'Group successfully deleted'}))
                    .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

                return e;
            }
        })
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return e;
};

module.exports = {
    createGroup,
    setDeafultGrp,
    getGroupDetails,
    addGroupMembers,
    removeGroupMember,
    joinGroupInfo,
    deleteGroup
}