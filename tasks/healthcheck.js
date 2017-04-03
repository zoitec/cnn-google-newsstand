'use strict';
require('isomorphic-fetch');
const health = require('cnn-health'),
    customCheck = require('../lib/healthcheck/customcheck/custom.check');

let theCheck;


/**
*Custom health check config
*/
function setUpCustomConfigCheck() {
    theCheck = health.runCustomCheck(customCheck());
}

function runCheckGetStatus() {
    return theCheck.getStatus();
}

setUpCustomConfigCheck();

module.exports = {
    getStatus: runCheckGetStatus
};