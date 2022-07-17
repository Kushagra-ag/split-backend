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

/**
 *  Method to return the country search results
 *
 *  @param {string} query - The query string to match the results
 *  @returns {array} - The matching country objects
 */

const getCountriesSearchResult = (query) => {
    const filteredCountries = Object.values(Geo.country).filter(country => country.name.toLowerCase().includes(query.toLowerCase()));
    return filteredCountries;
}

/**
 *  Method to return various profile field values checks
 *
 *  @returns {object} - Test methods for each user profile field
 */

const profileChecks = () => {
    const userNameCheck = name => {
        name = name.trim();
        if (!name) return { error: true, msg: 'Name is empty', e: 'User name field is null' };

        /**
         * String length should be between 3 and 50 (inclusive)
         * String should only contain uppercase alphabets, lowercase alphabets and spaces
         */

        const match = name.match(/^[a-zA-Z\x20]{3,50}$/);
        if (!match) return { error: true, msg: 'Name format is invalid', e: 'User name field format is invalid' };
    };

    const userEmailCheck = email => {
        email = email.trim();
        if (!email) return { error: true, msg: 'Email is empty', e: 'User email field is null' };

        /**
         * String should be in valid email format
         */

        const match = email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);
        if (!match) return { error: true, msg: 'Email format is invalid', e: 'User email field format is invalid' };
    };
    // @todo
    const userCountryCheck = country => {};

    return { userNameCheck, userEmailCheck, userCountryCheck };
};

/**
 *  Method to return various group field values checks
 *
 *  @returns {object} - Test methods for each user group field
 */

const groupChecks = () => {
    const grpNameCheck = name => {
        name = name.trim();
        if (!name) return { error: true, msg: 'Name is empty', e: 'User name field is null' };

        /**
         * String length should be between 1 and 50 (inclusive)
         * String should only contain uppercase alphabets, lowercase alphabets, numbers, underscore, hyphen, decimal and spaces
         */

        const match = name.match(/^[a-zA-Z0-9-_.\x20]{1,50}$/);
        if (!match) return { error: true, msg: 'Name format is invalid', e: 'Group name field format is invalid' };
    };

    const grpDescCheck = desc => {
        desc = desc.trim();
        if (!desc) desc = null;

        /**
         * String length should be between 0 and 80 (inclusive)
         * String should only contain uppercase alphabets, lowercase alphabets, numbers, underscore, hyphen, decimal and spaces
         */

        const match = desc.match(/^[a-zA-Z0-9-_.\x20]{0,80}$/);
        if (desc && !match)
            return {
                error: true,
                msg: 'Description format is invalid',
                e: 'Group description field format is invalid'
            };
    };

    return { grpNameCheck, grpDescCheck };
};

/**
 *  Method to return various group field values checks
 *
 *  @returns {object} - Test methods for each user group field
 */

const expenseChecks = () => {
    const expNameCheck = name => {
        name = name.trim();
        if (!name) return { error: true, msg: 'Name is empty', e: 'Expense name field is null' };

        /**
         * String length should be between 1 and 50 (inclusive)
         * String should only contain uppercase alphabets, lowercase alphabets, numbers, underscore, hyphen, decimal and spaces
         */

        const match = name.match(/^[a-zA-Z0-9-_.\x20]{1,50}$/);
        if (!match) return { error: true, msg: 'Name format is invalid', e: 'Expense name field format is invalid' };
    };

    const grpDescCheck = desc => {
        desc = desc.trim();
        if (!desc) desc = null;

        /**
         * String length should be between 0 and 80 (inclusive)
         * String should only contain uppercase alphabets, lowercase alphabets, numbers, underscore, hyphen, decimal and spaces
         */

        const match = desc.match(/^[a-zA-Z0-9-_.\x20]{0,80}$/);
        if (desc && !match)
            return {
                error: true,
                msg: 'Description format is invalid',
                e: 'Group description field format is invalid'
            };
    };

    // @to-review
    const expDateCheck = timestamp => {
        const newTs = (new Date(timestamp)).getTime();
        if(newTs <= 0 || isNaN(newTs) || !isFinite(newTs)) {
            return { error: true, msg: 'Date value format is invalid', e: 'Expense date timestamp is incorrect'};
        }
    }

    return { expNameCheck, grpDescCheck, expDateCheck };
};

// Add expense related utilities

/**
 *  Method to find minimum of 2 numbers
 *
 *  @param {number} x - Number 1
 *  @param {number} y - Number 2
 *  @returns {number}
 */
// not exported
const minOf2 = (x, y) => {
    return x < y ? x : y;
}

/**
 *  Method that calculates the balance object for a transaction
 *
 *  @param {number} bal - The initial balance object
 *  @param {array} cfa - The exisiting cashFlowArr array
 *  @returns {void}
 */
// not exported
const finalBal = (bal, cfa) => {
    let mxCredit = cfa.indexOf(Math.max(...cfa)),
        mxDebit = cfa.indexOf(Math.min(...cfa));

    if (cfa[mxCredit] == 0 && cfa[mxDebit] == 0) {
        console.log('settled!');
        console.log(bal);
        return;
    }

    let min = parseFloat(minOf2(-cfa[mxDebit], cfa[mxCredit]).toFixed(2));

    cfa[mxCredit] -= min;
    cfa[mxDebit] += min;

    cfa[mxCredit] = parseFloat(cfa[mxCredit].toFixed(2));
    cfa[mxDebit] = parseFloat(cfa[mxDebit].toFixed(2));

    console.log('Person', mxDebit, 'pays', min, ' to Person ', mxCredit);

    bal[mxDebit] ? null : (bal[mxDebit] = {});
    bal[mxDebit][mxCredit] = min;

    finalBal(bal, cfa);
};

/**
 *  Method that calculates the final cashFlowArr after the expense
 *
 *  @param {object} tx - The transaction object
 *  @param {array} cfa - The exisiting cashFlowArr array
 *  @returns {object} - The updated cashFlowArr, updated group balance object and expense balance object
 */

const calcNewExpense = (tx, cfa) => {
    let expenseArr = Array(cfa.length).fill(0);

    cfa.forEach((val, idx) => {
        if (tx.between[idx]) {
            cfa[idx] -= parseFloat(tx.between[idx].toFixed(2));
            expenseArr[idx] -= parseFloat(tx.between[idx].toFixed(2));
        }

        if (tx.paid_by[idx]) {
            cfa[idx] += parseFloat(tx.paid_by[idx].toFixed(2));
            expenseArr[idx] += parseFloat(tx.paid_by[idx].toFixed(2));
        }
    });

    let newCashFlowArr = [...cfa];

    let grpBalance, indBalance;
    finalBal((grpBalance = {}), cfa);
    finalBal((indBalance = {}), expenseArr);

    newCashFlowArr = newCashFlowArr.map(item => {
        return parseFloat(item.toFixed(2));
    });

    console.log('from addTx- ', grpBalance); // Adjacency list
    return { newCashFlowArr, grpBalance, indBalance };
};


const addNullTx = cashFlowArr => {
    const nullTx = {
        sum: 0,
        paid_by: {},
        between: {}
    };

    return calcNewExpense(nullTx, cashFlowArr);
};

module.exports = {
    parseQueryParams,
    splitEqual,
    sanitizeObject,
    getUserCurrencyAndCountry,
    getCountriesSearchResult,
    profileChecks,
    groupChecks,
    expenseChecks,
    calcNewExpense,
    addNullTx
}