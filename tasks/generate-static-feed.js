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

 /*
  * This is a debugging task to post specific articles to a specific endpoint.
  *
  * $ ENVIRONMENT=local PORT=5000 CLOUDAMQP_AUTH=foo node tasks/generate-static-feed.js
  *
  * You can also manually capture the feed and push it with:
  *
  * $ for dc in cop 56m; do curl -H "Content-Type: application/rss+xml" --data @test.ig.test/test9.xml lsd-prod-pub-${dc}.turner.com/cnn/content/google-newsstand/test6.xml; done
  */

'use strict';

const  request = require('request'),
    AWS = require('aws-sdk'),
    FeedGenerator = require('../lib/feed-generator.js'),
    debugLog = require('debug')('cnn-google-newsstand:Task:generate-static-feed'),
    config = require('../config.js'),
    fg = new FeedGenerator(),
    enableElectionStory = config.get('gnsTurnOnElectionModule'),
    POST_TO_LSD = false; // <---- TODO - SET THIS TO THE PROPER VALUE BASED ON WHAT YOU ARE WANTING TO DO

let s3Images = undefined;

function postToLSD(data) {
    let endpoint = '/cnn/content/google-newsstand/test-not-public-9.xml',  // <---- TODO - SET THIS TO THE CORRECT ENDPOINT BEFORE RUNNING
        hosts = config.get('lsdHosts');

    debugLog('postToLSD() called');
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
            } else {
                debugLog(`Successfully uploaded data to ${hosts} at ${endpoint}`);
                // debugLog(body);
            }
        });
    });
}

function filterImages(data) {
    let filteredImages = [],
        contents = data.Contents,
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

    filteredImages = filteredImages.sort(function (a, b) {
        return new Date(b.time) - new Date(a.time);
    });

    return filteredImages;
}


function getImagesFromAWS() {
    return new Promise(function (fulfill) {

        let awsConfig = {accessKeyId: config.get('aws').accessKeyId, secretAccessKey: config.get('aws').secretAccessKey, region: 'us-east-1'},
            bucket = config.get('aws').bucket,
            s3obj,
            prefixStr = `assets/img/opp/ksa/${config.get('ENVIRONMENT')}/gns/`,
            params = {Bucket: bucket, Prefix: prefixStr};

        AWS.config.update(awsConfig);
        s3obj = new AWS.S3();

        s3obj.listObjects(params, (err, data) => {
            if (err) {
                console.log('Error retrieving images from s3', err);
                fulfill({error: 'Error retrieving images from s3'});
            } else {
                console.log('Successfully retrieved images from s3');
                fulfill(filterImages(data));
            }
        });
    });
}

function isConstantPublishedAlreadyThere(urls, electionStoryUrl) {
    let isStoryThere = false;

    urls.some((url) => {
        if (electionStoryUrl === url) {
            isStoryThere = true;
        }
    });

    return isStoryThere;
}

if (enableElectionStory === true || enableElectionStory === 'true') {
    s3Images = getImagesFromAWS();
}

fg.urls = [
    'http://www.cnn.com/2016/10/29/asia/south-korea-reshuffle/index.html'
    // 'http://www.cnn.com/2016/08/08/opinions/mcmullin-mormon-hope-for-conservatives-stanley/index.html'
 //   'http://www.cnn.com/2016/08/08/sport/aly-raisman-parents-olympics-trnd/index.html' // page top image
    // 'http://www.cnn.com/2016/08/08/sport/office-olympics-for-the-rest-of-us-trnd/index.html' // page top video
    // 'http://www.cnn.com/2016/08/08/sport/aly-raisman-parents-olympics-trnd/index.html' // page top image
//    'http://www.cnn.com/2016/08/08/sport/office-olympics-for-the-rest-of-us-trnd/index.html', // page top video
    // 'http://www.cnn.com/2016/08/09/health/parent-acts-teaching-kids-empathy/index.html' // page top video collection
    // 'http://www.cnn.com/2016/07/27/us/freddie-gray-verdict-baltimore-officers/index.html' // page top video collection / inline video / inline images
    // 'http://www.cnn.com/2016/08/15/opinions/is-trump-getting-ready-to-lose-stanley/index.html'
    // 'http://www.cnn.com/2016/08/15/health/parents-life-expectancy-heart-health/index.html' //
    // 'http://www.cnn.com/2016/08/10/politics/trump-second-amendment/index.html'//
    //  'http://www.cnn.com/2016/07/22/architecture/leaning-house-jakarta-architecture/index.html',
    // 'http://www.cnn.com/2016/07/19/sport/jockey-horse-diets/index.html',
    // 'http://www.cnn.com/2016/07/18/travel/national-seashore-lakeshore-towns-nps100/index.html'
    // 'http://www.cnn.com/2016/08/15/us/gabby-douglas-natalie-hawkins-new-day/index.html', // twitter embeds
    // 'http://www.cnn.com/2015/10/13/politics/democratic-debate-2016-instagram/index.html' // ig embeds
    // 'http://www.cnn.com/2016/09/05/hotels/presidential-hotel-suites/index.html' // page top gallery
//     'http://www.cnn.com/2016/08/16/opinions/larry-wilmore-cancellation-obeidallah/index.html' // editors note  / image / video
//    'http://www.cnn.com/2016/08/19/entertainment/amy-schumer-charlie-rose/index.html', // youtube
//    'http://www.cnn.com/2015/10/14/politics/democratic-debate-in-gifs-vines-clinton-sanders-reaction/index.html' // vine
//    'http://www.cnn.com/2016/01/05/politics/primary-conflicts-2016/index.html' // vimeo
    // videos
    // 'http://www.cnn.com/videos/politics/2016/09/20/who-stole-naked-trump-moos-pkg-erin.cnn'
//    'http://www.cnn.com/videos/us/2016/09/01/midway-atoll-plastic-island-obama-visits-wildlife-refuge-marine-reserve-orig.cnn'
//    'http://www.cnn.com/videos/entertainment/2016/08/30/chance-the-rapper-beyonce-mtv-vma-orig-vstan.cnn',
//    'http://www.cnn.com/videos/us/2016/09/01/houston-crosswalks-vandalized-pkg.ktrk'
    // 'http://www.cnn.com/2016/09/20/politics/gun-control-law-court/index.html'
    // 'http://www.cnn.com/2016/09/26/opinions/clinton-needs-obama-bernstein-opinion/index.html'
//    'http://www.cnn.com/2014/06/09/world/boko-haram-fast-facts/index.html'
   // 'http://www.cnn.com/videos/us/2016/09/01/houston-crosswalks-vandalized-pkg.ktrk'
   // 'http://www.cnn.com/2016/09/20/politics/gun-control-law-court/index.html',
   // 'http://ref.next.cnn.com/2016/10/12/politics/test-election-day-2016-highlights/index.html'
    // 'http://www.cnn.com/2016/09/26/opinions/clinton-needs-obama-bernstein-opinion/index.html',
//    'http://www.cnn.com/2016/10/28/politics/donald-trump-election-2016/index.html'
];

if (fg.urls && fg.urls.length > 0) {


    if (s3Images) {

        s3Images.then(function (data) {

            let constantElectionStoryUpdate = config.get('gnsElectionStoryConstantUpdate'),
                constantElectionStoryUpdateURL = config.get('gnsElectionStoryConstantUpdateURL');

            if ((constantElectionStoryUpdate === 'true' || constantElectionStoryUpdate === true) && constantElectionStoryUpdateURL) {
                if (!isConstantPublishedAlreadyThere(fg.urls, constantElectionStoryUpdateURL)) {
                    fg.urls.unshift(constantElectionStoryUpdateURL);
                }
            }

            fg.processContent({s3Data: data}).then(
                // success
                (rssFeed) => {
                    console.log(rssFeed);

                    if (POST_TO_LSD) {
                        postToLSD(rssFeed);
                    }

                    // post to LSD endpoint
                    fg.urls = 'clear';
                },

                // failure
                (error) => {
                    console.log(`Error: ${error}`);
                }
            );
        });
    } else {
        fg.processContent().then(
            // success
            (rssFeed) => {
                console.log(rssFeed);

                if (POST_TO_LSD) {
                    postToLSD(rssFeed);
                }

                // post to LSD endpoint
                fg.urls = 'clear';
            },

            // failure
            (error) => {
                console.log(`Error: ${error}`);
            }
        );
    }
} else {
    debugLog('no updates');
}
