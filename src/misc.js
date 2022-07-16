const admin = require('../firebase/admin');
const { getCountriesSearchResult } = require('./methods/utils');

const database = admin.database();

const getCountriesQuery = (queryParams) => {
    const { query } = queryParams;
    const searchResults = getCountriesSearchResult(query);

    return searchResults;
}

module.exports = {
    getCountriesQuery
}