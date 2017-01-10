/* global fetch */
'use strict';
require('isomorphic-fetch');
const async = require('async'),
    moment = require('moment'),
    convertXMLToJSON = require('xml2js').parseString,
    http = require('http');


/**
* Configures a custom health checks using a config object
*/
function customHealthCheckConfig() {
    let config = {
        name: 'Custom Config Checks App Called Test',
        description: 'json check fixture description',
        checks: [
            {
                type: 'custom',
                name: 'Custom Check some dependency 1 for App Called Test',
                url: 'http://www.cnn.com/_healthcheck',
                severity: 2,
                businessImpact: 'Its a HUGE deal',
                technicalSummary: 'god knows',
                panicGuide: 'Don\'t Panic',
                checkResult: {
                    PASSED: 'Text if check passed',
                    FAILED: 'Text is check failed',
                    PENDING: 'This check has not yet run'
                },
                interval: '10s',
                callback: function (json) {
                    return json.version;
                },
                tick: function () {
                    return new Promise(function (resolve, reject) {

                        async.parallel({
                            entertainment: function (callback) {// GET LAST 10 PUBLISHED STORIES AND GET MOST RECENT STORY PUBLISHED OVER 10 MINUTE AGO

                                return fetch('http://hypatia.api.cnn.com/svc/content/v2/search/collection1/type:article/section:us/dataSource:cnn/sort:lastModifiedDate/rows:10')
                                .then((response) => {
                                    let message;

                                    if (!response.ok) {
                                        message = `BadResponse ${response.status}`;
                                        throw new Error(message);
                                    }

                                    return response.json();
                                })
                                .then((theDocs) => {

                                    let latestDocOver10MinutesOld;

                                    if (theDocs) {
                                        theDocs.docs.forEach(function (model) {

                                            if (moment().diff(model.lastModifiedDate, 'minutes') > 10) {
                                                latestDocOver10MinutesOld = model;
                                                return false;
                                            }

                                        });
                                    }

                                    return latestDocOver10MinutesOld;
                                })
                                .then((theDoc) => {// GET CURRENT FEED TO ENTERTAINMENT SECTION
                                    return new Promise(function (resolve, reject) {
                                        http.get('http://data.cnn.com/content/google-newsstand/us.xml', function (res) {
                                            let xml = '';

                                            res.on('data', function (chunk) {
                                                xml += chunk;
                                            });

                                            res.on('error', function (e) {
                                                reject(e);
                                            });

                                            res.on('timeout', function (e) {
                                                reject(e);
                                            });

                                            res.on('end', function () {
                                                convertXMLToJSON(xml, function (err, result) {
                                                    resolve({feed: {items: result.rss.channel[0].item, lastBuildDate: result.rss.channel[0].lastBuildDate[0]}, doc: theDoc});
                                                });
                                            });
                                        });
                                    }).then(function success(results) {
                                        return results;
                                    }, function fail(err) {
                                        let message = `BadResponse ${err}`;
                                        throw new Error(message);
                                    }).catch(function (error) {
                                        console.log(`ERROR: ${error.stack}`);
                                    });
                                })
                                .then((feedAndStory) => {// CHECK TO SEE IF THE MOST RECENT STORY OVER TEN MINUTES OLD IS IN THE CURRENT FEED
                                    let feedAsJSON = {
                                        hypatia: 'ok',
                                        feedUpToDate: false,
                                        feedLastBuildDate: moment(new Date(feedAndStory.feed.lastBuildDate)).toISOString() || '',
                                        lastPublishedStoryDate: feedAndStory.doc.lastModifiedDate,
                                        lastPublishedStoryURL: feedAndStory.doc.url
                                    };

                                    if (feedAndStory && feedAndStory.feed && feedAndStory.feed.items && feedAndStory.feed.items.length) {
                                        feedAndStory.feed.items.forEach( function (item) {
                                            if (item.link[0].trim() === feedAndStory.doc.url) {
                                                feedAsJSON.feedUpToDate = true;
                                            }
                                        });
                                    }

                                    callback(null, feedAsJSON);
                                })
                                .catch((err) => {
                                    console.log('Failed to get JSON', err);
                                    callback(null, err);
                                });
                            }
                        },
                        function (err, results) {
                            let allFeedsUPToDate = true,
                                resultObj = {};

                            if (!err) {
                                resultObj['entertainment'] = results.entertainment;
                                resultObj['us'] = {};

                                if (results.entertainment.feedUpToDate === false) {
                                    allFeedsUPToDate = false;
                                }

                                resultObj['status'] = allFeedsUPToDate;

                                resolve(resultObj);
                            } else {
                                resultObj['status'] = false;
                                resultObj['error'] = err;
                                reject(resultObj);
                                console.log(err);
                            }
                        }
                    );

                    }).then((resultsObject) => {
                        this.status = resultsObject.status ? this.stateValues.PASSED : this.stateValues.FAILED;
                        this['checkResults'] = resultsObject;
                    });
                },
                getStatus: function () {
                    const output = {
                        name: this.name,
                        ok: this.status === this.stateValues.PASSED,
                        severity: this.severity,
                        businessImpact: this.businessImpact,
                        technicalSummary: this.technicalSummary,
                        panicGuide: this.panicGuide,
                        checkOutput: this.checkOutput(),
                        checkResults: this.checkResults

                    };
                    if (this.lastUpdated) {
                        output.lastUpdated = this.lastUpdated.toISOString();
                        let shouldHaveRun = Date.now() - (this.interval + 1000);
                        if (this.lastUpdated.getTime() < shouldHaveRun) {
                            output.ok = false;
                            output.checkOutput = 'Check has not run recently';
                        }
                    }

                    return output;
                }
            }
        ]
    };

    return config;
}

module.exports = customHealthCheckConfig;