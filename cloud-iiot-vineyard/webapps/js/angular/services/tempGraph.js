app.service('tempGraph', function($http) {
   return {
     getTempGraph: function() {
     	 	var req = {
				 method: 'GET',
				 url: socketUrlAddress+"/getTemperatureGraphData"
				}
       return $http(req).then(function(response) {
           return response.data;
       });
     },
      updateScreenTransitionState: function() {
        var req = {
         method: 'GET',
         url: socketUrlAddress+"/updateScreenTransitionState?screenTransitionState=false"
        }
       return $http(req).then(function(response) {
           return response.data;
       });
     }
   }
   });