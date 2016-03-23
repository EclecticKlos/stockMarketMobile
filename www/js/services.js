angular.module('stockMarketMobile.services', [])

.factory('encodeURIService', function() {

  return {
    encode: function(string) {
      return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
    }
  };
})

.factory('dateService', function($filter) {

  var currentDate = function(){
    var d = new Date();
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };

  var oneYearAgoDate = function() {
    var d = new Date(new Date().setDate(new Date().getDate() - 365));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };

  return {
    currentDate: currentDate,
    oneYearAgoDate: oneYearAgoDate
  }
})


.factory('chartDataCacheService', function(CacheFactory) {

  var chartDataCache;

  if(!CacheFactory.get('chartDataCache')){
    chartDataCache = CacheFactory('chartDataCache', {
      maxAge: 60 * 60 * 8 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    })
  }
  else {
    chartDataCache = CacheFactory.get('chartDataCache');
  }
  return chartDataCache;
})


.factory('stockDetailsCacheService', function(CacheFactory) {

  var stockDetailsCache;

  if (!CacheFactory.get('stockDetailsCache')) {
    stockDetailsCache = CacheFactory('stockDetailsCache', {
      maxAge: 60 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    })
  }
  else {
    stockDetailsCache = CacheFactory.get('stockDetailsCache');
  }

  return stockDetailsCache

})


.factory('fillMyStocksCacheService', function(CacheFactory) {

  var myStocksCache;

  if (!CacheFactory.get('myStocksCache')){
    myStocksCache = new CacheFactory('myStocksCache', {
      storageMode: 'localStorage'
    });
  }
  else {
    myStocksCache = CacheFactory.get('myStocksCache');
  }

  var fillMyStocksCache = function() {
    var myStocksArray = [
      {ticker: "AAPL"},
      {ticker: "GPRO"},
      {ticker: "FB"},
      {ticker: "NFLX"},
      {ticker: "TSLA"},
      {ticker: "BRK-A"},
      {ticker: "INTC"},
      {ticker: "MSFT"},
      {ticker: "GE"},
      {ticker: "BAC"},
      {ticker: "C"},
      {ticker: "T"},
    ];

    myStocksCache.put('myStocks', myStocksArray)
  };

  return {
    fillMyStocksCache: fillMyStocksCache
  };
})


.factory('myStocksCacheService', function(CacheFactory) {

  var myStocksCache = CacheFactory.get('myStocksCache');

  return myStocksCache;
})


.factory('myStocksArrayService', function(fillMyStocksCacheService, myStocksCacheService) {
  if (!myStocksCacheService.info('myStocks')) {
    fillMyStocksCacheService.fillMyStocksCache();
  }

  var myStocks = myStocksCacheService.get('myStocks');

  return myStocks;
})


.factory('followStockService', function() {

  return {
    follow: function(ticker){

    },
    unfollow: function(ticker){
    },

    checkFollowing: function(ticker){

    }

  }

})


.factory('stockDataService', function($q, $http, encodeURIService, stockDetailsCacheService) {

  var getDetailsData = function(ticker) {

    var deferred = $q.defer(),

    cacheKey = ticker,
    stockDetailsCache = stockDetailsCacheService.get(cacheKey),

    query = 'select *  from yahoo.finance.quotes where symbol in ("' + ticker + '")',
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    if (stockDetailsCache) {
      deferred.resolve(stockDetailsCache)
    }
    else {
      $http.get(url)
      .success(function(json) {
        var jsonData = json.query.results.quote;
        deferred.resolve(jsonData);
        stockDetailsCacheService.put(cacheKey, jsonData)
      })
      .error(function(error) {
        console.log("Details  data error:  " + error);
        deferred.reject();
      });
    }

    return deferred.promise;

  }

  var getPriceData = function(ticker) {

    var deferred = $q.defer(),
    url = 'http://finance.yahoo.com/webservice/v1/symbols/' + ticker + '/quote?format=json&view=detail'

    $http.get(url)
      .success(function(json) {
        var jsonData = json.list.resources[0].resource.fields;
        deferred.resolve(jsonData);
      })
      .error(function(error) {
        console.log("Price data error:  " + error);
        deferred.reject();
      });

    return deferred.promise;

  };

  return {
    getPriceData: getPriceData,
    getDetailsData: getDetailsData
  };

})


.factory('chartDataService', function($q, $http, encodeURIService, chartDataCacheService) {
  var getHistoricalData = function(ticker, fromDate, todayDate) {

    var deferred = $q.defer();

    cacheKey = ticker,
    chartDataCache = chartDataCacheService.get(cacheKey),

    query = 'select * from yahoo.finance.historicaldata where symbol = "' + ticker + '" and startDate = "' + fromDate + '" and endDate = "' + todayDate + '"';
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    if (chartDataCache) {
      deferred.resolve(chartDataCache);
    }
    else {
      $http.get(url)
      .success(function(json) {
        var jsonData = json.query.results.quote;

        var priceData = [],
        volumeData = [];

        jsonData.forEach(function(dayDataObject) {

          var dateToMillis = dayDataObject.Date,
          date = Date.parse(dateToMillis),
          price = parseFloat(Math.round(dayDataObject.Close * 100) /100 ).toFixed(3),
          volume = dayDataObject.Volume,

          volumeDatum = '[' + date + ',' + volume + ']',
          priceDatum = '[' + date + ',' + price + ']';

          // console.log(volumeDatum, priceDatum);

          volumeData.unshift(volumeDatum);
          priceData.unshift(priceDatum);


        });

        var formattedChartData =
        '[{' +
          '"key":' + '"volume",' +
          '"bar":' + 'true,' +
          '"values":' + '[' + volumeData + ']' +
          '},' +
          '{' +
            '"key":' + '"' + ticker + '",' +
            '"values":' + '[' + priceData + ']' +
          '}]';

        deferred.resolve(formattedChartData);
        chartDataCacheService.put(cacheKey, formattedChartData);
      })
      .error(function(error) {
        console.log("Chart data error: " + error);
        deferred.reject();
      });
    }

    return deferred.promise;

  };

  return {
    getHistoricalData: getHistoricalData
  }
})

.factory('newsService', function($q, $http) {

  return {
    getNews: function(ticker) {
      var deferred = $q.defer(),
      x2js = new X2JS(),
      url = "http://finance.yaho.com/rss/headline?s=" + ticker;

      $http.get(url)
        .success(function(xml) {
          var xmlDoc = x2js.parseXmlString(xml),
          json = x2js.xml2json(xmlDoc),
          withCredentials = true,
          headers = {
            'Content-Type': 'application/json; charset=utf-8'
          },
          jsonData = json.rss.channel.item;

          deferred.resolve(jsonData);
        })
        .error(function(error){
          deferred.reject();
          console.log("News error: " + error);
        })
      return deferred.promise;
    }
  }

});



