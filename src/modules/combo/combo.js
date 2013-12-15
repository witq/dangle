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

