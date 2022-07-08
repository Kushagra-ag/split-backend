const database = require('../firebase/admin');
const { getUserCurrencyAndCountry } = require('./methods/utils');

const getGeoInfo = ({queryParams, event, context}) => {
    
    const {countryCode, currencyCode} = queryParams;
    const geoInfo = getUserCurrencyAndCountry(countryCode, currencyCode);

    return geoInfo;
};

/**
 *  Method to save custom user to firebase, checks if the user already exists as standard user, sends a guest user object if not
 *
 *  @param {string} contact - Contact of the custom user
 *  @param {string} name - Name of the custom user
 *  @return {object} Either the existing firebase user or the newly created guest user
 *  donee
 */

 const checkNewGuestUser = async ({queryParams, event, context}) => {
     const { passedUser, flag = false } = queryParams;
    if (!passedUser) return { error: true, msg: 'Invalid parameters', e: 'Invalid parameters' };

    const key = passedUser.email ? 'email' : 'contact';
    console.log('from checkNewGuestUser', key, passedUser);

    const u = await database
        .ref(`users`)
        .orderByChild(key)
        .equalTo(passedUser[key])
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
                return existingUser;
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
            return newUser;
        })
        .catch(e => {
            console.log('errrr', e);
            return null;
        });

    return u;
};

module.exports = {
    getGeoInfo,
    checkNewGuestUser
};