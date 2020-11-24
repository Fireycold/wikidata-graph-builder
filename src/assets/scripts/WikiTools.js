/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const WikiTools = angular.module('WikiTools', []);

const WikiToolsService = function($log, $http, $httpParamSerializer) {
  const wdApiParams = $httpParamSerializer({
    format: 'json',
    formatversion: 2,
    callback: 'JSON_CALLBACK'
  });

  this.createApi = function(param1, param2) {
    if (!param2) { [param1, param2] = Array.from(['www', param1]); }
    return `https://${param1}.${param2}.org/w/api.php?${wdApiParams}`;
  };

  this.wikidata = this.createApi('wikidata');

  this.get = (api, params) => $http.jsonp(api, {params});

  this.searchEntities = (type, query, language) => {
    const params = {
      action: 'wbsearchentities',
      search: query,
      uselang: language,
      language,
      type,
      continue: 0
    };

    const success = response => response.data.search;
    const error = function(response) { $log.error('Request failed'); return reject('Request failed'); };
    return this.get(this.wikidata, params).then(success, error);
  };

  this.getEntity = (what, language) => {
    const params = {
      action: 'wbsearchentities',
      search: what,
      uselang: language,
      language,
      type: what.startsWith('Q') ? 'item' : 'property',
      limit: 1
    };

    const success = response => {
      if (!response.data.search) {
        return {id: what, label: what, lang: language};
      } else {
        const out = response.data.search[0];
        out.lang = language;
        return out;
      }
    };
    const error = function(response) { $log.error('Request failed'); return reject('Request failed'); };
    return this.get(this.wikidata, params).then(success, error);
  };

  this.wdqs = query => $http.get('https://query.wikidata.org/sparql', {params: {query}});

};

WikiToolsService.$inject = ['$log', '$http', '$httpParamSerializer'];

WikiTools.service('WikiToolsService', WikiToolsService);
