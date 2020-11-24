/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SparqlGen = angular.module('SparqlGen', []);

const SparqlGenService = function() {
  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

  const useGas = data => (data.limit !== 0) || (data.iterations !== 0) || (data.mode === 'undirected');

  var genSparqlClause = function(data, mode) {
    if (mode == null) { ({
      mode
    } = data); }
    if (mode === "both") {
      return `{ ${genSparqlClause(data, 'forward')} } UNION { ${genSparqlClause(data, 'reverse')} }`;
    } else if (!useGas(data)) {
      if (mode === "forward") { return `wd:${data.item} wdt:${data.property}* ?item`;
      } else if (mode === "reverse") { return `?item wdt:${data.property}* wd:${data.item}`; }
    } else {
      return `\
SERVICE gas:service {
    gas:program gas:gasClass "com.bigdata.rdf.graph.analytics.SSSP" ;
                gas:in wd:${data.item} ;
                gas:traversalDirection "${capitalize(mode)}" ;
                gas:out ?item ;
                gas:out1 ?depth ;${data.iterations === 0 ? "" :
                      `\n                gas:maxIterations ${data.iterations} ;`
                      }${data.limit === 0 ? "" :
                      `\n                gas:maxVisited ${data.limit} ;`
                      }
                gas:linkType wdt:${data.property} .
  }\
`;
    }
  };

  this.generate = function(data) {
    if (!data.item || !data.property) { return; }

    const out = useGas(data) ? "PREFIX gas: <http://www.bigdata.com/rdf/gas#>\n\n" : "";

    if (data.size_property) {
      return out +
      `\
SELECT ?item ?itemLabel ?linkTo ?size {
  { SELECT ?item (count(distinct ?element) as ?size) {
  ${genSparqlClause(data)}
  OPTIONAL { ?element wdt:${data.size_property}${data.size_recursive ? '*' : ''} ?item }
  } GROUP BY ?item }
  OPTIONAL { ?item wdt:${data.property} ?linkTo }
  SERVICE wikibase:label {bd:serviceParam wikibase:language "${data.lang}" }
}\
`;
    } else {
      return out +
      `\
SELECT ?item ?itemLabel ?linkTo {
  ${genSparqlClause(data)}
  OPTIONAL { ?item wdt:${data.property} ?linkTo }
  SERVICE wikibase:label {bd:serviceParam wikibase:language "${data.lang}" }
}\
`;
    }
  };

};

SparqlGenService.$inject = [];

SparqlGen.service('SparqlGenService', SparqlGenService);
