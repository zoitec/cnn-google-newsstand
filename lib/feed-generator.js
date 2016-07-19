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

const ContentRetriever = require('cnn-content-retriever'),
    async = require('async'),
    debug = require('debug');



/**
 * Generates an RSS feed for Google Newsstand from a single url String or an
 * Array of String urls.  The urls must be valid urls that have been indexed by
 * Hypatia.  Duplicate urls in the Array will be removed.
 *
 * @example
 * 'use strict';
 *
 * const urls = [
 *         'http://www.cnn.com/2016/06/08/travel/hokulea-worldwide-voyage-world-oceans-day/index.html',
 *         'http://www.cnn.com/2016/02/15/travel/russia-lake-baikal/index.html'
 *     ];
 *
 * const fg = new FeedGenerator(urls);
 *
 * @example
 * 'use strict';
 *
 * const fg = new FeedGenerator('http://www.cnn.com/2016/02/15/travel/russia-lake-baikal/index.html');
 *
 * @example
 * 'use strict';
 *
 * const fg = new FeedGenerator();
 *
 * fg.urls = [
 *     'http://www.cnn.com/2016/06/08/travel/hokulea-worldwide-voyage-world-oceans-day/index.html',
 *     'http://www.cnn.com/2016/02/15/travel/russia-lake-baikal/index.html'
 * ];
 */
class FeedGenerator {
    /**
     * @param {String|Array<String>} [urls]
     * An array of string urls to lookup in Hypatia.  If a single url is used as
     * a String it will be converted to an Array.
     */
    constructor(urls) {
        this.blacklist = [
            /\/studentnews\//,
            /\/videos\/spanish\//,
            /fast-facts\/index.html$/,
            /money.cnn.com\/video\//,
            /money.cnn.com\/gallery\//,
            /cnn.com\/\d{4}\/\d{2}\/\d{2}\/cnn-info/ // https://regex101.com/r/yT0jX6/1
        ];

        if (urls) {
            this.urls = urls;
        }
    }



    /**
     * - Appends to the blacklist of urls not to process
     * - There is currently no way to remove items from the blacklist
     * - Should be an array of regular expression patterns to test against.
     *
     * @param {Array<RegExp>} [blacklistRegexps]
     */
    set blacklist(blacklistRegexps) {
        if (typeof blacklistRegexps === 'string') {
            blacklistRegexps = [blacklistRegexps];
        }

        this._blacklist = (this._blacklist) ? this._blacklist.push(blacklistRegexps) : blacklistRegexps;
    }

    /**
     * Gets the blacklist of urls not to process.
     *
     * @type {Array<RegExp>}
     */
    get blacklist() {
        return this._blacklist;
    }



    /**
     * - Sets or appends to the existing array of string urls to lookup
     * - If a single url is used as a String it will be converted to an Array
     * - There is currently no way to remove a url from the list
     *
     * @type {String|Array<String>}
     *
     * @example
     * 'use strict';
     *
     * const fg = new FeedGenerator();
     *
     * fg.urls = [
     *     'http://www.cnn.com/2016/06/08/travel/hokulea-worldwide-voyage-world-oceans-day/index.html',
     *     'http://www.cnn.com/2016/02/15/travel/russia-lake-baikal/index.html'
     * ];
     */
    set urls(urls) {
        const self = this,
            debugLog = debug('cnn-google-newsstand:FeedGenerator:urls-setter');

        if (urls === 'clear') {
            this._urls = [];
        } else {
            let existingUrls = this._urls || [], // this will be the current value of the urls set on the instance
                filteredUrls = [];               // this will be all of the urls after removing blacklist items

            if (typeof urls === 'string') {
                urls = [urls];
            }

            // add the existingUrls + the new url(s) to be set together and filter based on blacklist
            existingUrls.concat(urls).forEach((url) => {
                if (!self.isOnBlacklist(url)) {
                    debugLog(`Not on blacklist, adding to filteredUrls: ${url}`);
                    filteredUrls.push(url);
                }
            });

            // remove all duplicates and set
            this._urls = Array.from(new Set(filteredUrls));
        }
    }

    /**
     * Gets the array of urls that is set on the instance.
     *
     * @type {Array<String>}
     *
     * @example
     * 'use strict';
     *
     * const fg = new FeedGenerator('http://www.cnn.com/2016/02/15/travel/russia-lake-baikal/index.html');
     *
     * console.log(fg.urls);
     */
    get urls() {
        return this._urls;
    }



    /**
     * Generates an RSS feed from the resolved models passed into it.
     *
     * @private
     *
     * @param {Array} contentModels
     * An array of resolved models from hypatia.
     *
     * @returns {Promise}
     */
    generateFeed(contentModels) {
        const debugLog = debug('cnn-google-newsstand:FeedGenerator:generateFeed');

        return new Promise((resolve) => {
            let feed = '<?xml version="1.0" encoding="UTF-8"?>';

            feed += '<rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" version="2.0">';
            feed += '<channel>';
            feed += '<title>CNN</title>';
            feed += '<link>http://www.cnn.com/</link>';
            feed += '<description>CNN - Breaking News, Daily News and Videos</description>';
            feed += '<language>en-us</language>';
            feed += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

            contentModels.forEach((contentModel) => {
                debugLog(`Mapping: ${contentModel.docs[0].url}`);
                let title = contentModel.docs[0].headline || contentModel.docs[0].title;

                feed += '<item>';
                feed += `<title>${title.trim()}</title>`;
                feed += `<link>${contentModel.docs[0].url.trim()}</link>`;
                feed += `<guid isPermaLink="false">${contentModel.docs[0].sourceId.trim()}</guid>`;
                // feed += `<pubDate>${new Date().toUTCString()}</pubDate>`; // USE WHEN DEVELOPING
                feed += `<pubDate>${new Date(contentModel.docs[0].lastModifiedDate).toUTCString()}</pubDate>`;
                // feed += `<author>${contentModel.docs[0].byline}</author>`; // TODO - This needs to be an email address

                // This loops though the relatedMedia for images associated with paragraphs.
                // If it finds any, it should stitch them in the proper place
                contentModel.docs[0].relatedMedia.media.forEach((item) => {
                    let imageCut = '';

                    // possible related media types
                    //
                    //     type           subtype      referenceType      has headline    has cvpXmlUrl    has referenceUrl/Uri     has description    has photographer    has caption    has cuts
                    //     -----------    ---------    -------------      ------------    -------------    ---------------------    ---------------    ----------------    -----------    --------
                    //     interactive    factbox                         no              no               no                       no                 no                  no             no
                    //     reference                   video              yes             yes              yes                      no                 no                  no             yes
                    //     reference                   videoCollection    yes             no               yes                      yes                no                  no             no
                    //     image                                          no              no               yes                      no                 yes                 yes            yes
                    //     interactive    webtag                          no              no               no                       no                 no                  no             no
                    //     reference                   gallery            yes             no               yes                      yes                no                  no             maybe??
                    //     interactive                 includeIE          no              no               no                       no                 no                  no             no
                    //
                    // locations
                    //
                    //     paragraph_*
                    //     pageTop
                    //     tease
                    //
                    // debugLog(JSON.stringify(item));
                    // debugLog(`Related Media item type: ${item.type} ${item.subtype || ''}${item.referenceType || ''}`);
                    // debugLog(`item.location: ${item.location}`);

                    if (item.location === 'pageTop') {
                        debugLog(`item.referenceType: ${item.referenceType}`);
                        // switch (item.referenceType) {
                        //     case 'video':
                        //         // let imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9
                        //         // pageTopHtml = `${pageTopHtml}<img src="${item.cuts[imageCut].url}" height="${item.cuts[imageCut].height}" width="${item.cuts.exlarge16to9.width}"/>`;
                        //         feed += getMediaTagForRelatedMediaItem(item);
                        //         // feed += `<media:content url="${item.cuts[imageCut].url}" type="image/jpg" expression="full" width="${item.cuts[imageCut].width}" height="${item.cuts[imageCut].height}">`;
                        //         //
                        //         // if (item.caption && item.caption.trim()) {
                        //         //     feed += `<media:description type="plain"><![CDATA[${item.caption}]]></media:description>`;
                        //         // }
                        //         //
                        //         // if (item.photographer && item.photographer.trim()) {
                        //         //     feed += `<media:credit role="author" scheme="urn:ebu"><![CDATA[${item.photographer}]]></media:credit>`;
                        //         // }
                        //         //
                        //         // feed += '</media:content>';
                        //         break;
                        // }
                    }

                    // if (/paragraph_.*/.test(item.location)) {
                    //     debugLog(`item location: ${item.location}`);
                    //     debugLog(JSON.stringify(item));
                    // }

                    // **** UNCOMMENT WHEN PROCESSING ALL IMAGES (WHICH WE MAY NEVER DO!) ****
                    if (item.type === 'image') {
                        if (item.location.startsWith('paragraph')) {
                            console.warn('1 FOUND AN IMAGE TO STICK NEXT TO A PARAGRAPH!!!');
                        }

                        imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9
                        feed += `<media:content url="${item.cuts[imageCut].url}" type="image/jpg" expression="full" width="${item.cuts[imageCut].width}" height="${item.cuts[imageCut].height}">`;

                        if (item.caption && item.caption.trim()) {
                            feed += `<media:description type="plain"><![CDATA[${item.caption}]]></media:description>`;
                        }

                        if (item.photographer && item.photographer.trim()) {
                            feed += `<media:credit role="author" scheme="urn:ebu"><![CDATA[${item.photographer}]]></media:credit>`;
                        }

                        feed += '</media:content>';
                    }
                });

                if (contentModel.docs[0].type === 'article') {
                    feed += '<content:encoded><![CDATA[';
                    // feed += `<h1>${contentModel.docs[0].headline.trim()} - 1</h1>`;// `${pageTopHtml}`;

                    // This loops though the paragraphs and checks if there are any elements
                    // that need to be stitched in.  Slightly different than the loop above
                    // that goes though relatedMedia
                    contentModel.docs[0].body.paragraphs.forEach(function (paragraph) {
                        // debugLog(`paragraph: ${JSON.stringify(paragraph)}`);
                        //  **** UNCOMMENT THIS WHEN STITCHING IN IMAGES RELATED TO PARAGRAPHS - MAYBE???? ****
                        // if (paragraph.elements.length > 0) {
                        //     paragraph.elements.forEach(function (paragraph) {
                        //         if (paragraph.target) {
                        //             // possible target values:
                        //             //
                        //             //     type           subtype      has referenceUrl/Uri
                        //             //     -----------    ---------    --------------------
                        //             //     article        null         yes
                        //             //     gallery        null         yes
                        //             //     interactive    factbox      no
                        //             //     interactive    includeIE    no
                        //             //     interactive    webtag       no
                        //             //     image
                        //             //     video          null         yes
                        //             //
                        //             // debugLog(JSON.stringify(paragraph.target));
                        //             debugLog(`  Paragraph Target Type: ${paragraph.target.type} ${paragraph.target.subtype || ''}`);
                        //             if (paragraph.target.type === 'image') {
                        //                 // debugLog(JSON.stringify(paragraph));
                        //                 console.warn('2 FOUND AN IMAGE TO STICK NEXT TO A PARAGRAPH!!!');
                        //             }
                        //         }
                        //     });
                        // }

                        if (typeof paragraph.richtext === 'string') {
                            feed += `<p>${paragraph.richtext.trim()}</p>`;
                        }
                    });

                    feed += ']]></content:encoded>';
                }

                if (contentModel.docs[0].type === 'gallery') {
                    contentModel.docs[0].slides.forEach((slide) => {
                        let description = slide.caption[0].plaintext || undefined;

                        if (slide.headline) {
                            if (description) {
                                description = `${slide.headline} - ${description}`;
                            } else {
                                description = slide.headline;
                            }
                        }

                        feed += `<media:content url="${slide.image.url}">`;

                        if (description) {
                            feed += `<media:description type="plain"><![CDATA[${description}]]></media:description>`;
                        }

                        if (slide.credit) {
                            feed += `<media:credit role="author" scheme="urn:ebu"><![CDATA[${slide.credit}]]></media:credit>`;
                        }

                        feed += '</media:content>';
                    });
                }

                feed += '</item>';
            });

            feed += '</channel>';
            feed += '</rss>';

            resolve(feed);
        });
    }



    /**
     * Checks if the url is on the blacklist.
     *
     * @private
     *
     * @param {String} url
     * The url to check.
     *
     * @returns {Boolean}
     */
    isOnBlacklist(url) {
        return this.blacklist.some((regexp) => {
            return regexp.test(url);
        });
    }



    /**
     * Processes the content, aka the array of urls that are set on instantition
     *
     * @returns {Promise}
     */
    processContent() {
        const self = this,
            debugLog = debug('cnn-google-newsstand:FeedGenerator:processContent');

        return new Promise((resolve, reject) => {
            let contentModels = [];

            async.each(this.urls, (url, asyncCallback) => {
                let contentRetriever = new ContentRetriever(url);

                contentRetriever.getBaseContentModel().then((baseModel) => {
                    contentRetriever.getRelatedContent(baseModel).then((resolvedModel) => {
                        contentModels.push(resolvedModel);
                        debugLog(`Getting resolved model for: ${resolvedModel.docs[0].url}`);
                        asyncCallback();
                    });
                });
            },
            (error) => {
                if (error) {
                    reject(error);
                }

                self.generateFeed(contentModels).then(
                    function success(rssFeed) {
                        resolve(rssFeed);
                    },
                    function failure(error) {
                        reject(error);
                    }
                );
            });
        });
    }
}

module.exports = FeedGenerator;
