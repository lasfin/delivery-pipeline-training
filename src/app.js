angular.module('crud', [])
    .controller('CrudController', ["$scope", "$http", function($scope, $http){

        $scope.data = '{"foo" : "some value"}';

        var get = function(){
            $http({method: "GET", url: "/items"})
                .then(function(res){
                    $scope.items = res.data;
                });
        };

        get();

        $scope.clear = function(){
            $http({method: "delete", url: "/items"})
                .then(function(res){
                    get();
                })
        };

        $scope.add = function(data){
            $http({method: "post", url: "/items", data: data})
                .then(function(res){
                    get();
                })
        };

    }]);
