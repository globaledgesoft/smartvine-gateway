var app = angular.module('AWSMonitorApp', ['ngRoute', 'ngSanitize']);
var urlLocation = window.location.href;
urlLocation = urlLocation.split("/");
var socketUrlAddress = urlLocation[0] + "//" + urlLocation[2];
/*app.config(function($routeProvider, $httpProvider) {
	
	$routeProvider.when("/normal", {
		controller : "normalController",
		templateUrl : "views/locator.html"
	}).when("/cdetails", {
		controller : "cDetailsController",
		templateUrl : "views/cdetails.html"
	}).when("/cmanage", {
		controller : "cManageController",
		templateUrl : "views/cmanage.html"
	}).when("/dmanage", {
		controller : "dManageController",
		templateUrl : "views/dmanage.html"
	}).when("/smanage", {
		controller : "sManageController",
		templateUrl : "views/smanage.html"
	}).when("/logout", {
		controller : "logoutController",
		templateUrl : "views/logout.html"
	}).otherwise({
		redirectTo : "/cmanage"
	});
});*/