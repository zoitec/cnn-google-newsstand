/* global gnsHealthStatus */
'use strict';

/**
* Configures a custom health checks using a config object
*/
function customHealthCheckConfig() {
    let config = {
        name: 'cnn-google newsstand health check',
        description: 'A health check on the feed status, and hypatia status',
        checks: [
            {
                type: 'custom',
                name: 'custom check for GNS feed health check',
                url: 'http://www.cnn.com/_healthcheck',
                severity: 2,
                businessImpact: 'Not specified',
                technicalSummary: 'GNS Feed Generation Check',
                panicGuide: 'Don\'t Panic',
                checkResult: {
                    PASSED: 'All the feeds to be up and current',
                    FAILED: 'One or more feeds may not be up to date',
                    PENDING: 'This check has not yet run'
                },
                interval: '10s',
                callback: function (json) {
                    return json.version;
                },
                tick: function () {
                    return new Promise(function (resolve) {
                        resolve({});

                    }).then(() => {
                    });
                },
                getStatus: function () {

                    let result = true,
                        isMonitoringTest = gnsHealthStatus.testMode;

                    this.status = this.stateValues.PASSED;

                    if (isMonitoringTest === 'false' || isMonitoringTest === false) {
                        if (gnsHealthStatus.sectionFeeds) {
                            for (let feed in gnsHealthStatus.sectionFeeds) {
                                if (gnsHealthStatus.sectionFeeds.hasOwnProperty(feed)) {
                                    if (gnsHealthStatus.sectionFeeds[feed].status === 500) {
                                        gnsHealthStatus.status = 500;
                                        this.status = this.stateValues.FAILED;
                                        result = false;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        gnsHealthStatus.status = 500;
                        this.status = this.stateValues.FAILED;
                        result = false;

                        if (gnsHealthStatus.sectionFeeds) {
                            for (let feed in gnsHealthStatus.sectionFeeds) {
                                if (gnsHealthStatus.sectionFeeds.hasOwnProperty(feed)) {
                                    gnsHealthStatus.sectionFeeds[feed].status = 500;
                                    gnsHealthStatus.sectionFeeds[feed].valid = false;
                                    gnsHealthStatus.sectionFeeds[feed].generateFeed.status = 'failed';
                                }
                            }
                        }
                    }

                    const output = {
                        name: this.name,
                        status: result ? 200 : 500,
                        ok: this.status === this.stateValues.PASSED,
                        severity: this.severity,
                        businessImpact: this.businessImpact,
                        technicalSummary: this.technicalSummary,
                        panicGuide: this.panicGuide,
                        checkResults: gnsHealthStatus

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