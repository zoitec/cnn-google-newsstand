'use strict';

const request = require('request'),
    config = require('../config'),
    //  exec = require('child_process').exec,
    //  fs = require('fs'),
    logConfig = config.get('logConfig'),
    log = require('cnn-logger')(logConfig),
    lsd = require('lsd-api');

/**
 * Add quizId + cmsUrl here manually
 * Run `npm run process-quiz`
 * Check LSD for <quizId>.json + updated quizzes.json
 */
let quizId = '590b5a9943fc76060032dccc',
    cmsUrl = 'http://www.cnn.com/2017/05/05/entertainment/applenews-quiz-soundtracks-song-meanings/index.html',
    quiz;

/**
 * GETs quiz from ISB API
 */
getQuiz(quizId, cmsUrl).then(
    (response) => {
        quiz = JSON.parse(response);

        /**
        * POST quiz to LSD. Must use <quizId>.json.
        */
        postToLsd(quiz, `/cnn/content/gns/quizzes/${quiz['_id']}.json`);

         /**
          * GET current quizzes.json from LSD
          */
        getFromLsd('/content/gns/quizzes.json').then(
         /**
          * Add new quiz to quizzes.json
          * POST updated quizzes.json to LSD
          */
        (response) => {
            response.body[cmsUrl] = {
                quizId: quiz['_id']
            };

            log.silly('Quiz added to quizzes.json', response.body);

            postToLsd(response.body, '/cnn/content/gns/quizzes.json');
        }).catch((error) => {
            log.error('getFromLsd catch', error);
        });
    }
 ).catch((error) => {
     log.error('getQuiz catch', error);
 });



/**
 * getQuiz
 * Gets a quiz from ISB API
 *
 * We currently are only hooked up to prod environment because the ISB dev
 * datastore for quizzes is empty unless add a quiz manually.
 *
 * To test in dev, use:
 * http://cnn-isb-api.dev.services.ec2.dmtio.net:5000/rest/v1/quizzes/getdata
 *
 * @param  {String} quizId
 * Id from ISB of the quiz.
 *
 * @param  {String} cmsUrl
 * CMS generated URL for the piece of content to associate to this quiz.
 *
 * @return {Promise}
 * Returns a promise.
 */
// function getQuiz(quizId, cmsUrl) {
function getQuiz(quizId) {
    let result;

    return new Promise((resolve, reject) => {
        request(`http://isb-api.inturner.io:5000/rest/v1/quizzes/getdata/${quizId}`, (error, response, body) => {
            if (error) {
                log.error(`Error getQuiz: ${JSON.stringify(error)}`);
                reject(error);
            }

            if (body) {
                log.silly('POSTing Quiz to LSD');
                result = body;
            } else {
                log.silly('Could not GET quiz from ISB API');
            }

            resolve(result);
        });
    });
}



/**
 * GETs current quizzes.json from LSD
 *
 * @param  {string} endpoint
 * Endpoint to GET data from on LSD.
 *
 * @return {Promise}
 * Returns a promise.
 */
function getFromLsd(endpoint) {
    return new Promise((resolve, reject) => {
        lsd.get({
            hosts: 'http://data.cnn.com', // can do multihosts...just use comma
            endpoint: endpoint
        }, function (error, response) {
            if (error) {
                log.error(`Error posting quiz: ${JSON.stringify(error)}`);
                reject(error);
            } else {
                log.silly('Success! Response from GET quizzes', response.body);
                resolve(response);
            }
        });
    });
}



/**
 * POST to LSD
 * @param  {Object} data
 * Data that should be posted to LSD.
 *
 * @param  {String} endpoint
 * Endpoint to POST data to on LSD.
 */
function postToLsd(data, endpoint) {
    lsd.post({
        data,
        hosts: 'lsd-prod-pub-cop.turner.com,lsd-prod-pub-56m.turner.com',
        endpoint: endpoint
    }, function (error, response) {
        if (error) {
            log.error(`Error posting to LSD: ${JSON.stringify(error)}`);
        } else {
            log.silly('Success! Response from LSD POST', response.body);
        }
    });
}