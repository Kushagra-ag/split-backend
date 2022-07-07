const database = require('../firebase/admin');
const { getUserCurrencyAndCountry } = require('./methods/utils');

const getGeoInfo = ({queryParams, event, context}) => {
    
    const {countryCode, currencyCode} = queryParams;
    const geoInfo = getUserCurrencyAndCountry(countryCode, currencyCode);

    return geoInfo;
};

module.exports = {
    getGeoInfo
};