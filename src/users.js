const admin = require('../firebase/admin');
const {nanoid} = require('nanoid');
const { getUserCurrencyAndCountry, profileChecks } = require('./methods/utils');
const { syncFriendsLocal } = require('./methods/stateful');

const database = admin.database();

/**
 *	Method checks for existing users with same credentials, creates one if no user is found
 *	@param {array} userId - The uId of the current user
 *  @param {string} email - The email of the current user
 *	@returns {object}
 */

const signInUserCheck = async ({user}) => {

    const { uid, email, displayName, photoURL, phoneNumber } = user;
    const uId = uid;

    let e,
        userObj = {};

    e = await database
        .ref('/users')
        .orderByChild('email')
        .equalTo(email)
        .once('value')
        .then(async snap => {
            if (snap.exists()) {
                let existingUser = snap.val();
                const _id = Object.keys(existingUser)[0];
                existingUser = existingUser[_id];
                console.log(existingUser, existingUser.type, existingUser.type === 'guest');
                // guest user check
                if (existingUser.type === 'guest') {
                    const { guestTs, email, groups, contact, friends } = existingUser;
                    userObj = {
                        contact,
                        email,
                        groups,
                        friends,
                        guestTs
                    };

                    // delete existing User and changing user keys in existing groups

                    let updates = {},
                        oldGroups = existingUser.groups;
                    updates[`/users/${_id}`] = null;

                    Object.keys(groups).forEach(group => {
                        updates[`/groups/${group}/members/${_id}`] = null;
                        updates[`/groups/${group}/members/${uId}`] = true;
                        updates[`/groups/${group}/relUserId/${_id}`] = null;
                        updates[`/groups/${group}/relUserId/${uId}`] = oldGroups[group].relUserId;
                    });

                    console.log('key detected', _id, updates);
                    const e = await database
                        .ref()
                        .update(updates)
                        .catch({ error: true, msg: 'Please check your internet connection', e });

                    if (e?.error) return e;
                }

                userObj = {
                    ...userObj,
                    name: displayName,
                    type: 'standard',
                    country: countryCode,
                    photoURL: photoURL,
                    lastActive: Date.now(),
                    ts: Date.now()
                };
            } else {
                userObj = {
                    name: displayName,
                    type: 'standard',
                    email: email,
                    photoURL: photoURL,
                    contact: phoneNumber,
                    country: countryCode,
                    lastActive: Date.now(),
                    friends: [],
                    ts: Date.now()
                };
            }
        })
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    if (e?.error) return e;

    e = await database
        .ref(`/users/${uId}`)
        .update(userObj)
        .then(() => ({ error: false, msg: 'User signed in successfully'}))
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return e;

}

/**
 *  Method to get details of users in firebase
 *
 *  @param {array} users - Array of userIDs
 *  @returns {object}
 */

 const getUsers = async ({users = []}) => {
    let n = users.length,
        userInfo = [];

    while (n--) {
        const userId = users[n];

        const e = await database
            .ref(`/users/${userId}`)
            .once('value')
            .then(snap => {
                // const { name, photoURL, groups } = snap.val();
                const user = {
                    _id: userId,
                    ...snap.val()
                };
                userInfo = [...userInfo, user];
            })
            .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

        if (e?.error) return e;
    }

    return {error: false, userInfo};
};

/**
 *	Method to fetch user groups (sorted by lastActive) from firebase, returns empty array in case of no groups
 *
 *	@param {string} userId - Current userId
 *  @returns {array}
 */

 const getUserGroups = async ({uId}) => {
    if (!uId) return { error: true, msg: 'Invalid parameters', e: 'Invalid parameters' };

    const e = await database
        .ref(`/users/${uId}/groups`)
        .once('value')
        .then(async snap => {
            if (snap.exists()) {
                // snap = snap.val();
                // Array of group ids
                let groups = Object.keys(snap.val()),
                    data = [];
                let n = groups?.length;
                console.log('aaaaaa');
                if (!n) return [];

                while (n--) {
                    let grp = groups[n];

                    let r = await database
                        .ref(`/groups/${grp}`)
                        .once('value')
                        .then(details => {
                            details = details.val();
                            details.cashFlowArr = JSON.parse(details.cashFlowArr);
                            details._id = grp;
                            data.push(details);
                        })
                        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

                    if (r?.error) return r;
                }
                // sort data in order of the last active field
                data.sort((a, b) => b.lastActive - a.lastActive);
                return data;
            }

            return [];
        })
        .catch(e => ({ error: true, msg: 'Plllease check your internet connection', e }));

    return e;
};

/**
 *  Method to save custom user to firebase, checks if the user already exists as standard user, sends a guest user object if not
 *
 *  @param {string} passedUser - Object of the custom user
 *  @param {string} flag - Name of the custom user
 *  @return {object} Either the existing firebase user or the newly created guest user
 *  donee
 */

const checkNewGuestUser = async ({passedUser, flag = false}) => {
    if (!passedUser) return { error: true, msg: 'Invalid parameters', e: 'Invalid parameters' };

    const key = passedUser.email ? 'email' : 'contact';
    console.log('from checkNewGuestUser', key, passedUser);

    const passedUserVal = passedUser[key].toLowerCase();

    const u = await database
        .ref(`users`)
        .orderByChild(key)
        .equalTo(passedUserVal)
        .once('value')
        .then(async user => {
            user = user.val();
            console.log('resss', user);

            if (user) {
                const _id = Object.keys(user)[0];
                let existingUser = {
                    _id,
                    flag,
                    type: user[_id].type,
                    contact: user[_id].contact,
                    name: user[_id].name,
                    photoURL: user[_id].photoURL,
                    email: user[_id].email
                };
                return {user: existingUser};
            }

            const userId = nanoid();
            const newUser = {
                flag,
                _id: userId,
                type: 'guest',
                contact: key === 'contact' ? passedUser.contact : null,
                email: key === 'email' ? passedUser.email : null,
                name: passedUser.name,
                guestTs: Date.now(),
                // photoURL: null,
                newUser: true
            };
            return {user: newUser};
        })
        .catch(e => ({ error: true, user: null, msg: 'Please check your internet connection', e }));

    return u;
};

const syncUserFriends = async ({ uId }) => {
    const res = await syncFriendsLocal(uId);
    return res;
};

/**
 *  Method to update details of users in firebase
 *
 *  @param {string} userId - uid of current user
 *  @param {object} newUser - Object containing updated details of the user
 *  @param {array} updateFields - The fields that actually need to be updated
 *  @returns {(object|undefined)}
 */

const updateUserProfile = async ({userId, newUser, updateFields}) => {
    if (!userId || !newUser) return { error: true, msg: 'Invalid parameters', e: 'Invalid parameters' };

    if (newUser.email) newUser.email = newUser.email.toLowerCase();

    const fieldTests = profileChecks();
    let n = updateFields.length,
        updatedUser = {};
    while (n--) {
        let result,
            field = updateFields[n];
        switch (field) {
            case 'name':
                result = fieldTests.userNameCheck(newUser[field]);
                break;
            case 'email':
                result = fieldTests.userEmailCheck(newUser[field]);
                break;
            case 'country':
                result = fieldTests.userCountryCheck(newUser[field]);
                break;
        }
        console.log('rr', result);
        if (result?.error) {
            return result;
        }
        updatedUser = { ...updatedUser, [field]: newUser[field] };
    }
    console.log('from user methods', updatedUser);
    const e = await database
        .ref(`/users/${userId}`)
        .update(updatedUser)
        .then(() => ({error: false, msg: 'Successfully updated the profile'}))
        .catch(e => ({ error: true, msg: 'Please check your internet connection', e }));

    return e;
};

/**
 *	Method for generating the currency, country info for user according to their region, defaults to India
 *	@param {string} countryCode - Example - IN
 *  @param {string} currencyCode - Example - INR
 *	@returns {object}
 */

 const getGeoInfo = ({countryCode, currencyCode}) => {
    const geoInfo = getUserCurrencyAndCountry(countryCode, currencyCode);

    return geoInfo;
};

module.exports = {
    signInUserCheck,
    getUsers,
    getUserGroups,
    checkNewGuestUser,
    syncUserFriends,
    updateUserProfile,
    getGeoInfo
};