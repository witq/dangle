'use strict';

var app = angular.module('app', ['dangle']);

var generateData = function(min, max) {
    var timestamp = new Date().getTime(),
        data = [];
    for (var i = 1; i <= Math.floor(Math.random() * (31 - 15 + 1)) + 15; i++) {
        data.push({
            time: timestamp,
            bar1: Math.floor(Math.random() * (max - min + 1)) + min,
            bar1a: Math.floor(Math.random() * (max - min + 1)) + min,
            bar2: Math.floor(Math.random() * (max - min + 1)) + min,
            bar2a: Math.floor(Math.random() * (max - min + 1)) + min,
            bar3: Math.floor(Math.random() * (max - min + 1)) + min,
            bar3a: Math.floor(Math.random() * (max - min + 1)) + min,
            line1: Math.floor(Math.random() * (max - min + 1)) + min,
            line1a: Math.floor(Math.random() * (max - min + 1)) + min,
            line2: Math.floor(Math.random() * (max - min + 1)) + min,
            line2a: Math.floor(Math.random() * (max - min + 1)) + min
        });
        timestamp += 86400000;
    }
    return data;
}

app.controller('appCtrl', ['$scope', '$interval', function($scope, $interval) {
    $interval(function() {
        $scope.data = {
            stacks: [
                ['bar1', 'bar1a'],
                ['bar2', 'bar2a'],
                ['bar3', 'bar3a']    
            ],
            entries: generateData(120,2000)
        }     
    }, 1000);
}]);