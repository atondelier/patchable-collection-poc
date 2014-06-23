;(function() {
    "use strict";

    function inherits(child, parent) {
        var F = new Function();
        F.prototype = parent.prototype;
        child.prototype = new F();
        child.prototype.constructor = child;
    }

    /**
     * Patchable Model
     * @constructor
     */
    function PatchableModel() {
        this.$patches = [];
        this.$oldCleanModel = {};
    }

    PatchableModel.prototype.uniqueKey = '_id';

    PatchableModel.prototype.getId = function() {
        return this[this.uniqueKey];
    };

    PatchableModel.prototype.getCleanModel = function() {
        return this;
    };

    PatchableModel.prototype.saveCurrentModel = function(cleanModel) {
        this.$oldCleanModel = cleanModel || this.getCleanModel();
    };

    PatchableModel.prototype.computePatches = function() {
        var newCleanModel = this.getCleanModel();
        var patches = jsonpatch.compare(this.$oldCleanModel, newCleanModel);
        patches.forEach(function(patch) {
            patch.$timestamp = +new Date();
        });
        this.$patches.push.apply(this.$patches, patches);
        this.saveCurrentModel(newCleanModel);

        return this.getPatches();
    };

    PatchableModel.prototype.getPatches = function() {
        return this.$patches;
    };

    PatchableModel.prototype.cleanPatches = function() {
        this.getPatches().length = 0;
    };


    /**
     * Patchable Collection
     * @constructor
     */
    function PatchableCollection() {

    }

    inherits(PatchableCollection, Array);

    PatchableCollection.prototype.getPatches = function() {
        var allPatches = [];
        this.forEach(function(model) {
            var uniqueKey = model.uniqueKey;
            var idReservation = model.getId();
            var patches = model.getPatches();
            patches.forEach(function(patch) {
                patch[uniqueKey] = idReservation;
            });
            allPatches.push.apply(allPatches, patches);
        });
        allPatches.sort(function(a, b) {
            return a.$timestamp - b.$timestamp;
        });
        return allPatches;
    };

    PatchableCollection.prototype.computePatches = function() {
        this.forEach(function(model) {
            model.computePatches();
        });
    };

    PatchableCollection.prototype.cleanPatches = function() {
        this.forEach(function(model) {
            model.cleanPatches();
        });
    };


    /**
     * Reservation Model
     * @param {object} [parameters]
     * @constructor
     */
    function Reservation(parameters) {
        PatchableModel.apply(this);
        parameters = parameters || {};
        angular.extend(this, parameters);
    }

    inherits(Reservation, PatchableModel);

    Reservation.prototype.uniqueKey = 'id_reservation';

    Reservation.prototype.getCleanModel = function() {
        return angular.fromJson(angular.toJson(this));
    };

    /**
     * Reservation Factory
     * @returns {{create: _create}}
     * @constructor
     */
    function ReservationFactory() {
        function _create(parameters) {
            return new Reservation(parameters);
        }
        return {
            create: _create
        };
    }

    ReservationFactory.prototype.create = function _create(parameters) {
        return new Reservation(parameters);
    };

    /**
     * Reservation Requester
     * @param $http
     * @param ReservationFactory
     * @constructor
     */
    function ReservationRequester($http, ReservationFactory) {
        this.$http = $http;
        this.ReservationFactory = ReservationFactory;
    }

    ReservationRequester.prototype.getReservationList = function() {
        var self = this;
        return this.$http({
            url: '/reservations',
            method: 'GET'
        }).then(function(response) {
            return response.data.map(function(model) {
                var reservation = self.ReservationFactory.create(model);
                reservation.saveCurrentModel();
                return reservation;
            });
        });
    };

    ReservationRequester.prototype.patchReservation = function(patches) {
        return this.$http({
            url: '/reservations',
            data: patches,
            method: "PATCH"
        });
    };

    ReservationRequester.$inject = ['$http', 'ReservationFactory'];


    /**
     * Reservation Requester
     * @param {ReservationRequester} ReservationRequester
     * @constructor
     */
    function ReservationList(ReservationRequester) {
        this.ReservationRequester = ReservationRequester;
        PatchableCollection.apply(this);
    }

    inherits(ReservationList, PatchableCollection);

    ReservationList.prototype.getAll = function() {
        var self = this;
        return this.ReservationRequester.getReservationList().then(function(collection) {
            self.push.apply(self, collection);
        });
    };

    ReservationList.prototype.synchronize = function() {
        this.computePatches();
        var allPatches = this.getPatches();
        if(!allPatches.length) {
            return;
        }
        var self = this;
        this.ReservationRequester.patchReservation(allPatches).then(function() {
            self.cleanPatches();
        });
    };

    ReservationList.$inject = ['ReservationRequester'];

    /**
     * Main Controller for demo
     * @param {$scope} $scope
     * @param {ReservationList} ReservationList
     * @constructor
     */
    function MainCtrl($scope, ReservationList) {

        this.$scope = $scope;
        this.$scope.ReservationList = ReservationList;

        this.$scope.ReservationList.getAll();

    }

    MainCtrl.prototype.storePatches = function() {
        this.$scope.ReservationList.computePatches();
    };

    MainCtrl.prototype.syncPatches = function() {
        this.$scope.ReservationList.synchronize();
    };

    MainCtrl.prototype.pushChild = function() {
        this.$scope.ReservationList.push(new Reservation({
            id_reservation: Math.random()*1e6 | 0
        }));
    };

    MainCtrl.$inject = ['$scope', 'ReservationList'];

    var App = angular.module('App', []);

    App.controller('MainCtrl', MainCtrl);
    App.value('Reservation', Reservation);
    App.service('ReservationList', ReservationList);
    App.factory('ReservationFactory', ReservationFactory);
    App.service('ReservationRequester', ReservationRequester);
})();

