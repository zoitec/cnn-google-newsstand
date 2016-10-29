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
    'GNS_ENABLE_ELECTION_STORY',
    'GNS_ELECTION_TITLE',
    'GNS_ELECTION_SLUG',
    'GNS_ELECTION_CAPTION',
    'GNS_ELECTION_STORY_CONSTANT_UPDATE',
    'GNS_ELECTION_STORY_CONSTANT_UPDATE_URL',
    'GNS_ELECTION_LOWER_HEADER',
    'GNS_ELECTION_MODULE_LINK_1',
    'GNS_ELECTION_MODULE_LINK_2',
    'ACCESS_KEY_ID',
    'SECRET_ACCESS_KEY',
    'PORT'
]);



// These are required to be set to start up
if (!nconf.get('ENVIRONMENT') || !nconf.get('PORT') || !nconf.get('CLOUDAMQP_AUTH') || !nconf.get('ACCESS_KEY_ID') || !nconf.get('SECRET_ACCESS_KEY')) {
    console.error('ENVIRONMENT, PORT, CLOUDAMQP_AUTH, ACCESS_KEY_ID and/or SECRET_ACCESS_KEY are not set');
    process.exit(1);
}

let blackList = [
        /\/studentnews\//,
        /\/videos\/spanish\//,
        /fast-facts\/index.html$/,
        /\/applenews-live.*/,
        /cnn.com\/\d{4}\/\d{2}\/\d{2}\/cnn-info/ // https://regex101.com/r/yT0jX6/1
    ],
    config = {
        default: {
            cloudamqpConnectionString: `amqp://${nconf.get('CLOUDAMQP_AUTH')}@red-rhino.rmq.cloudamqp.com/cnn-towncrier`,
            gnsBlackList: (nconf.get('GNS_BLACK_LIST')) ? JSON.parse(nconf.get('GNS_BLACK_LIST')) : blackList,
            gnsTaskIntervalMS: (nconf.get('GNS_TASK_INTERVAL_MS')) ? parseInt(nconf.get('GNS_TASK_INTERVAL_MS')) : 1000 * 60 * 30, // 30 minutes
            lsdHosts: 'lsd-prod-pub-cop.turner.com,lsd-prod-pub-56m.turner.com',
            exchangeName: 'cnn-town-crier-ref',
            queueNameArticles: `cnn-google-newsstand-articles-${nconf.get('ENVIRONMENT').toLowerCase()}`,
            queueNameVideos: `cnn-google-newsstand-videos-${nconf.get('ENVIRONMENT').toLowerCase()}`,
            routingKeysArticles: ['cnn.article'],
            routingKeysVideos: ['cnn.video'],
            gnsTurnOnElectionModule: (nconf.get('GNS_ENABLE_ELECTION_STORY')) ? nconf.get('GNS_ENABLE_ELECTION_STORY') : false,
            gnsElectionSlug: (nconf.get('GNS_ELECTION_SLUG')) ? nconf.get('GNS_ELECTION_SLUG') : 'trump-bus-denmark-trnd',
            gnsElectionCaption: (nconf.get('GNS_ELECTION_CAPTION')) ? nconf.get('GNS_ELECTION_CAPTION') : 'A candidate needs 270 Electoral College votes to win the presidency. These modules show the total Electoral College votes and when a state has a projected winner (Maine and Nebraska allow Electoral College votes to be split). Not all candidates are listed. All party representation can be seen in the full results. CNN will broadcast a projected winner only after an extensive review of data from a number of sources.',
            gnsElectionTitle: (nconf.get('GNS_ELECTION_TITLE')) ? nconf.get('GNS_ELECTION_TITLE') : 'Presidential Results',
            gnsElectionStoryConstantUpdate: (nconf.get('GNS_ELECTION_STORY_CONSTANT_UPDATE')) ? nconf.get('GNS_ELECTION_STORY_CONSTANT_UPDATE') : false,
            gnsElectionStoryConstantUpdateURL: (nconf.get('GNS_ELECTION_STORY_CONSTANT_UPDATE_URL')) ? nconf.get('GNS_ELECTION_STORY_CONSTANT_UPDATE_URL') : 'http://www.cnn.com/2016/10/28/politics/trump-bus-denmark-trnd/index.html',
            gnsElectionModuleLowerHeader: (nconf.get('GNS_ELECTION_LOWER_HEADER')) ? nconf.get('GNS_ELECTION_LOWER_HEADER') : 'Election Day Highlights',
            gnsElectionModuleLink1: (nconf.get('GNS_ELECTION_MODULE_LINK_1')) ? nconf.get('GNS_ELECTION_MODULE_LINK_1') : '<p class="style-id:electionLinks"><a class="style-id:electionLink" href="http://www.cnn.com">Full&nbsp;Election&nbsp;Results</a> | <a class="style-id:electionLink" href="http://www.cnn.com">Presidential</a> | <a class="style-id:electionLink" href="http://www.cnn.com">Senate</a> | <a class="style-id:electionLink" href="http://www.cnn.com">House</a> | <a class="style-id:electionLink" href="http://www.cnn.com">Governer</a> | <a class="style-id:electionLink" href="http://www.cnn.com">Ballot&nbsp;Measures</a> | <a class="style-id:electionLink" href="http://www.cnn.com">Exit&nbsp;Polls</a></p>',
            gnsElectionModuleLink2: (nconf.get('GNS_ELECTION_MODULE_LINK_2')) ? nconf.get('GNS_ELECTION_MODULE_LINK_2') : '',
            aws: {
                accessKeyId: nconf.get('ACCESS_KEY_ID'),
                secretAccessKey: nconf.get('SECRET_ACCESS_KEY'),
                region: 'us-east-1',
                bucket: 'registry.api.cnn.io'
            }
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
