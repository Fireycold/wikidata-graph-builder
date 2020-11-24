// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const FormCtrl = function($scope, $log, $location, $rootScope, $mdToast, $mdDialog, WikiToolsService, SparqlGenService) {
  let key, value;
  this.modes = {
    forward: 'Forward',
    reverse: 'Reverse',
    both: 'Bidirectional',
    undirected: 'Undirected',
    wdqs: 'WDQS'
  };

  const fields = {
    property: { type: 'property'
  },
    item: { type: 'item'
  },
    lang: { type: 'lang', default: 'en'
  },
    iterations: { type: 'number', default: 0
  },
    limit: { type: 'number', default: 0
  },
    mode: { type: 'enum', values: this.modes, default: 'forward', extractor(params) { return params.mode || params.direction; }
  },
    wdqs: { type: 'text'
  },
    size_property: { type: 'property'
  },
    size_recursive: { type: 'boolean'
  },
    size_log_scale: { type: 'boolean'
  }
  };

  const getDataFromUrl = function() {
    const params = $location.search();
    const data = {};

    for (let field in fields) {
      var spec = fields[field];
      var param = spec.extractor ? spec.extractor(params) : params[field];
      data[field] = (() => { switch (spec.type) {
        case 'property': if (/^P\d+$/.test(param || '')) { return param; } else { return spec.default; }
        case 'item': if (/^Q\d+$/.test(param || '')) { return param; } else { return spec.default; }
        case 'lang': if (/^[a-z-]{2,}$/.test(param || '')) { return param; } else { return spec.default; }
        case 'number': if (/^\d+$/.test(param || '')) { return parseInt(param); } else { return spec.default; }
        case 'text': return param || spec.default;
        case 'enum': if (spec.values[param]) { return param; } else { return spec.default; }
        case 'boolean': return [1, true, '1', 'true'].includes(param);
      } })();
    }

    if (!data.wdqs) { data.wdqs = SparqlGenService.generate(data); }
    return data;
  };

  const dynamicFields = ((() => {
    const result = [];
    for (key in fields) {
      value = fields[key];
      if (['item', 'property'].includes(value.type)) {
        result.push(key);
      }
    }
    return result;
  })());

  dynamicFields.forEach(ob => {
    return $scope.$watch((() => this[ob]), name => {
      if (!name) { return this[ob + 'Object'] = (this[ob + 'Text'] = undefined); }
      return WikiToolsService.getEntity(name, this.lang).then(result => { return this[ob + 'Object'] = result; });
    });
  });

  $scope.$watch((() => this.lang), lang => {
    if (!lang) { return; }
    return dynamicFields.forEach(name => {
      const obname = name + 'Object';
      if (this[obname] && (this[obname].lang !== lang)) {
        this[obname].lang = lang;
        return WikiToolsService.getEntity(this[obname].id, lang).then(result => { if (this[obname].lang === lang) { return this[obname] = result; } });
      }
    });
  });

  const rebuildFromUrl = () => {
    const data = getDataFromUrl();
    for (key in data) {
      value = data[key];
      this[key] = value;
      if (!value && ['item', 'property'].includes(fields[key].type)) { this[key + 'Object'] = (this[key + 'Text'] = undefined); }
    }
    if (!this.validate()) { this.graphData = undefined; }
    if (data.wdqs) { regenSvg(data); }
  };

  $rootScope.$on('$locationChangeSuccess', rebuildFromUrl);

  this.itemSearch = function(query) { return WikiToolsService.searchEntities('item', query, this.lang); };
  this.propertySearch = function(query) { return WikiToolsService.searchEntities('property', query, this.lang); };
  this.reset = () => $location.search({});
  this.validate = function() { return ((this.mode === 'wdqs') && this.wdqs) || ((this.mode !== 'wdqs') && this.lang && this.itemObject && this.propertyObject); };

  this.submit = function() {
    const data = {};

    if (this.mode === 'wdqs') {
      data.mode = 'wdqs';
      data.wdqs = this.wdqs;
    } else {
      for (let field in fields) {
        const spec = fields[field];
        if (field !== 'wdqs') {
          if (['item', 'property'].includes(spec.type)) {
            data[field] = __guard__(this[field + 'Object'], x => x.id) || spec.default;
          } else if (spec.type === 'boolean') {
            if (this[field] !== !!spec.default) { data[field] = ~~this[field]; }
          } else {
            if (this[field] !== spec.default) { data[field] = this[field]; }
          }
        }
      }
    }

    if (JSON.stringify($location.search()) === JSON.stringify(data)) { return rebuildFromUrl(); } else { return $location.search(data); }
  };

  const errorToast = function(message, more) {
    let toast = $mdToast.simple().textContent(message).hideDelay(5000);
    if (more) {
      toast.action('More info').highlightAction(true);
    }
    return toast = $mdToast.show(toast).then(response => {
      if (more && (response === 'ok')) {
        const tpl = angular.element("<md-dialog />")
                     .attr('aria-label', message)
                     .append(angular.element("<pre />").text(more));
        return $mdDialog.show({
          clickOutsideToClose: true,
          template: tpl[0].outerHTML
        });
      }
    });
  };

  var regenSvg = data => {
    const query = data.wdqs;
    const start_time = new Date().getTime();

    const insertSuccess = response => {
      this.isLoading = false;
      this.activeItem = data.item;
      return this.graphData = response.data;
    };

    const insertError = response => {
      this.isLoading = false;
      $log.error('unable to process answer', response.data);
      const request_time = new Date().getTime() - start_time;
      if (request_time < (10*1000)) {
        errorToast('Something is wrong with SPARQL query syntax', response.data);
      } else {
        errorToast('SPARQL query times out');
      }
    };

    this.isLoading = true;
    WikiToolsService.wdqs(query).then(insertSuccess, insertError);

    this.showSvg = true;
  };

  this.query = function() {
    const data = getDataFromUrl();
    window.open('https://query.wikidata.org/#' + encodeURIComponent(data.wdqs));
  };

  this.svg = function() {
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString($('svg')[0]);
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    window.open(url);
  };

  this.list = function() {
    const data = getDataFromUrl();
    let url = `https://tools.wmflabs.org/wikidata-todo/tree.html?q=${data.item.slice(1)}`;
    if (['reverse', 'both'].includes(data.mode)) { url += `&rp=${data.property.slice(1)}`; }
    if (['forward', 'both'].includes(data.mode)) { url += `&p=${data.property.slice(1)}`; }
    if (data.iterations !== 0) { url += `&depth=${data.iterations}`; }
    if (data.lang !== 'en') { url += `&lang=${data.lang}`; }
    window.open(url);
  };
};

FormCtrl.$inject = [
  '$scope', '$log', '$location', '$rootScope', '$mdToast', '$mdDialog', 'WikiToolsService', 'SparqlGenService'
];

const app = angular.module('WgbApp', ['ngMaterial', 'WikiTools', 'Graph', 'SparqlGen']);

app.config(['$locationProvider', function($locationProvider) {
  $locationProvider.html5Mode({enabled: true, requireBase: false});
}
]);

app.controller('FormCtrl', FormCtrl);

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}