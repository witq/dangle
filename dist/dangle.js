/*! dangle - v1.0.0 - 2013-12-15
* http://www.fullscale.co/dangle
* Copyright (c) 2013 FullScale Labs, LLC; Licensed MIT */

angular.module('dangle', []);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsArea', [function() {
        'use strict';

        return {
            restrict: 'E',

            // set up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:     '=',
                width:       '=',
                height:      '=',
                bind:        '=',
                label:       '@',
                field:       '@',
                duration:    '@',
                delay:       '@',
                plot:        '@',
                pointRadius: '@' 
            },

            link: function(scope, element, attrs) {

                var margin = {
                    top: 20, 
                    right: 20, 
                    bottom: 30, 
                    left: 80
                };

                // default width/height - mainly to create initial aspect ratio
                var width = scope.width || 1280;
                var height = scope.height || 300;

                // are we using interpolation
                var interpolate = attrs.interpolate || 'false';

                var label = attrs.label || 'Frequency';
                var klass = attrs.class || '';

                // add margins (make room for x,y labels)
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                // create x,y sclaes (x is inferred as time)
                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                // create x,y axis 
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                // create line generator 
                var line = d3.svg.line()
                    .x(function(d) { return x(d.time); })
                    .y(function(d) { return y(d.count); });

                // create area generator
                var area = d3.svg.area()
                    .x(function(d) { return x(d.time); })
                    .y0(height)
                    .y1(function(d) { return y(d.count); });

                // enable interpolation if specified 
                if (attrs.interpolate == 'true') {
                    line.interpolate('monotone');
                    area.interpolate('monotone');
                }

                // create the root SVG node
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                // generate the area. Data is empty at link time
                svg.append('path')
                    .datum([])
                    .attr('class', 'area fill ' + klass)
                    .attr('d', area);

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'area x axis ' + klass)
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'area y axis ' + klass)
                    .call(yAxis)
                        .append('text')
                            .attr('transform', 'rotate(-90)')
                            .attr('y', 6)
                            .attr('dy', '.71em')
                            .style('text-anchor', 'end')
                            .text(label);

                // generate the line. Data is empty at link time
                svg.append('path')
                    .datum([])
                    .attr('class', 'area line ' + klass)
                    .attr("d", line);


                // main observer fn called when scope is updated. Data and scope vars are now bound
                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var dataPoints = scope.plot || 'true';
                    var pointRadius = scope.pointRadius || 8;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();

                    // just because scope is bound doesn't imply we have data.
                    if (data) {

                        // pull the data array from the facet
                        data = data.entries || [];

                        // use that data to build valid x,y ranges
                        x.domain(d3.extent(data, function(d) { return d.time; }));
                        y.domain([0, d3.max(data, function(d) { return d.count; })]);

                        // create the transition 
                        var t = svg.transition().duration(duration);

                        // feed the current data to our area/line generators
                        t.select('.area').attr('d', area(data));
                        t.select('.line').attr('d', line(data));

                        // does the user want data points to be plotted
                        if (dataPoints == 'true') {

                            // create svg circle for each data point
                            // using Math.random as (optional) key fn ensures old
                            // data values are flushed and all new values inserted
                            var points = svg.selectAll('circle')
                                .data(data.filter(function(d) { 
                                    return d.count; 
                                }), function(d) { 
                                    return Math.random(); 
                                });

                            // d3 enter fn binds each new value to a circle 
                            points.enter()
                                .append('circle')
                                    .attr('class', 'area line points ' + klass)
                                    .attr('cursor', 'pointer')
                                    .attr("cx", line.x())
                                    .attr("cy", line.y())
                                    .style("opacity", 0)
                                    .transition()
                                        .duration(duration)
                                        .style("opacity", 1)
                                        .attr("cx", line.x())
                                        .attr("cy", line.y())
                                        .attr("r", pointRadius);

                            // wire up any events (registers filter callback)
                            points.on('mousedown', function(d) { 
                                scope.$apply(function() {
                                    (scope.onClick || angular.noop)(field, d.time);
                                });
                            });

                            // d3 exit/remove flushes old values (removes old circles)
                            points.exit().remove();
                        }

                        // update our x,y axis based on new data values
                        t.select('.x').call(xAxis);
                        t.select('.y').call(yAxis);

                    }
                }, true)
            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsBar', [function() {
        'user strict';

        return {
            restrict: 'E',

            // set up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:  '=',
                width:    '=',
                height:   '=',
                bind:     '=',
                duration: '@'
            },
			link: function(scope, element, attrs) {

                var margin = {
                    top: 10, 
                    right: 10, 
                    bottom: 10, 
                    left: 10
                };

                var width = scope.width || 300;
                var height = scope.height || 1020;
                
                // add margin
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                var klass = attrs.class || '';
                var align = attrs.align || 'left';

                var viewAlign = align === 'right' ? 'xMaxYMin' : 'xMinYMin';

                var x = d3.scale.linear()
                    .range([0, width]);

                var y = d3.scale.ordinal()
                    .rangeBands([0, height], .1);

                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', viewAlign + ' meet')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();

                    if (data) {

                        // pull the data array from the facet 
                        data = data.terms || [];

                        x.domain([0, d3.max(data, function(d) { return d.count; })*2]);
                        y.domain(data.map(function(d) { return d.term; }));

                        // random key here?
                        var bars = svg.selectAll('rect')
                            .data(data, function(d) { return Math.random(); });

                        // d3 enter fn binds each new value to a rect
                        bars.enter()
                            .append('rect')
                                .attr('class', 'bar rect ' + klass)
                                .attr('cursor', 'pointer')
                                .attr('y', function(d) { return y(d.term); })
                                .attr('height', y.rangeBand())
                                .attr('x', function(d) { 
                                    if (align === 'right') {
                                        return width;
                                    } else {
                                        return 0; 
                                    }
                                }) // added
                                .transition()
                                    .duration(duration)
                                        .attr('width', function(d) { return x(d.count); })
                                        .attr('x', function(d) { 
                                            if (align === 'right') {
                                                return width - x(d.count);
                                            } else {
                                                return 0;
                                            }
                                        });

                        // wire up event listeners - (registers filter callback)
                        bars.on('mousedown', function(d) {
                            scope.$apply(function() {
                                (scope.onClick || angular.noop)(field, d.term);
                            });
                        });

                        // d3 exit/remove flushes old values (removes old rects)
                        bars.exit().remove();

                        var labels = svg.selectAll("text")
                            .data(data, function(d) { return Math.random(); });

                        labels.enter()
                            .append('text')
                                .attr('class', 'bar text ' + klass)
                                .attr('cursor', 'pointer')
                                .attr('y', function(d) { return y(d.term) + y.rangeBand() / 2; })
                                .attr('x', function(d) { 
                                    if (align === 'right') {
                                        return width - x(d.count) - 3;
                                    } else {
                                        return x(d.count) + 3;
                                    }
                                })
                                .attr('dy', '.35em')
                                .attr('text-anchor', function(d) {
                                    if (align === 'right') {
                                        return 'end';
                                    } else {
                                        return 'start';
                                    }
                                })

                                .text(function(d) { 
                                    if (align === 'right') {
                                        return '(' + d.count + ') ' + d.term;
                                    } else {
                                        return d.term + ' (' + d.count + ')';
                                    }
                                });

                        // wire up event listeners - (registers filter callback)
                        labels.on('mousedown', function(d) {
                            scope.$apply(function() {
                                (scope.onClick || angular.noop)(field, d.term);
                            });
                        });

                        // d3 exit/remove flushes old values (removes old rects)
                        labels.exit().remove();
                    }
                })
            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsColumn', [function() {
        'use strict';

        return {
			restrict: 'E',

            // set up the isolate scope so that we don't clobber parent scope
            scope: {
                fontSize: '=',
                onClick: '=',
                width: '=',
                height: '=',
                bind: '='
            },
			link: function(scope, element, attrs) {

                var margin = {top:20, right: 20, bottom: 30, left: 40};
                var width = scope.width || 960;
                var height = scope.height || 500;
                var color = attrs.color || 'steelblue';
                var fontColor = attrs.fontColor || '#000';
                var fontSize = scope.fontSize || 14;
                var label = attrs.label || 'Frequency';

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                var x = d3.scale.ordinal()
                    .rangeRoundBands([0, width], .1);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin meet')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                scope.$watch('bind', function(data) {

                    if (data) {
                        data = data.terms || [];
                        svg.selectAll('*').remove();

                        x.domain(data.map(function(d) { return d.term; }));
                        y.domain([0, d3.max(data, function(d) { return d.count; })]);

                        svg.append('g')
                            .attr('fill', fontColor)
                            .attr('font-size', fontSize)
                            .attr('class', 'x axis')
                            .attr('transform', 'translate(0,' + height + ')')
                            .call(xAxis);

                        svg.append('g')
                            .attr('class', 'y axis')
                            .attr('font-size', fontSize)
                            .attr('fill', fontColor)
                            .call(yAxis)
                            .append('text')
                                .attr('transform', 'rotate(-90)')
                                .attr('y', 6)
                                .attr('dy', '.51em')
                                .style('text-anchor', 'end')
                                .text(label);

                        svg.selectAll('.bar')
                            .data(data)
                            .enter()
                                .append('rect')
                                    .attr('fill', color)
                                    .attr('x', function(d) { return x(d.term); })
                                    .attr('width', x.rangeBand())
                                    .attr('y', function(d) { return y(d.count); })
                                    .attr('height', function(d) { return height - y(d.count); })
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                        (scope.onClick || angular.noop)(attrs.field, d.term);
                                    });
                                });
                    }
                })
            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsCombo', [function() {
        'use strict';

        return {
            restrict: 'E', 

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:   '=',
                width:     '=',
                height:    '=',
                bind:      '=',
                label:     '@',
                field:     '@',
                duration:  '@',
                delay:     '@',
                interval:  '@'
            },

            // angular directives return a link fn
            link: function(scope, element, attrs) {

                var margin = {
                    top:20, 
                    right: 20, 
                    bottom: 30, 
                    left: 80
                };

                // default width/height - mainly to create initial aspect ratio
                var width = scope.width || 1280;
                var height = scope.height || 300;

                var label = attrs.label || '';
                var klass = attrs.class || '';

                // add margin (make room for x,y labels)
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;
                
                var x0 = d3.scale.ordinal()
                    .rangeRoundBands([0, width], 0.1);
                 
                var x1 = d3.scale.ordinal()
                    .rangeRoundBands([0, width], 0.1);;
                 
                var y = d3.scale.linear()
                    .range([height, 0]);

                // create x,y axis
                var xAxis = d3.svg.axis()
                    .scale(x0)
                    .orient('bottom')
                    .tickFormat(function(date) {
                        return new Date(date).getDate();
                    });

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left')
                    .tickFormat(d3.format(".2s"));

                var color = d3.scale.ordinal()
                    .range(["#800000", "#bf0000", "#008000", "#00bf00", "#000080", "#0000bf"]);

                // create the root svg node
                var svg = d3.select(element[0])
                    .append('svg')
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                // create bars root
                var barRoot = svg.append('g');

                // create line generator 
                var line = d3.svg.line()
                    .x(function(d) { return x0(d.time) + 1.7 * x1.rangeBand() })
                    .y(function(d) { return y(d.line1); })
                    .interpolate('monotone');

                // create line generator 
                var line2 = d3.svg.line()
                    .x(function(d) { return x0(d.time) + 1.7 * x1.rangeBand() })
                    .y(function(d) { return y(d.line2); });

                // generate the line. Data is empty at link time
                svg.insert('path')
                    .attr('class', 'line1')
                    .datum([])
                    .attr("d", line)
                    .style('fill', 'none')
                    .style('stroke-width', 2)
                    .style('stroke', '#fbc900')
                    .style("stroke-dasharray", ("2, 2"));

                // generate the line. Data is empty at link time
                svg.insert('path')
                    .attr('class', 'line2')
                    .datum([])
                    .attr("d", line2)
                    .style('fill', 'none')
                    .style('stroke-width', 2)
                    .style('stroke', '#fbc900');

                var yBegin;

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'histo x axis ' + klass)
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                // insert the y axis (no data yet)
                svg.append('g')
                    .attr('class', 'histo y axis ' + klass)
                    .call(yAxis);


                // mainer observer fn called when scope is updated. Data and scope vars are npw bound
                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();
                    var interval = scope.interval || 'day';

                    // just because scope is bound doesn't imply we have data
                    if (data) {

                        // read from data, which columns should be stacked
                        var innerColumns =  data.stacks;

                        data = data.entries || [];

                        var columnHeaders = d3.keys(data[0]).filter(function(key) {
                            return key.indexOf("bar") >= 0;
                        });

                        color.domain(d3.keys(data[0]).filter(function(key) {
                            return key.indexOf("bar") >= 0;
                        }));

                        data.forEach(function(d) {
                            var yColumn = [];
                            d.columnDetails = columnHeaders.map(function(name) {
                                for (var ic in innerColumns) {
                                    if($.inArray(name, innerColumns[ic]) >= 0){
                                        if (!yColumn[ic]){
                                            yColumn[ic] = 0;
                                        }
                                        yBegin = yColumn[ic];
                                        yColumn[ic] += +d[name];
                                        return {name: name, column: ic, yBegin: yBegin, yEnd: +d[name] + yBegin,};
                                    }
                                }
                            });
                            d.total = d3.max(d.columnDetails, function(d) { 
                                return d.yEnd; 
                            });
                        });

                        // recalculate the x and y domains based on the new data.
                        x0.domain(data.map(function(d) { return d.time; }));
                        x1.domain(d3.keys(innerColumns)).rangeRoundBands([0, x0.rangeBand()]);
                        y.domain([0, d3.max(data, function(d) { return d.total; })]);

                        // clear the existing groups
                        svg.selectAll(".group").data([]).exit().remove();

                        var project_stackedbar = barRoot.selectAll(".project_stackedbar")
                            .data(data)
                                .enter().append("g")
                                    .attr("class", "group")
                                    .attr("transform", function(d) { return "translate(" + x0(d.time) + ",0)"; });

                        project_stackedbar.selectAll("rect")
                            .data(function(d) { return d.columnDetails; })
                                .enter().append("rect")
                                    .attr("class", "bar")
                                    .attr("width", x1.rangeBand())
                                    .attr("x", function(d) { 
                                        return x1(d.column);
                                    })
                                    .attr("y", function(d) { 
                                        return y(d.yEnd); 
                                    })
                                    .attr("height", function(d) { 
                                        return y(d.yBegin) - y(d.yEnd); 
                                    })
                                    .style("fill", function(d) { return color(d.name); })
                                    .style("stroke", "#000")
                                    .style("shape-rendering", "crispEdges");


                        svg.select('.line1').attr('d', line(data));
                        svg.select('.line2').attr('d', line2(data));

                        // update our x,y axis based on new data values
                        svg.select('.x').call(xAxis);
                        svg.select('.y').call(yAxis);
                    }
                }, true)
            }
        };
    }]);


/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsDateHisto', [function() {
        'use strict';

        return {
            restrict: 'E', 

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                onClick:   '=',
                width:     '=',
                height:    '=',
                bind:      '=',
                label:     '@',
                field:     '@',
                duration:  '@',
                delay:     '@',
                interval:  '@'
            },

            // angular directives return a link fn
            link: function(scope, element, attrs) {

                var margin = {
                    top:20, 
                    right: 20, 
                    bottom: 30, 
                    left: 80
                };

                // default width/height - mainly to create initial aspect ratio
                var width = scope.width || 1280;
                var height = scope.height || 300;

                var label = attrs.label || 'Frequency';
                var klass = attrs.class || '';

                // add margin (make room for x,y labels)
                width = width - margin.left - margin.right;
                height = height - margin.top - margin.bottom;

                // create x,y scales (x is inferred as time)
                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                // create x,y axis
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom');

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                // create the root svg node
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin')
                        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
                        .append('g')
                            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                // insert the x axis (no data yet)
                svg.append('g')
                    .attr('class', 'histo x axis ' + klass)
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                // insert the y axis (no data yet)
                svg.append('g')
                    .attr('class', 'histo y axis ' + klass)
                    .call(yAxis)
                        .append('text')
                            .attr('transform', 'rotate(-90)')
                            .attr('y', 6)
                            .attr('dy', '.51em')
                            .style('text-anchor', 'end')
                            .text(label);


                // mainer observer fn called when scope is updated. Data and scope vars are npw bound
                scope.$watch('bind', function(data) {

                    // pull info from scope
                    var duration = scope.duration || 0;
                    var delay = scope.delay || 0;
                    var field = scope.field || attrs.bind.split('.').pop().toLowerCase();
                    var interval = scope.interval || 'day';

                    // just because scope is bound doesn't imply we have data
                    if (data) {

                        // pull the data array from the facet 
                        data = data.entries || [];

                        // calculate the bar width based on the data length leaving
                        // a 2 pixel "gap" between bars.
                        var barWidth = width/data.length - 2;

                        var intervalMsecs = 86400000;

                        // workaround until this pull request is merged
                        // the user can pass in an appropriate interval
                        // https://github.com/elasticsearch/elasticsearch/pull/2559
                        switch(interval.toLowerCase()) {
                            case 'minute':
                                intervalMsecs = 60000;
                                break;
                            case 'hour':
                                intervalMsecs = 3600000;
                                break;
                            case 'day':
                                intervalMsecs = 86400000;
                                break;
                            case 'week':
                                intervalMsecs = 604800000;
                                break;
                            case 'month':
                                intervalMsecs = 2630000000;
                                break;
                            case 'year':
                                intervalMsecs = 31560000000;
                                break;
                        }

                        // recalculate the x and y domains based on the new data.
                        // we have to add our "interval" to the max otherwise 
                        // we don't have enough room to draw the last bar.
                        x.domain([
                            d3.min(data, function(d) { 
                                return d.time;
                            }), 
                            d3.max(data, function(d) { 
                                return d.time;
                            }) + intervalMsecs
                        ]);
                        y.domain([0, d3.max(data, function(d) { return d.count; })]);

                        // create transition (x,y axis)
                        var t = svg.transition().duration(duration);

                        // using a random key function here will cause all nodes to update
                        var bars = svg.selectAll('rect')
                            .data(data, function(d) { return Math.random(); });

                        // d3 enter fn binds each new value to a rect
                        bars.enter()
                            .append('rect')
                                .attr('class', 'histo rect ' + klass)
                                .attr('cursor', 'pointer')
                                .attr('x', function(d) { return x(d.time); })
                                .attr("y", function(d) { return height })
                                .attr('width', barWidth)
                                .transition()
                                    .delay(function (d,i){ return i * delay; })
                                    .duration(duration)
                                        .attr('height', function(d) { return height - y(d.count); })
                                        .attr('y', function(d) { return y(d.count); });

                        // wire up event listeners - (registers filter callback)
                        bars.on('mousedown', function(d) {
                            scope.$apply(function() {
                                (scope.onClick || angular.noop)(field, d.time);
                            });
                        });

                        // d3 exit/remove flushes old values (removes old rects)
                        bars.exit().remove();

                        // update our x,y axis based on new data values
                        t.select('.x').call(xAxis);
                        t.select('.y').call(yAxis);
                    }
                }, true)
            }
        };
    }]);


/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsDonut', [function() {
        'use strict';

        return {
            restrict: 'E',

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                outerRadius: '=',
                innerRadius: '=',
                fontSize: '=',
                domain: '=',
                colorMap: '=',
                onClick: '=',
                bind: '=',
                duration: '@'
            },

            link: function(scope, element, attrs) {

                // Setup default parameters.
                var outerRadius = scope.outerRadius || 200;
                var innerRadius = scope.innerRadius || 0;
                var fontSize = scope.fontSize || 14;
                var fontColor = attrs.fontColor || "#fff";
                var color = undefined;

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                // User can define a color-map so use look for one.
                // If none is found, then use built-in color pallete
                // but see if user has defined a domain of values.
                if (scope.colorMap === undefined) {
                    color = d3.scale.category20c();
                    if (scope.domain !== undefined) {
                        color.domain(scope.domain);
                    }
                } else {
                    color = function(term) {
                        return scope.colorMap[term];
                    }
                }

                // width/height (based on giveb radius)
                var w = (outerRadius * 3) + 30;
                var h = outerRadius * 3;

                // arc generator 
                var arc = d3.svg.arc()
                    .outerRadius(outerRadius - 10)
                    .innerRadius(innerRadius);

                // d3 utility for creating pie charts
                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) { return d.count; });

                // root svg element
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin meet')
                        .attr('viewBox', '0 0 ' + w + ' ' + h);

                // group for arcs
                var arcs = svg.append('g')
                    .attr('transform', 'translate(' + w/2 + ',' + h/2 + ') rotate(180) scale(-1, -1)');

                // group for labels
                var labels = svg.append("g")
                    .attr("class", "label_group")
                    .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")");


                // Wrap the main drawing logic in an Angular watch function.
                // This will get called whenever our data attribute changes.
                scope.$watch('bind', function(data) {

                    var duration = scope.duration || 0;

                    // arc tweening
                    function arcTween(d, i) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc(i(t));
                        };
                    }
        
                    // label tweening
                    function textTween(d, i) {
                        var a = (this._current.startAngle + this._current.endAngle - Math.PI)/2;
                        var b = (d.startAngle + d.endAngle - Math.PI)/2;

                        var fn = d3.interpolateNumber(a, b);
                        return function(t) {
                            var val = fn(t);
                            return "translate(" + 
                                Math.cos(val) * (outerRadius + textOffset) + "," + 
                                Math.sin(val) * (outerRadius + textOffset) + ")";
                        };
                    }

                    // determines the anchor point of a label
                    var findAnchor = function(d) {
                        if ((d.startAngle + d.endAngle)/2 < Math.PI ) {
                            return "beginning";
                        } else {
                            return "end";
                        }
                    };

                    var textOffset = 14;

                    // if data is not null
                    if (data) { 

                        // pull out the terms array from the facet
                        data = data.terms || [];
                        var pieData = pie(data);

                        // calculate the sum of the counts for this facet
                        var sum = 0;
                        for (var ii=0; ii < data.length; ii++) {
                            sum += data[ii].count;
                        }

                        // if the sum is 0 then this facet has no valid entries (all counts were zero)
                        if (sum > 0) {

                            // update the arcs
                            var path = arcs.selectAll('path').data(pieData);
                            path.enter()
                                .append('path') 
                                    .attr('d', arc)
                                    .attr('stroke', '#fff')
                                    .attr('stroke-width', '1.5')
                                    .attr('cursor', 'pointer')
                                    .style('fill', function(d) { return color(d.data.term); })
                                    .each(function(d) { this._current = d; })
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                            (scope.onClick || angular.noop)(attrs.field, d.data.term);
                                        });
                                    });

                            // run the transition
                            path
                                .style('fill', function(d) { return color(d.data.term); })
                            .transition()
                                .duration(duration)
                                .attrTween('d', arcTween)
                                .style('fill', function(d) { return color(d.data.term); });

                            // remove arcs not in the dataset
                            path.exit().remove();

                            // update the label ticks
                            var ticks = labels.selectAll('line').data(pieData);
                            ticks.enter().append('line')
                                .attr('x1', 0)
                                .attr('x2', 0)
                                .attr('y1', -outerRadius-3)
                                .attr('y2', -outerRadius-8)
                                .attr('stroke', 'grey')
                                .attr('stroke-width', 2.0)
                                .attr('transform', function(d) {
                                    return 'rotate(' + (d.startAngle + d.endAngle)/2 * (180/Math.PI) + ')'; // radians to degrees
                                })
                                .each(function(d) {this._current = d;});

                            // run the transition
                            ticks.transition()
                                .duration(750)
                                .attr("transform", function(d) {
                                    return "rotate(" + (d.startAngle+d.endAngle)/2 * (180/Math.PI) + ")";
                            });

                            // flush old entries
                            ticks.exit().remove();

                            // update the percent labels
                            var percentLabels = labels.selectAll("text.value").data(pieData)
                                .attr("dy", function(d) {
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 17;
                                    } else {
                                        return -17;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d) {
                                    var percentage = (d.value/sum)*100;
                                    return percentage.toFixed(1) + "%";
                                });

                            percentLabels.enter().append("text")
                                .attr("class", "value")
                                .attr('font-size', 20)
                                .attr('font-weight', 'bold')
                                .attr("transform", function(d) {
                                    return "translate(" + 
                                        Math.cos(((d.startAngle + d.endAngle - Math.PI)/2)) * (outerRadius + textOffset) + "," + 
                                        Math.sin((d.startAngle + d.endAngle - Math.PI)/2) * (outerRadius + textOffset) + ")";
                                })
                                .attr("dy", function(d) {
                                    if ((d.startAngle+d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 17;
                                    } else {
                                        return -17;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d){
                                    var percentage = (d.value/sum)*100;
                                    return percentage.toFixed(1) + "%";
                                })
                                .each(function(d) {this._current = d;});
                           
                            // run the transition
                            percentLabels.transition().duration(duration).attrTween("transform", textTween);

                            // flush old entries
                            percentLabels.exit().remove();

                            // update the value labels 
                            var nameLabels = labels.selectAll("text.units").data(pieData)
                                .attr("dy", function(d){
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle+d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 36;
                                    } else {
                                        return 2;
                                    }
                                })
                                .attr("text-anchor", function(d){
                                    if ((d.startAngle + d.endAngle)/2 < Math.PI ) {
                                        return "beginning";
                                    } else {
                                        return "end";
                                    }
                                }).text(function(d) {
                                    if (d.data.term === 'T') {
                                        return 'TRUE' + ' (' + d.value + ')';
                                    } else if (d.data.term === 'F') {
                                        return 'FALSE'+ ' (' + d.value + ')';
                                    } else {
                                        return d.data.term + ' (' + d.value + ')';
                                    }
                                });

                            nameLabels.enter().append("text")
                                .attr("class", "units")
                                .attr('font-size', 16)
                                .attr('stroke', 'none')
                                .attr('fill', '#000')
                                .attr("transform", function(d) {
                                    return "translate(" + 
                                        Math.cos(((d.startAngle + d.endAngle - Math.PI)/2)) * (outerRadius + textOffset) + "," + 
                                        Math.sin((d.startAngle + d.endAngle - Math.PI)/2) * (outerRadius + textOffset) + ")";
                                })
                                .attr("dy", function(d){
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 36;
                                    } else {
                                        return 2;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d){
                                    if (d.data.term === 'T') {
                                        return 'TRUE' + ' (' + d.value + ')';
                                    } else if (d.data.term === 'F') {
                                        return 'FALSE' + ' (' + d.value + ')';
                                    } else {
                                        return d.data.term + ' (' + d.value + ')';
                                    }
                                })
                                .each(function(d) {this._current = d;});

                            // run the transition
                            nameLabels.transition().duration(duration).attrTween("transform", textTween);
    
                            // flush old entries
                            nameLabels.exit().remove();

                        } else {
                            // if the facet had no valid entries then remove the chart
                            svg.selectAll('path').remove();
                            labels.selectAll('line').remove();
                            labels.selectAll("text.value").remove();
                            labels.selectAll("text.units").remove();
                        }

                    }
                })

            }
        };
    }]);

/* 
 * Copyright (c) 2012 FullScale Labs, LLC
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

angular.module('dangle')
    .directive('fsPie', [function() {
        'use strict';

        return {
            restrict: 'E',

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                outerRadius: '=',
                innerRadius: '=',
                fontSize: '=',
                domain: '=',
                colorMap: '=',
                onClick: '=',
                bind: '='
            },

            // angular directives return a link fn
            link: function(scope, element, attrs) {

                // Setup default parameters.
                var outerRadius = scope.outerRadius || 200;
                var innerRadius = scope.innerRadius || 0;
                var fontSize = scope.fontSize || 14;
                var fontColor = attrs.fontColor || "#fff";
                var color = undefined;

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                // User can define a color-map so use look for one.
                // If none is found, then use built-in color pallete
                // but see if user has defined a domain of values.
                if (scope.colorMap == undefined) {
                    color = d3.scale.category20c();
                    if (scope.domain !== undefined) {
                        color.domain(scope.domain);
                    }
                } else {
                    color = function(term) {
                        return scope.colorMap[term];
                    }
                }

                var arc = d3.svg.arc()
                    .outerRadius(outerRadius - 10)
                    .innerRadius(innerRadius);

                // create the function for drawing the pie
                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) { return d.count; });

                // create the root svg element
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin meet')
                        .attr('viewBox', '0 0 ' + outerRadius*2 + ' ' + outerRadius*2)
                        .append('g')
                            .attr('transform', 'translate(' + 
                                outerRadius + ',' + outerRadius + ') rotate(180) scale(-1, -1)');

                // Wrap the main drawing logic in an Angular watch function.
                // This will get called whenever our data attribute changes.
                scope.$watch('bind', function(data) {
                   
                    if (data) { 
                        data = data.terms || [];
                        svg.selectAll('*').remove();

                        var g = svg.selectAll('.arc')
                            .data(pie(data))
                            .enter()
                                .append('g')
                                    .attr('class', 'arc')
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                            (scope.onClick || angular.noop)(attrs.field, d.data.term);
                                        });
                                    });

                            g.append('path')
                                .attr('d', arc)
                                .style('fill', function(d) {
                                    return color(d.data.term); 
                                });

                            g.append('text')
                                .attr('transform', function(d) { return 'translate(' + arc.centroid(d) + ')'; })
                                .attr('dy', '.55em')
                                .style('text-anchor', 'middle')
                                .attr('fill', fontColor)
                                .attr('font-size', fontSize)
                                .text(function(d) { 
                                    return d.data.term; 
                                }); 
                    }
                })

            }
        };
    }]);
