const Geo = require('../geo');

const parseQueryParams = (s) => {
    let o = {};
    s.split('&').forEach(header => {
        header = header.split('=');
        o[header[0]] = header[1];
    });

    return o;
}

/**
 *  Method to split the cost equally among the given users
 *
 *  @param {boolean} addAll - Flag to indicate whether to add all users
 *  @returns {array} - The updated array or object
 */

const splitEqual = (users, amt) => {
    
    let u = [...users],
        n = u.length, config = {};
    // console.log('users - ', users, 'members - ', members)
    const share = parseFloat(amt / n).toFixed(2);

    u.forEach(user => {
        user.val = share;
    });
    
    const diff = (parseFloat(share) * n).toFixed(2) - amt;
    console.log(diff.toFixed(2));

    if (diff) {
        if (diff > 0) {
            let k = parseInt((parseFloat(diff) * 100).toFixed(2));

            while (k--) {
                u[k].val = (parseFloat(u[k].val) - 0.01).toFixed(2);
            }
        } else if (diff < 0) {
            let k = -parseInt((parseFloat(diff) * 100).toFixed(2));

            while (k--) {
                u[k].val = (parseFloat(u[k].val) + 0.01).toFixed(2);
            }
        }
    }
    return u;
};

/**
 *  Method to sanitize a JSON object
 *
 *  @param {(object|void)} o - Array or object to be sanitized
 *  @returns {(object|void)} - The updated array or object
 */

const sanitizeObject = o => {
    const isArr = Array.isArray(o);
    console.log(isArr);
    let _o = isArr ? [...o] : { ...o };

    if (isArr) {
        _o = _o.map(e => parseFloat(e.toFixed(2)));
    } else {
        for (let i in _o) {
            let u = _o[i];
            for (let j in u) {
                console.log(u[j]);

                if (u[j] != 0) {
                    u[j] = parseFloat(u[j].toFixed(2));
                } else {
                    delete u[j];
                }
            }
            if (!Object.keys(u).length) {
                delete _o[i];
                break;
            }
        }
    }
    return _o;
};

/**
 *  Method to return the country and currency info of the user
 *
 *  @param {string} countryCode - The 2 digit country code of the user
 *  @param {string} currencyCode - The currency code of the user
 *  @returns {object} - The geo info of the user
 */

const getUserCurrencyAndCountry = (countryCode, currencyCode) => {
    const geo = {
        ...Geo.country[countryCode],
        currency: currencyCode,
        currencySymbol: Geo.currency[currencyCode]
    };
    return geo;
}

const getCountriesSearchResult = (query) => {
    const filteredCountries = Object.values(Geo.country).filter(country => country.name.toLowerCase().includes(query.toLowerCase()));
    return filteredCountries;
}

module.exports = {
    parseQueryParams,
    splitEqual,
    sanitizeObject,
    getUserCurrencyAndCountry,
    getCountriesSearchResult
}