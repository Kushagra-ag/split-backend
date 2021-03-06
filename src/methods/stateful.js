const admin = require('../../firebase/admin');
const { checkNewGuestUser } = require('../users');

const database = admin.database();

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

            const passedUser = {
                name: newUsersData[k].name,
                contact: newUsersData[k].contact,
                email: newUsersData[k].email
            };

            !newUsersData[k].flag &&
                (newUser = await checkNewGuestUser({passedUser}));
            console.log('nn', newUser);

            const finalUser = newUser?.user || newUsersData[k];
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

const updateFriendsData = async (ownerId, users, removeUsers = ['V7xHkXGwdZE5PYqoVdehr']) => {

    let n = users.length,
        fData = [],
        fUpdates = {};
    let i = n,
        f, fLocalNew,
        fErr;
    console.log(users, n);
    while (n--) {
        let j = users[n];
        // console.log('inside while', j);

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

    console.log('fdata ', fData);
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
        console.log('crt user ', j);
        console.log('k user friends', fData[k].friends);
        f = fData.filter((member, idx) => member._id !== j && fData[k].friends?.indexOf(member._id) === -1);
        console.log('unique fraands', f);

        if (f.length > 0) {
            // Array.from(new Set([...fData[k].friends, ...f]))
            if(j === ownerId) {
                fLocalNew = f;
                fLocalNew.forEach(v => delete v.friends);
            }
            f = fData[k].friends.concat(f.map(f => f._id));

            console.log('merged fraands', f);

            f = JSON.stringify(f);
            fUpdates[`/users/${j}/friends`] = f;
        }
    }

    console.log('before additional loop ', fUpdates);

    return { fUpdates, fLocalNew, fErr };
};

/**
 *  Method to sync the user's friend list locally from the firebase
 *
 *  @param {string} uId - The user id of the current user
 *  @returns
 */

const syncFriendsLocal = uId => {
    console.log('in misc');

    let fData = [];

    const e = database
        .ref(`/users/${uId}/friends`)
        .once('value')
        .then(async f => {
            f = JSON.parse(f.val());
            console.log(f);
            if (f && f.length > 0) {
                let n = f.length;

                while (n--) {
                    const friend = f[n];

                    await database
                        .ref(`/users/${friend}`)
                        .once('value')
                        .then(u => {
                            if (u.exists()) {
                                u = u.val();
                                const { photoURL, name, contact, email } = u;

                                fData.push({
                                    photoURL,
                                    name,
                                    contact,
                                    email,
                                    _id: friend
                                });
                            }
                        })
                        .catch(e => ({ error: false, e}));
                }

                console.log('signin fdata ', fData);

                const item = {
                    key: 'userFriends',
                    value: fData
                };

                return { error: false, item };
                // setItemLocal(item);
            } else {
                const item = {
                    key: 'userFriends',
                    value: []
                };
                return { error: false, item };
            }
        })
        .catch(e => ({ error: false, e}))

    return e;
};

module.exports = {
    addUsersToGroup,
    updateFriendsData,
    syncFriendsLocal
}