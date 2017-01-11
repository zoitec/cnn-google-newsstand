/*
 * Copyright 2016 Turner Broadcasting System, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const request = require('request'),
    AWS = require('aws-sdk'),
    _ = require('underscore'),
    maxKeys = 1000,
    FeedGenerator = require('../lib/feed-generator.js'),
    amqp = require('amqplib/callback_api'),
    debugLog = require('debug')('cnn-google-newsstand:Task:google-newsstand-latest'),
    config = require('../config.js'),
    cloudamqpConnectionString = config.get('cloudamqpConnectionString'),
    latestFG = new FeedGenerator(),
    electionsFG = new FeedGenerator(),
    entertainmentFG = new FeedGenerator(),
    healthFG = new FeedGenerator(),
    moneyFG = new FeedGenerator(),
    opinionsFG = new FeedGenerator(),
    politicsFG = new FeedGenerator(),
    techFG = new FeedGenerator(),
    usFG = new FeedGenerator(),
    worldFG = new FeedGenerator(),
    enableElectionStory = config.get('gnsTurnOnElectionModule'),
    logConfig = config.get('logConfig'),
    log = require('cnn-logger')(logConfig);

function processCNNMessage(message) {
    let mappedToASection = false;

    debugLog(`AMQP Message: ${message.fields.routingKey}: ${message.content.toString()}`);
    debugLog(`Adding url to latest feed: ${JSON.parse(message.content.toString()).url}`);
    latestFG.urls = JSON.parse(message.content.toString()).url;

    if (/\/entertainment\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to entertainment feed: ${JSON.parse(message.content.toString()).url}`);
        entertainmentFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (/\/politics\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to politics feed: ${JSON.parse(message.content.toString()).url}`);
        politicsFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (/\/health\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to health feed: ${JSON.parse(message.content.toString()).url}`);
        healthFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (/\/opinions|opinion\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to opinions feed: ${JSON.parse(message.content.toString()).url}`);
        opinionsFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (/\/tech\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to tech feed: ${JSON.parse(message.content.toString()).url}`);
        techFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (/\/us|crime|justice\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to us feed: ${JSON.parse(message.content.toString()).url}`);
        usFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (/\/world\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to world feed: ${JSON.parse(message.content.toString()).url}`);
        worldFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (JSON.parse(message.content.toString()).branding && JSON.parse(message.content.toString()).branding === '2016-elections') {
        debugLog(`Adding url to election feed: ${JSON.parse(message.content.toString()).url}`);
        electionsFG.urls = JSON.parse(message.content.toString()).url;
        mappedToASection = true;
    }

    if (!mappedToASection) {
        debugLog(`${JSON.parse(message.content.toString()).url} - DEFAULTING to world feed`);
        worldFG.urls = JSON.parse(message.content.toString()).url;
    }

}

function processCNNMoneyMessage(message)  {

    let theURL = JSON.parse(message.content.toString()).url;

    if (/\/technology\//.test(JSON.parse(message.content.toString()).url)) {
        debugLog(`Adding url to tech feed: ${theURL}`);
        techFG.urls = theURL;
    }
    debugLog(`Adding url to money feed: ${theURL}`);
    moneyFG.urls = theURL;
}

// connect to CloudAMQP and use/create the queue to subscribe to
amqp.connect(cloudamqpConnectionString, (error, connection) => {
    connection.createChannel((error, channel) => {
        const exchangeName = config.get('exchangeName');

        channel.assertExchange(exchangeName, 'topic', {durable: true});

        channel.assertQueue(config.get('queueNameArticles'), {durable: true}, (error, queueName) => {
            const routingKeys = config.get('routingKeysArticles');

            routingKeys.forEach((routingKey) => {
                channel.bindQueue(queueName.queue, exchangeName, routingKey);
            });

            channel.prefetch(1);

            channel.consume(
                queueName.queue,
                (message) => {

                    switch (message.fields.routingKey) {
                        // CNN CONTENT
                        case 'cnn.article':
                        case 'cnn.video':
                            processCNNMessage(message);
                            break;
                        // MONEY CONTENT
                        case 'money.article':
                            processCNNMoneyMessage(message);
                            break;

                        default:
                            debugLog(`Message routing key ${message.fields.routingKey}`);
                    }

                    channel.ack(message);
                },
                {noAck: false, exclusive: true}
            );
        });
    });
});

let s3Images = undefined;

function filterImages(data) {
    let filteredImages = [],
        contents = data,
        image,
        i;
    for (i in contents) {
        image = contents[i];
        if (image.Key.includes('.png')) {
            filteredImages.push({
                time: image.LastModified,
                url: `http://registry.api.cnn.io/${image.Key}`
            });
        }
    }

    filteredImages = _.sortBy(filteredImages, function (o) {
        return new Date(o.time).getTime();
    });

    return filteredImages;
}

/**
 * List keys from the specified bucket.
 *
 * If providing a prefix, only keys matching the prefix will be returned.
 *
 * If providing a delimiter, then a set of distinct path segments will be
 * returned from the keys to be listed. This is a way of listing "folders"
 * present given the keys that are there.
 *
 * @param {Object} options
 * @param {String} options.bucket - The bucket name.
 * @param {String} [options.prefix] - If set only return keys beginning with
 *   the prefix value.
 * @param {String} [options.delimiter] - If set return a list of distinct
 *   folders based on splitting keys by the delimiter.
 * @param {Function} callback - Callback of the form function (error, string[]).
 */
function listKeys(options, callback) {
    var keys = [];

    /**
    * Recursively list keys.
    *
    * @param {String|undefined} marker - A value provided by the S3 API
    *   to enable paging of large lists of keys. The result set requested
    *   starts from the marker. If not provided, then the list starts
    *   from the first key.
    */
    function listKeysRecusively(marker) {

        options.marker = marker;

        listKeyPage(options, function (error, nextMarker, keyset) {
            if (error) {
                return callback(error, keys);
            }

            keys = keys.concat(keyset);

            if (nextMarker) {
                listKeysRecusively(nextMarker);
            } else {
                callback(null, keys);
            }
        });
    }

    // Start the recursive listing at the beginning, with no marker.
    listKeysRecusively();
}

/**
 * List one page of a set of keys from the specified bucket.
 *
 * If providing a prefix, only keys matching the prefix will be returned.
 *
 * If providing a delimiter, then a set of distinct path segments will be
 * returned from the keys to be listed. This is a way of listing "folders"
 * present given the keys that are there.
 *
 * If providing a marker, list a page of keys starting from the marker
 * position. Otherwise return the first page of keys.
 *
 * @param {Object} options
 * @param {String} options.bucket - The bucket name.
 * @param {String} [options.prefix] - If set only return keys beginning with
 *   the prefix value.
 * @param {String} [options.delimiter] - If set return a list of distinct
 *   folders based on splitting keys by the delimiter.
 * @param {String} [options.marker] - If set the list only a paged set of keys
 *   starting from the marker.
 * @param {Function} callback - Callback of the form
    function (error, nextMarker, keys).
 */
function listKeyPage(options, callback) {
    let params = {
            Bucket: options.bucket,
            Delimiter: options.delimiter,
            Marker: options.marker,
            MaxKeys: maxKeys,
            Prefix: options.prefix
        },
        s3Client,
        awsConfig = {accessKeyId: config.get('aws').accessKeyId, secretAccessKey: config.get('aws').secretAccessKey, region: 'us-east-1'};


    AWS.config.update(awsConfig);
    s3Client = new AWS.S3();

    s3Client.listObjects(params, function (error, response) {
        if (error) {
            return callback(error);
        } else if (response.err) {
            return callback(new Error(response.err));
        }

        // Convert the results into an array of key strings, or
        // common prefixes if we're using a delimiter.
        var keys, nextMarker, lastKey;
        if (options.delimiter) {
          // Note that if you set MaxKeys to 1 you can see some interesting
          // behavior in which the first response has no response.CommonPrefix
          // values, and so we have to skip over that and move on to the
          // next page.
            keys = _.map(response.CommonPrefixes, function (item) {
                return item.Prefix;
            });
        } else {
            keys = _.map(response.Contents, function (item) {
                return item;
            });
        }

        // Check to see if there are yet more keys to be obtained, and if so
        // return the marker for use in the next request.
        if (response.IsTruncated) {
            if (options.delimiter) {
                // If specifying a delimiter, the response.NextMarker field exists.
                nextMarker = response.NextMarker;
            } else {
                // For normal listing, there is no response.NextMarker
                // and we must use the last key instead.
                lastKey = keys[keys.length - 1];


                nextMarker = lastKey.Key;
            }
        }

        callback(null, nextMarker, keys);
    });
}


function getImagesFromAWS() {
    return new Promise(function (fulfill) {

        listKeys({
            bucket: config.get('aws').bucket,
            prefix: `assets/img/opp/ksa/${config.get('gnsElectiomImgEnv')}/gns/`
        }, function (error, keys) {
            if (error) {
                console.log('Error retrieving images from s3', error);
                log.error(`Error retrieving images from s3: ${error}`);
                fulfill({error: 'Error retrieving images from s3'});
            }

            console.log('Successfully retrieved images from s3, about to fulfill... keys.length: ', keys.length);
            log.debug(`Successfully retrieved images from s3, about to fulfill... keys.length: ${keys.length}`);
            fulfill(filterImages(keys));
        });
    });
}

function isConstantPublishedAlreadyThere(urls, electionStoryUrl) {
    let isStoryThere = false;

    if (urls && urls.length && urls.length > 0) {
        urls.some((url) => {
            if (electionStoryUrl === url) {
                isStoryThere = true;
            }
        });
    }

    return isStoryThere;
}


if ((enableElectionStory === true || enableElectionStory === 'true')
    || (config.get('gnsElectionModuleTest') === true || config.get('gnsElectionModuleTest') === 'true')) {
    s3Images = getImagesFromAWS();
}

function postToLSD(data, feedName) {
    let suffix = (config.get('ENVIRONMENT') === 'prod') ? '' : `-${config.get('ENVIRONMENT')}`,
        endpoint = `/cnn/content/google-newsstand/${feedName}${suffix}.xml`,
        hosts = config.get('lsdHosts');

    debugLog('postToLSD() called');
    log.debug('postToLSD() called');
    // debugLog(data);

    hosts.split(',').forEach((host) => {
        request.post({
            url: `http://${host}${endpoint}`,
            body: data,
            headers: {'Content-Type': 'application/rss+xml'}
        },
        (error/* , response, body*/) => {
            if (error) {
                debugLog(error.stack);
                log.error(error.stack);
            } else {
                debugLog(`Successfully uploaded data to ${hosts} at ${endpoint}`);
                log.debug(`Successfully uploaded data to ${hosts} at ${endpoint}`);
                // debugLog(body);
            }
        });
    });
}


// brute force.  This is not the final solution, but it works just fine
setInterval(() => {
    debugLog('Generate latest Feed interval fired');
    log.debug('Generate latest Feed interval fired');

    if ((enableElectionStory === true || enableElectionStory === 'true')  && s3Images) {
        let constantElectionStoryUpdate = config.get('gnsElectionStoryConstantUpdate'),
            constantElectionStoryUpdateURL = config.get('gnsElectionStoryConstantUpdateURL');

        if ((constantElectionStoryUpdate === 'true' || constantElectionStoryUpdate === true)
            && constantElectionStoryUpdateURL) {
            if (!isConstantPublishedAlreadyThere(latestFG.urls, constantElectionStoryUpdateURL)) {
                latestFG.urls = constantElectionStoryUpdateURL;
            }
        }
    }

    if (latestFG.urls && latestFG.urls.length > 0) {

        if (config.get('gnsTurnOnElectionModule') === true || config.get('gnsTurnOnElectionModule') === 'true') {
            s3Images = getImagesFromAWS();
            s3Images.then(function (data) {

                let electionData = {
                    s3Data: data
                };

                latestFG.processContent(electionData).then(
                    // success
                    (rssFeed) => {
                        console.log(rssFeed);

                        postToLSD(rssFeed, 'latest');

                        // post to LSD endpoint
                        latestFG.urls = 'clear';
                        debugLog(latestFG.urls);
                    },

                    // failure
                    (error) => {
                        console.log(error);
                        log.error(error);
                    }
                );
            });
        } else {
            latestFG.processContent().then(
                // success
                (rssFeed) => {
                    console.log(rssFeed);

                    postToLSD(rssFeed, 'latest');

                    // post to LSD endpoint
                    latestFG.urls = 'clear';
                    debugLog(latestFG.urls);
                },

                // failure
                (error) => {
                    console.log(error);
                    log.error(error);
                }
            );
        }
    } else {
        debugLog('no updates');
        log.debug('Generate latest Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate entertainment Feed interval fired');
    log.debug('Generate entertainment Feed interval fired');

    if (entertainmentFG.urls && entertainmentFG.urls.length > 0) {
        entertainmentFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'entertainment');

                // post to LSD endpoint
                entertainmentFG.urls = 'clear';
                debugLog(entertainmentFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
                log.error(error);
            }
        );
    } else {
        debugLog('no updates');
        log.debug('Generate entertainment Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate health Feed interval fired');
    log.debug('Generate health Feed interval fired');

    if (healthFG.urls && healthFG.urls.length > 0) {
        healthFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'health');

                // post to LSD endpoint
                healthFG.urls = 'clear';
                debugLog(healthFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
                log.error(error);
            }
        );
    } else {
        debugLog('no updates');
        log.debug('Generate health Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate opinions Feed interval fired');
    log.debug('Generate opinions Feed interval fired');

    if (opinionsFG.urls && opinionsFG.urls.length > 0) {
        opinionsFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'opinions');

                // post to LSD endpoint
                opinionsFG.urls = 'clear';
                debugLog(opinionsFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
                log.error(error);
            }
        );
    } else {
        debugLog('no updates');
        log.debug('Generate opinions Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate politics Feed interval fired');
    log.debug('Generate politics Feed interval fired');

    if ((enableElectionStory === true || enableElectionStory === 'true')  && s3Images) {
        let constantElectionStoryUpdate = config.get('gnsElectionStoryConstantUpdate'),
            constantElectionStoryUpdateURL = config.get('gnsElectionStoryConstantUpdateURL');


        if ((constantElectionStoryUpdate === 'true' || constantElectionStoryUpdate === true)
            && constantElectionStoryUpdateURL) {
            if (!isConstantPublishedAlreadyThere(politicsFG.urls, constantElectionStoryUpdateURL)) {
                politicsFG.urls = constantElectionStoryUpdateURL;
            }
        }
    }

    if (politicsFG.urls && politicsFG.urls.length > 0) {

        if (config.get('gnsTurnOnElectionModule') === true || config.get('gnsTurnOnElectionModule') === 'true') {
            s3Images = getImagesFromAWS();
            s3Images.then(function (data) {

                let electionData = {
                    s3Data: data
                };

                politicsFG.processContent(electionData).then(
                    // success
                    (rssFeed) => {
                        console.log(rssFeed);

                        postToLSD(rssFeed, 'politics');

                        // post to LSD endpoint
                        politicsFG.urls = 'clear';
                        debugLog(politicsFG.urls);
                    },

                    // failure
                    (error) => {
                        console.log(error);
                        log.error(error);
                    }
                );
            });
        } else {
            politicsFG.processContent().then(
                // success
                (rssFeed) => {
                    console.log(rssFeed);

                    postToLSD(rssFeed, 'politics');

                    // post to LSD endpoint
                    politicsFG.urls = 'clear';
                    debugLog(politicsFG.urls);
                },

                // failure
                (error) => {
                    console.log(error);
                    log.error(error);
                }
            );
        }
    } else {
        debugLog('no updates');
        log.debug('Generate politics Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate tech Feed interval fired');
    log.debug('Generate tech Feed interval fired');

    if (techFG.urls && techFG.urls.length > 0) {
        techFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'tech');

                // post to LSD endpoint
                techFG.urls = 'clear';
                debugLog(techFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
                log.error(error);
            }
        );
    } else {
        debugLog('no updates');
        log.debug('Generate tech Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate us Feed interval fired');
    log.debug('Generate us Feed interval fired');

    if (usFG.urls && usFG.urls.length > 0) {
        usFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'us');

                // post to LSD endpoint
                usFG.urls = 'clear';
                debugLog(usFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
                log.error(error);
            }
        );
    } else {
        debugLog('no updates');
        log.debug('Generate us Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate world Feed interval fired');
    log.debug('Generate world Feed interval fired');

    if (worldFG.urls && worldFG.urls.length > 0) {
        worldFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'world');

                // post to LSD endpoint
                worldFG.urls = 'clear';
                debugLog(worldFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
                log.error(error);
            }
        );
    } else {
        debugLog('no updates');
        log.debug('Generate world Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate money Feed interval fired');

    if (moneyFG.urls && moneyFG.urls.length > 0) {
        moneyFG.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                postToLSD(rssFeed, 'money');

                // post to LSD endpoint
                moneyFG.urls = 'clear';
                debugLog(moneyFG.urls);
            },

            // failure
            (error) => {
                console.log(error);
            }
        );
    } else {
        debugLog('no updates');
    }
}, config.get('gnsTaskIntervalMS'));

setInterval(() => {
    debugLog('Generate election Feed interval fired');
    log.debug('Generate election Feed interval fired');

    if ((enableElectionStory === true || enableElectionStory === 'true')
        || (config.get('gnsElectionModuleTest') === true || config.get('gnsElectionModuleTest') === 'true')
        && s3Images) {
        let constantElectionStoryUpdate = config.get('gnsElectionStoryConstantUpdate'),
            constantElectionStoryUpdateURL = config.get('gnsElectionStoryConstantUpdateURL');


        if ((constantElectionStoryUpdate === 'true' || constantElectionStoryUpdate === true) ||
            (config.get('gnsElectionModuleTest') === true || config.get('gnsElectionModuleTest') === 'true')
            && constantElectionStoryUpdateURL) {
            if (!isConstantPublishedAlreadyThere(electionsFG.urls, constantElectionStoryUpdateURL)) {
                electionsFG.urls = constantElectionStoryUpdateURL;
                console.log('Constant election story update added for: ', constantElectionStoryUpdateURL, 'election URL array: ', electionsFG.urls);
                log.debug(`Constant election story update added for: ${constantElectionStoryUpdateURL} | election URL array: ${electionsFG.urls}`);
            }
        }
    }

    if (electionsFG.urls && electionsFG.urls.length > 0) {
        if ((enableElectionStory === true || enableElectionStory === 'true') || (config.get('gnsElectionModuleTest') === true || config.get('gnsElectionModuleTest') === 'true') && s3Images) {
            s3Images = getImagesFromAWS();
            s3Images.then(function (data) {

                let electionData = {
                    s3Data: data,
                    electionTest: config.get('gnsElectionModuleTest')
                };

                electionsFG.processContent(electionData).then(
                    // success
                    (rssFeed) => {
                        console.log(rssFeed);

                        postToLSD(rssFeed, '2016-elections');

                        // post to LSD endpoint
                        electionsFG.urls = 'clear';
                        debugLog(electionsFG.urls);
                    },

                    // failure
                    (error) => {
                        console.log(error);
                        log.error(error);
                    }
                );
            });
        } else {
            electionsFG.processContent().then(
                // success
                (rssFeed) => {
                    console.log(rssFeed);

                    postToLSD(rssFeed, '2016-elections');

                    // post to LSD endpoint
                    electionsFG.urls = 'clear';
                    debugLog(electionsFG.urls);
                },

                // failure
                (error) => {
                    console.log(error);
                    log.error(error);
                }
            );
        }
    } else {
        debugLog('no updates');
        log.debug('Generate election Feed: no updates');
    }
}, config.get('gnsTaskIntervalMS'));
