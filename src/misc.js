const database = require('../firebase/admin');
const { getCountriesSearchResult } = require('./methods/utils');

const getCountriesQuery = ({queryParams, event, context}) => {
    const { query } = queryParams;
    const searchResults = getCountriesSearchResult(query);

    return searchResults;
}

module.exports = {
    getCountriesQuery
}