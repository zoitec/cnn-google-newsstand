// http://www.cnn.com/2016/07/19/sport/jockey-horse-diets/index.html

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

const request = require('request'),
    FeedGenerator = require('../lib/feed-generator.js'),
    debugLog = require('debug')('cnn-google-newsstand:Task:generate-static-feed'),
    config = require('../config.js'),
    fg = new FeedGenerator();



function postToLSD(data) {
    let endpoint = '/cnn/content/google-newsstand/articles3.xml',  // TODO - SET THIS TO THE CORRECT ENDPOINT BEFORE RUNNING
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



fg.urls = [
    // 'http://www.cnn.com/2016/08/08/opinions/mcmullin-mormon-hope-for-conservatives-stanley/index.html'
    // 'http://www.cnn.com/2016/08/08/sport/aly-raisman-parents-olympics-trnd/index.html' // page top image
    'http://www.cnn.com/2016/08/08/sport/office-olympics-for-the-rest-of-us-trnd/index.html' // page top video
    // 'http://www.cnn.com/2016/07/22/architecture/leaning-house-jakarta-architecture/index.html'
    // 'http://www.cnn.com/2016/07/19/sport/jockey-horse-diets/index.html',
    // 'http://www.cnn.com/2016/07/18/travel/national-seashore-lakeshore-towns-nps100/index.html'
];

if (fg.urls && fg.urls.length > 0) {
    fg.processContent().then(
        // success
        (rssFeed) => {
            console.log(rssFeed);

            postToLSD(rssFeed);

            // post to LSD endpoint
            fg.urls = 'clear';
        },

        // failure
        (error) => {
            console.log(error);
        }
    );
} else {
    debugLog('no updates');
}
