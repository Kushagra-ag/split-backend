const database = require('../firebase/admin');
// const 'react-native-get-random-values';
// const { Buffer } = require('buffer';
const {nanoid} = require('nanoid');
const { addUsersToGroup, updateFriendsData } = require('./methods/stateful');
const { splitEqual } = require('./methods/utils');

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
    queryParams, event, context
}) => {

    const {name, ownerId, users = [], newUsersData = [], defaultGrp = false, currency = '₹', status = 'active', noOfExp = 0, netBal = 0} = queryParams;

    if (!name || !ownerId) return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };
    if(!users.length) return { error: true, msg: 'No users are selected', e: 'Users array empty in createGroup'};

    const n = users.length;
    let e = null, defaults=null, defaultConfig = {};

    // Initializing an array of length n with zeroes
    const cashFlowArr = JSON.stringify(Array(n).fill(0));

    const grpId = nanoid(),
        ts = Date.now(),
        lastActive = ts,
        inviteLink = `https://unigma.page.link/group/join/${Buffer.from(grpId, 'utf8').toString('base64')}`;
    
    // configuring default split for each member
    defaults = splitEqual(users.map(u => ({_id: u})), 100);console.log(defaults);
    defaults.forEach(user => {
        defaultConfig[user._id] = user.val;
    });

    // Check default grp collision
    defaultGrp && (e = await setDeafultGrp(ownerId, grpId));
    if (e?.error) return e;
    console.log('afetr collision check', defaultGrp);

    let groupConfig = {
        name,
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
    let { fUpdates, fLocal, fErr } = await updateFriendsData(ownerId, updatedUsers, removeUserFriends);

    const finalUpdates = { ...updates, ...u, ...fUpdates };console.log('jjjj', fLocal)

    // Creating the group
    // e = await database
    //     .ref(`/groups/${grpId}`)
    //     .set(groupConfig)
    //     .then()
    //     .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    // if (e?.error) return e;

    console.log('before sec call- ', finalUpdates, groupConfig);
    // e = await database
    //     .ref()
    //     .update(finalUpdates)
    //     .then(() => console.log('sec call complete'))
    //     .catch(e => {
    //         console.log('errr', e);
    //         return { error: true, msg: 'Please check your internet connection', e };
    //     });

    // if (e?.error) return e;

    return {
        fLocal,
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

const setDeafultGrp = async ({queryParams, event, context}) => {

    const { userId, grpId, setDefault = true } = queryParams;

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

const getGroupDetails = async ({queryParams, event, context}) => {
    const { grpId } = queryParams;
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

module.exports = {
    createGroup,
    setDeafultGrp,
    getGroupDetails
}