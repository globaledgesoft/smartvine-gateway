app.controller('monitorController', function($scope, $timeout, tempGraph) {
    $scope.imagesToLoad = ['cloud', 'green', 'hvac', 'pallet', 'temp'];
    $scope.colorsToLoad = ['#ffffff', '#3253dc', '#7ba0ff'];
    $scope.viewToLoad = ['main', 'info'];
    $scope.opacityToLoad = ['0.5', '0.7', '1'];

    $scope.availLangs = [{ 'name': 'English', 'val': 'en', 'label': 'Select Language' }, { 'name': '中文', 'val': 'mnd', 'label': '选择语言' }, { 'name': 'portuguese', 'val': 'por', 'label': 'Selecionar idioma' }];
    $scope.currentLang = $scope.availLangs[0];
    $scope.langOpt = true;
    $scope.loadThings = function(view, bgColor, opacity, ImageUrl, ImageInfo) {
        //check the view
        if (view == 'main') {
            $scope.mainScreen = true;
            $scope.infoScreen = false;
            //$scope.loadChart();
            $('body div').css('background-color', '#ffffff');
        } else {
            $scope.mainScreen = false;
            $scope.infoScreen = true;
            $('body div').css('background-color', bgColor);
            $scope.loadInfoScreen(ImageUrl, ImageInfo);
        }
        //add the color to the body
        $('body').css('background-color', bgColor);
        //add the opacity to the body
        $('body').css('opacity', opacity);
    }
    $scope.loadAnimation = function(className) {
        /*$('body').removeClass().addClass(className + ' animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      			$(this).removeClass();
      		});*/
        //$("body div").fadeOut();
        $("body div").fadeIn();
        //$("body div").animate({background-color:#642f6c});
        //$("body div").animate({background: "#642f6c"});

    }
    $scope.loadInfoScreen = function(url, info) {
        $scope.currentImageUrl = url;
        $scope.currentImageInfo = info;
    }
    $scope.loadChart = function(Obj, data) {
        Highcharts.chart('temp_graph', {
            title: {
                text: '<h2>' + Obj.heading + '</h2>'
            },
            credits: {
                enabled: false
            },

            chart: {
                type: 'area'
            },
            xAxis: {
                categories: data.y_axis,
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                lineWidth: 0
            },
            yAxis: {
                title: {
                    enabled: true,
                    text: '<strong>' + Obj.yAxis + '</strong>'
                },
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                lineWidth: 0
            },

            plotOptions: {
                series: {
                    stacking: 'normal',
                    color: '#3253dc'
                }
            },

            series: [{
                name: Obj.time,
                data: data.x_axis
            }]

        });
    }
    $scope.loadLiveGraph = function(langObj) {
        tempGraph.getTempGraph().then(function onSuccess(data) {
            if (data.code == 200) {
                console.log(data);
                var y_axis_array = [];
                for (var i = 0; i < data.data.y_axis.length; i++) {
                    //console.log(new Date(parseInt(data.data.y_axis[i])).getHours());
                    y_axis_array.push(new Date(parseInt(data.data.y_axis[i])).getHours());
                }
                console.log(y_axis_array);
                data.data.y_axis = y_axis_array;
                $scope.loadChart(langObj, data.data);
            }
            if (data.code != 200) {
                console.log(data.message);
            }

        }).catch(function onError(response) {
            if (response.status == 401) {
                console.log('not Authorized');
            }
        });
    }
    $scope.updateScreenTransitionState = function() {
        tempGraph.updateScreenTransitionState().then(function onSuccess(data) {
            if (data.code == 200) {
                console.log(data);
            }
            if (data.code != 200) {
                console.log(data.message);
            }

        }).catch(function onError(response) {
            if (response.status == 401) {
                console.log('not Authorized');
            }
        });
    }


    var socket = io.connect(socketUrlAddress, function(data) {
        console.log("connection created");
    });
    $scope.changeLang = function() {
        $scope.langLabel = $scope.currentLang.label;
        console.log($scope.currentLang);
        if ($scope.currentLang.val == 'en') {
            currentLangData1 = langSet[0].en1;
            currentLangData2 = langSet[0].en2;
            currentLangDataChart = chartLang[0].en;
        }
        if ($scope.currentLang.val == 'mnd') {
            currentLangData1 = langSet[1].mnd1;
            currentLangData2 = langSet[1].mnd2;
            currentLangDataChart = chartLang[1].mnd;
        }
        if ($scope.currentLang.val == 'por') {
            currentLangData1 = langSet[2].por1;
            currentLangData2 = langSet[2].por2;
            currentLangDataChart = chartLang[2].por;
        }
        $scope.loadLiveGraph(currentLangDataChart);
        $scope.purpleImageInfoToLoad = currentLangData1; //['Temperature is out of range for aging process.','Edge gateway using AWS Greengrass runs local Lambda functions and triggers immediate action.','HVAC adjustment made to bring temperature within ideal range.']
        $scope.pinkImageInfoToLoad = currentLangData2; //['Pallet has left the warehouse.','Edge gateway uses AWS IoT cloud service to confirm scheduled shipment.','Shipment departure notice sent to cloud, and delivery tracking initiated.']
    };
    $scope.changeLang({ 'val': 'en' });
    //$scope.loadChart(currentLangDataChart);
    $scope.loadAnimation('fadeIn');
    $scope.loadThings($scope.viewToLoad[0], $scope.colorsToLoad[0], $scope.opacityToLoad[2]);
    var screenDuration = 3000;

    $scope.loadBleEvent = function() {
        $timeout($scope.hideLangDiv, 1 * screenDuration, true);
        $timeout($scope.showLangDiv, 20 * 1000, true);
        //$timeout($scope.loadAnimation, 1 * screenDuration, true, 'fadeIn');
        //$timeout($scope.loadThings, 1 * screenDuration, true, $scope.viewToLoad[0], $scope.colorsToLoad[2], $scope.opacityToLoad[0]);
        $timeout($scope.loadAnimation, 1 * screenDuration, true, 'fadeIn');
        $timeout($scope.loadThings, 1 * screenDuration, true, $scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2]);
        //$timeout($scope.loadAnimation,3*screenDuration,true,'fadeIn');
        //$timeout($scope.loadThings,3*screenDuration,true,$scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2],'images/'+$scope.imagesToLoad[3]+'.png','');
        $timeout($scope.loadAnimation, 5 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 5 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2], 'images/' + $scope.imagesToLoad[3] + '.png', $scope.pinkImageInfoToLoad[0]);
        //$timeout($scope.loadAnimation,4*screenDuration,true,'fadeIn');
        //$timeout($scope.loadThings,4*screenDuration,true,$scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2],'images/'+$scope.imagesToLoad[0]+'.png','');
        $timeout($scope.loadAnimation, 8 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 8 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2], 'images/' + $scope.imagesToLoad[0] + '.png', $scope.pinkImageInfoToLoad[1]);
        //$timeout($scope.loadAnimation,7*screenDuration,true,'fadeIn');
        //$timeout($scope.loadThings,7*screenDuration,true,$scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2],'images/'+$scope.imagesToLoad[3]+'.png','');
        $timeout($scope.loadAnimation, 13 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 13 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2], 'images/' + $scope.imagesToLoad[3] + '.png', $scope.pinkImageInfoToLoad[2]);
        $timeout($scope.loadAnimation, 18 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 18 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[2], $scope.opacityToLoad[2]);
        //$timeout($scope.loadAnimation, 14 * 1000, true, 'fadeIn');
        //$timeout($scope.loadThings, 14 * 1000, true, $scope.viewToLoad[0], $scope.colorsToLoad[2], $scope.opacityToLoad[0]);
        $timeout($scope.loadAnimation, 20 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 20 * 1000, true, $scope.viewToLoad[0], $scope.colorsToLoad[0], $scope.opacityToLoad[2]);
    }
    $scope.loadTempEvent = function() {
        $timeout($scope.hideLangDiv, 1 * screenDuration, true);
        $timeout($scope.showLangDiv, 20 * 1000, true);
        //$timeout($scope.loadAnimation, 1 * screenDuration, true, 'fadeIn');
        //$timeout($scope.loadThings, 1 * screenDuration, true, $scope.viewToLoad[0], $scope.colorsToLoad[1], $scope.opacityToLoad[1]);
        $timeout($scope.loadAnimation, 1 * screenDuration, true, 'fadeIn');
        $timeout($scope.loadThings, 1 * screenDuration, true, $scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2]);
        //$timeout($scope.loadAnimation,3*screenDuration,true,'fadeIn');
        //$timeout($scope.loadThings,3*screenDuration,true,$scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2],'images/'+$scope.imagesToLoad[4]+'.png','');
        $timeout($scope.loadAnimation, 5 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 5 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2], 'images/' + $scope.imagesToLoad[4] + '.png', $scope.purpleImageInfoToLoad[0]);
        //$timeout($scope.loadAnimation,5*screenDuration,true,'fadeIn');
        //$timeout($scope.loadThings,5*screenDuration,true,$scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2],'images/'+$scope.imagesToLoad[1]+'.png','');
        $timeout($scope.loadAnimation, 8 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 8 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2], 'images/' + $scope.imagesToLoad[1] + '.png', $scope.purpleImageInfoToLoad[1]);
        //$timeout($scope.loadAnimation,7*screenDuration,true,'fadeIn');
        //$timeout($scope.loadThings,7*screenDuration,true,$scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2],'images/'+$scope.imagesToLoad[2]+'.png','');
        $timeout($scope.loadAnimation, 13 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 13 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2], 'images/' + $scope.imagesToLoad[2] + '.png', $scope.purpleImageInfoToLoad[2]);
        $timeout($scope.loadAnimation, 18 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 18 * 1000, true, $scope.viewToLoad[1], $scope.colorsToLoad[1], $scope.opacityToLoad[2]);
        //$timeout($scope.loadAnimation, 20 * 1000, true, 'fadeIn');
        //$timeout($scope.loadThings, 20 * 1000, true, $scope.viewToLoad[0], $scope.colorsToLoad[1], $scope.opacityToLoad[2]);
        $timeout($scope.loadAnimation, 20 * 1000, true, 'fadeIn');
        $timeout($scope.loadThings, 20 * 1000, true, $scope.viewToLoad[0], $scope.colorsToLoad[0], $scope.opacityToLoad[2]);
    };

    $scope.hideLangDiv = function() {
        $scope.langOpt = false;
    };
    $scope.showLangDiv = function() {
        $scope.langOpt = true;
    };
    $scope.updateScreenTransitionState();
    socket.on('iiot-transition-screen', function(result, err) {
        console.log(result);
        if (result.event == 'ble-event') {
            $scope.currentImageUrl = 'images/pallet.png';
            $scope.loadBleEvent();
        }
        if (result.event == 'temp-event') {
            $scope.currentImageUrl = 'images/temp.png';
            $scope.loadTempEvent();
        }
        $timeout($scope.updateScreenTransitionState, 20 * 1000, true);
    });
    //$scope.loadBleEvent();
    /*$scope.loadChart(currentLangDataChart);
      	$scope.loadAnimation('fadeIn');
      	$scope.loadThings($scope.viewToLoad[0], $scope.colorsToLoad[0], $scope.opacityToLoad[2]);*/
    //$scope.loadThings('main', '#642f6c', '0.7');

});