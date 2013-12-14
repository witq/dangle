'use strict';

var app = angular.module('app', ['dangle']);

var generateData = function(min, max) {
    var timestamp = new Date().getTime(),
        data = [];
    for (var i = 1; i <= 30; i++) {
        data.push({
            time: timestamp,
            count1: Math.floor(Math.random() * (max - min + 1)) + min,
            count1a: Math.floor(Math.random() * (max - min + 1)) + min,
            count2: Math.floor(Math.random() * (max - min + 1)) + min,
            count2a: Math.floor(Math.random() * (max - min + 1)) + min,
            count3: Math.floor(Math.random() * (max - min + 1)) + min,
            count3a: Math.floor(Math.random() * (max - min + 1)) + min,
        });
        timestamp += 86400000;
    }
    return data;
}

app.controller('appCtrl', ['$scope', function($scope) {
    $scope.data = {
        entries: generateData(120,2000)
    }
    $scope.stacks = {
        'column1': ['count1', 'count1a'],
        'column2': ['count2', 'count2a'],
        'column3': ['count3', 'count3a']    
    }
}]);