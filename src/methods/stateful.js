const database = require('../../firebase/admin');
const { checkNewGuestUser } = require('../users');

/**
 *	Method to add new guest users, existing users to group and vice-versa in firebase
 *
 *	@param {array} users - The array of all user ids to be added to the group
 *  @param {string} grpId - The group id
 *	@returns {object} An object containing the updated user ids list and calculated updates
 */

const addUsersToGroup = async (users, newUsersData = [], grpId) => {
    if (!users || !grpId) return { error: true, msg: 'Could not complete your request', e: 'Invalid parameters' };

    let u = {},
        updatedUsers = [...users],
        removeUserFriends = [],
        n = users.length,
        k,
        err,
        newUser;
    const newUsers = newUsersData.map(m => m._id);
    // console.log(newUsers)
    console.log('newUsersData', newUsersData);
    while (n--) {
        newUser = null;
        let userId = users[n];
        if (newUsers.indexOf(userId) !== -1) {
            newUsersData.forEach((v, idx) => {
                if (v._id === userId) k = idx;
            });
            console.log('contact detected', userId, newUsersData[k]);

            !newUsersData[k].flag &&
                (newUser = await checkNewGuestUser({queryParams: {
                    name: newUsersData[k].name,
                    contact: newUsersData[k].contact,
                    email: newUsersData[k].email
                }}));
            console.log('nn', newUser);

            const finalUser = newUser.user || newUsersData[k];
            const _id = finalUser._id;
            delete finalUser._id;

            if (finalUser.type === 'friend') removeUserFriends.push(newUsersData[k]._id);

            finalUser.newUser &&
                (err = await database
                    .ref(`/users/${_id}`)
                    .update({
                        friends: '[]',
                        ...finalUser,
                        newUser: null,
                        flag: null
                    })
                    .then(res => console.log('contact added!', res))
                    .catch(e => ({ error: true, msg: 'Please check your internet connection', e })));

            userId = _id;
            updatedUsers.splice(n, 1, _id);
        }
        console.log('userId--', userId);
        // u[`/users/${userId}/groups/${grpId}`] = true;
        u[`/groups/${grpId}/members/${userId}`] = true;
    }

    return { u, updatedUsers, removeUserFriends, err };
};

/**
 *  Method to update each user's unique friends, return the object of local updates and subsequent updates in firebase
 *
 *  @param {string} ownerId - The user id of the group owner
 *  @param {array} users - The array of all group member ids (make sure to include the ownerId too)
 *  @param {array} removeUsers - The array of obsolete ids that need to be removed from user's friend list
 *  @returns {object} Object of subsequent updates
 */

const updateFriendsData = async (ownerId, users, removeUsers = []) => {
    // removeItemLocal('userFriends');
    let n = users.length,
        fData = [],
        fUpdates = {};
    let i = n,
        f, fLocal,
        fErr;
    console.log(users, n);
    while (n--) {
        let j = users[n];
        console.log('inside while', j, users[n]);

        fErr = await database
            .ref(`/users/${j}`)
            .once('value')
            .then(snap => {
                if(snap.exists()) {
                    snap = snap.val();

                    // console.log('tt', snap.friends);
                    fData.push({
                        _id: j,
                        type: snap.type,
                        name: snap.name,
                        photoURL: snap.photoURL,
                        email: snap.email,
                        contact: snap.contact,
                        friends: JSON.parse(snap.friends || '[]')
                    });
                }
            })
            .catch(e => ({ e, msg: 'Cannot find user friends' }));
    }
    if (fErr) return { fUpdates: {}, fErr };

    // console.log('fdata ', fData);
    while (i--) {
        let j = users[i],
            k;
        fData.forEach((d, idx) => {
            if (d._id === j) k = idx;
        });

        // remove obsolete userIds
        if (j === ownerId && removeUsers.length > 0) {
            fData[k].friends.forEach((m, i) => {
                if (removeUsers.indexOf(m) !== -1) {
                    console.log('removed friend-', m);
                    fData[k].friends.splice(i, 1);
                }
            });
        }
        // console.log('crt user ', j);
        // console.log('k user friends', fData[k].friends);
        f = fData.filter((member, idx) => member._id !== j && fData[k].friends?.indexOf(member._id) === -1);
        // console.log('unique fraands', f);

        if (f.length > 0) {
            let originalFriends = fData.filter(m => fData[k].friends.indexOf(m._id) !== -1);
            f = [...originalFriends, ...f];

            // console.log('merged fraands', f);

            // f.forEach(v => delete v.friends);

            fUpdates[`/users/${j}/friends`] = f;
        }
    }

    console.log('before additional loop ', fUpdates);

    for (let update in fUpdates) {
        fLocal = fUpdates[update];

        if (update.includes(ownerId)) {
            fLocal.forEach(v => delete v.friends);
            // setItemLocal({
            //     key: 'userFriends',
            //     value: fr
            // });
        }

        let idArr = fLocal.map(u => u._id);
        idArr = JSON.stringify(idArr);
        fUpdates[update] = idArr;
    }

    console.log('are now friends deleted? ', fUpdates, fErr);

    return { fUpdates, fLocal, fErr };
};

module.exports = {
    addUsersToGroup,
    updateFriendsData
}