/* globals before, describe, it */

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


describe('Hapi Server', function () {
    before(function () {
        this.server = require('../../server.js');
        this.server.register(require('inject-then'), function (error) {
            if (error) {
                throw error;
            }
        });
    });

    it('should serve a /healthcheck in a valid JSON format with, at minimum, a version property', function () {
        const expectedVersion = require('../../package.json').version;

        return this.server.injectThen('/healthcheck').then(function (response) {
            response.statusCode.should.equal(200);
            response.result.should.be.an('object');
            response.result.version.should.be.a('string');
            response.result.version.should.equal(expectedVersion);
        });
    });

    it('should serve swagger on /documentation', function () {
        return this.server.injectThen('/documentation').then(function (response) {
            response.statusCode.should.equal(200);
            response.result.should.contain('swaggerui');
        });
    });

    it('should 302 redirect / to /documentation', function () {
        return this.server.injectThen('/').then(function (response) {
            response.statusCode.should.equal(302);
            response.headers.location.should.equal('/documentation');
        });
    });
});
