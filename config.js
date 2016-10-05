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


const nconf = require('nconf');



// whitelist environment variables
nconf.env([
    'CLOUDAMQP_AUTH',
    'ENVIRONMENT',
    'GNS_BLACK_LIST',
    'GNS_TASK_INTERVAL_MS',
    'PORT'
]);



// These are required to be set to start up
if (!nconf.get('ENVIRONMENT') || !nconf.get('PORT') || !nconf.get('CLOUDAMQP_AUTH')) {
    console.error('ENVIRONMENT, PORT, and/or CLOUDAMQP_AUTH are not set');
    process.exit(1);
}



let config = {
    default: {
        cloudamqpConnectionString: `amqp://${nconf.get('CLOUDAMQP_AUTH')}@red-rhino.rmq.cloudamqp.com/cnn-towncrier`,
        gnsBlackList: (nconf.get('GNS_BLACK_LIST')) ? JSON.parse(nconf.get('GNS_BLACK_LIST')) : [/\/studentnews\//,/\/videos\/spanish\//,/fast-facts\/index.html$/,/cnn.com\/\d{4}\/\d{2}\/\d{2}\/cnn-info/],
        gnsTaskIntervalMS: (nconf.get('GNS_TASK_INTERVAL_MS')) ? parseInt(nconf.get('GNS_TASK_INTERVAL_MS')) : 1000 * 60 * 30, // 30 minutes
        lsdHosts: 'lsd-prod-pub-cop.turner.com,lsd-prod-pub-56m.turner.com',
        exchangeName: 'cnn-town-crier-ref',
        queueNameArticles: `cnn-google-newsstand-articles-${nconf.get('ENVIRONMENT').toLowerCase()}`,
        queueNameVideos: `cnn-google-newsstand-videos-${nconf.get('ENVIRONMENT').toLowerCase()}`,
        routingKeysArticles: ['cnn.article'],
        routingKeysVideos: ['cnn.video']
    },
    prod: {
        cloudamqpConnectionString: `amqp://${nconf.get('CLOUDAMQP_AUTH')}@red-rhino.rmq.cloudamqp.com/cnn-towncrier`,
        exchangeName: 'cnn-town-crier-prod',
        queueNameArticles: 'cnn-google-newsstand-articles-prod'
    }
};



// load the correct config based on environment
switch (nconf.get('ENVIRONMENT').toLowerCase()) {
    case 'prod':
        nconf.defaults(config.prod);
        break;

    default:
        nconf.defaults(config.default);
}



// Load overrides that don't override anything, they fill in the blanks
nconf.overrides(config.default);



module.exports = nconf;
