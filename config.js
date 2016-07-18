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
        defaultTaskInterval: 1000 * 60 * 1,
        lsdHosts: 'lsd-prod-pub-cop.turner.com,lsd-prod-pub-56m.turner.com'
    },
    prod: {
        cloudamqpConnectionString: `amqp://${nconf.get('CLOUDAMQP_AUTH')}@red-rhino.rmq.cloudamqp.com/cnn-towncrier`
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
