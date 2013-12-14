'use strict';

var app = angular.module('app', ['dangle']);

var generateData = function(min, max, interval) {
    var timestamp = new Date().getTime(),
        data = [];
    for (var i = 0; i <= 30 * 86400000 / interval; i ++) {
        data.push({
        	time: timestamp,
        	count: Math.floor(Math.random() * (max - min + 1)) + min
        });
        timestamp += interval;
    }
    return data;
}

app.controller('appCtrl', ['$scope', function($scope) {
	$scope.data = {
		_type: "date_histogram",
		entries: generateData(0,200,86400000)
	}
}]);