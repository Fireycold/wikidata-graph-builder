// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const itemLabel = el => (el.itemLabel != null ? el.itemLabel.value : undefined) ||
                    __guard__(el.item.value.match("^http://www\.wikidata\.org/entity/(.+)$"), x => x[1]) ||
                    el.item.value;

const prepareData = function(data) {
  let el;
  const hasSize = Array.from(data.head.vars).includes("size");

  const {
    bindings
  } = data.results;
  let minSize = Infinity;
  let maxSize = 0;

  const nodes = {};
  if (hasSize) {
    for (el of Array.from(bindings)) {
      if (nodes[el.item.value]) { continue; }
      const size = parseInt(el.size.value);
      if (size < minSize) { minSize = size; }
      if (size > maxSize) { maxSize = size; }

      nodes[el.item.value] = {
        name: itemLabel(el),
        url: el.item.value,
        hasLink: !!el.linkTo,
        size
      };
    }
  } else {
    for (el of Array.from(bindings)) {
      nodes[el.item.value] = {
        name: itemLabel(el),
        url: el.item.value,
        hasLink: !!el.linkTo
      };
    }
  }

  const links = ((() => {
    const result = [];
    for (el of Array.from(bindings)) {       if (nodes[el.linkTo != null ? el.linkTo.value : undefined]) {
        result.push({source: nodes[el.item.value], target: nodes[el.linkTo.value]});
      }
    }
    return result;
  })());

  return {hasSize, nodes, links, minSize, maxSize};
};

const insertData = function(graph, data, activeItem, mode, sizeLogScale) {
  let height, tooltipFn;
  graph.selectAll("*").remove();
  d3.selectAll("#graph-tooltip").remove();

  if (!data || !data.head) { return; }

  const {hasSize, nodes, links, minSize, maxSize} = prepareData(data);

  if (hasSize) {
    let radscaler;
    const useLogScale = sizeLogScale;
    const scaleRange = [3, 20];
    if (useLogScale) {
      radscaler = d3.scale.log().clamp(true).domain([Math.max(1e-12, minSize), Math.max(1e-12, maxSize)]).range(scaleRange);
    } else {
      radscaler = d3.scale.linear().domain([minSize, maxSize]).range(scaleRange);
    }

    for (let nodeid in nodes) {
      const node = nodes[nodeid];
      node.radius = radscaler(node.size);
    }
  }

  const svg = graph.append('svg').attr({xmlns: "http://www.w3.org/2000/svg", xlink: "http://www.w3.org/1999/xlink"});
  const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  const transform = d => `translate(${d.x},${d.y})`;

  const useGroups = false;

  const tick = function(e) {
    if (useGroups) {
      let group;
      const groups = {};

      circle.each(function(d) {
        const group = d.name.toLowerCase() > 'k';
        if (!groups[group]) { groups[group] = {x: 0.0, y: 0.0, s: 0}; }
        groups[group].x += d.x;
        groups[group].y += d.y;
        groups[group].s++;
      });

      for (group in groups) {
        const ob = groups[group];
        groups[group].x /= groups[group].s;
        groups[group].y /= groups[group].s;
      }

      const k = 6 * e.alpha;
      circle.each(function(d) {
        group = d.name.toLowerCase()  > 'k';
        d.x = (d.x * (1 - k)) + (groups[group].x * k);
        d.y = (d.y * (1 - k)) + (groups[group].y * k);

        if (d.x < 0) { d.x += -d.x*k; }
        if (d.x > width) { d.x -= (d.x - width)*k; }
        if (d.y < 0) { d.y += -d.y*k; }
        if (d.y > height) { d.y -= (d.y - height)*k; }
      });
    }

    if (hasSize) {
      const length = ({x, y}) => Math.sqrt((x*x) + (y*y));
      const sum = ({x:x1, y:y1}, {x:x2, y:y2}) => ({
        x: x1+x2,
        y: y1+y2
      });
      const diff = ({x:x1, y:y1}, {x:x2, y:y2}) => ({
        x: x1-x2,
        y: y1-y2
      });
      const prod = ({x, y}, scalar) => ({
        x: x*scalar,
        y: y*scalar
      });
      const div = ({x, y}, scalar) => ({
        x: x/scalar,
        y: y/scalar
      });
      const scale = (vector, scalar) => prod(vector, scalar / length(vector));

      line
      .each(function(d) {
        const {source, target} = d;
        if ((source.x === target.x) && (source.y === target.y)) {
          d.sp = source;
          d.tp  = target;
          return;
        }
        const dvec = diff(target, source);
        d.sp = sum(source, scale(dvec, source.radius));
        d.tp  = diff(target, scale(dvec, target.radius));

        }).attr({
        x1({sp}) { return sp.x; },
        y1({sp}) { return sp.y; },
        x2({tp}) { return tp.x; },
        y2({tp}) { return tp.y; }
      });
    } else {
      line.attr({
        x1({source}) { return source.x; },
        y1({source}) { return source.y; },
        x2({target}) { return target.x; },
        y2({target}) { return target.y; }
      });
    }

    circle.attr({transform});
    text.attr({transform});
  };

  const zoomed = function() {
    container.attr('transform', `translate(${d3.event.translate})scale(${d3.event.scale})`);
  };

  const zoom = d3.behavior.zoom().on('zoom', zoomed);
  const force = d3.layout.force();
  const drag = force.drag().on("dragstart", function() { d3.event.sourceEvent.stopPropagation(); });

  const linkDistance = useGroups ? 1 : 30;
  const charge = useGroups ? -5000 : -200;
  const gravity = useGroups ? .05 : .05;

  force.nodes(d3.values(nodes)).links(links)
       .linkDistance(linkDistance).charge(charge).gravity(gravity)
       .on('tick', tick).start();

  svg.attr("pointer-events", "all");
  svg.selectAll('*').remove();

  const arrowOffset = hasSize ? 0 : 6;

  svg.append('defs').selectAll('marker').data(['direction']).enter()
     .append('marker').attr({
      id(d) { return d; }, viewBox: "0 -5 10 10", refX: (10 + arrowOffset) - 1,
      markerWidth: 6, markerHeight: 6, orient: 'auto'})
     .append('path').attr({d: 'M0,-5L10,0L0,5'});

  const svg_group = svg.append("g").attr("transform", "translate(0,0)").call(zoom);

  const drag_rect = svg_group.append("rect")
            .style("fill", "none");

  var container = svg_group.append("g");

  var line = container.append('g').selectAll('line').data(force.links()).enter()
            .append('line').attr({'marker-end': 'url(#direction)'});

  const radius = hasSize ? (d => d.radius) : 6;

  var circle = container.append('g').selectAll('circle').data(force.nodes()).enter()
  .append('circle').attr({r: radius, cx(d) { return d.x; }, cy(d) { return d.y; }});

  if (hasSize) {
    tooltipFn = d => `${d.name}<br/>Size: ${d.size}`;
  } else {
    tooltipFn = d => d.name;
  }

  if (hasSize) {
    circle
    .on("mouseover", function(d) {
      tooltip.transition().duration(100).style("opacity", .9);
      return tooltip.html(tooltipFn(d))
      .style("left", (d3.event.pageX + 5) + "px")
      .style("top", (d3.event.pageY + 5) + "px");
  }).on("mouseout", d => tooltip.transition().duration(200).style("opacity", 0));
  }


  if (mode === 'undirected') {
    circle.classed('linked', o => o.hasLink);
  }

  circle.classed('active', o => o.url.endsWith(activeItem));
  circle.call(drag);

  var text = container.append('g').selectAll('text').data(force.nodes()).enter()
            .append('text').attr({x: 8, y: '.31em'})
            .text(d => d.name).on('click', function(o) { window.open(o.url); });

  var width = (height = 0);

  const resize = function() {
    // sidenavWidth = document.getElementsByTagName('md-sidenav')[0].offsetWidth
    const sidenavWidth = 300;
    width = window.innerWidth - sidenavWidth;
    height = window.innerHeight;
    svg.attr({width, height});
    drag_rect.attr({width, height});
    force.size([width, height]).resume();
  };

  resize();
  d3.select(window).on('resize', resize);
};

const app = angular.module('Graph', []);

app.directive('graph', () => ({
  restrict: 'E',
  replace: false,

  scope: {
    graphData: '=',
    activeItem: '=',
    mode: '=',
    sizeLogScale: '='
  },

  link(scope, element, attrs) {
    scope.$watch('graphData', function(newValue, oldValue) {
      const graph = d3.select(element[0]);
      return insertData(graph, scope.graphData, scope.activeItem, scope.mode, scope.sizeLogScale);
    });
  }
}));

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}