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
                feed += `<pubDate>${new Date(contentModel.docs[0].lastModifiedDate).toUTCString()}</pubDate>`;

                if (contentModel.docs[0].byline) {
                    feed += `<author>${contentModel.docs[0].byline}</author>`;
                }

                /* PROCESS CONTENT WITH TYPE === ARTICLE */
                if (contentModel.docs[0].type === 'article') {

                    // handle page top media
                    contentModel.docs[0].relatedMedia.media.forEach((item) => {
                        let imageCut = '';

                        if (item.location === 'pageTop') {
                            // handle page top image
                            if (item.type === 'image') {
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

                            // handle page top video
                            if (item.type === 'reference') {
                                if (item.referenceType === 'video') {
                                    imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9
                                    feed += `<media:content url="${item.cdnUrls['1920x1080_5500k_mp4']}" medium="video">`;
                                    feed += `<media:title>${item.headline} 1</media:title>`;
                                    feed += `<media:description><![CDATA[${item.headline} 2]]></media:description>`;
                                    feed += `<media:credit role="author" scheme="urn:ebu"><![CDATA[${item.source}]]></media:credit>`;
                                    // TODO add logic for mising thumbnails
                                    feed += `<media:thumbnail url="${item.cuts[imageCut].url}" width="${item.cuts[imageCut].width}" height="${item.cuts[imageCut].height}"/>`;
                                    feed += '</media:content>';
                                }
                            }
                        }
                    });

                    // handle body content
                    feed += '<content:encoded><![CDATA[';

                    // override header content
                    feed += `<meta itemprop="headline" content="${title.trim()}"/>`;
                    // feed += '<meta itemprop="alternativeHeadline" content="This is the alternative headline"/>';
                    feed += `<meta itemprop="genre" content="${contentModel.docs[0].section}"/>`;
                    feed += `<meta itemprop="datePublished" content="${contentModel.docs[0].lastModifiedDate}"/>`;

                    // handle editors note
                    if (contentModel.docs[0].body.notes && contentModel.docs[0].body.notes.www) {
                        if (typeof contentModel.docs[0].body.notes.www === 'string') {
                            feed += `<p class="editorsNote"><em><strong>Editor's Note:</strong> ${contentModel.docs[0].body.notes.www.trim()}</em></p>`;
                        }
                    }

                    // handle headlines, paragraphs, and embeds
                    let firstParagraph = true;
                    contentModel.docs[0].body.paragraphs.forEach(function (paragraph) {
                        if (typeof paragraph.richtext === 'string') {
                            // handle headlines /else/ first paragraph /else/ paragraphs
                            if (paragraph.richtext.startsWith('<h3>')) {
                                feed += `<hr class="headerDivider">${paragraph.richtext.trim()}`;
                            } else {
                                if (firstParagraph) {
                                    feed += `<p class="firstParagraph">${paragraph.richtext.trim()}</p>`;
                                    firstParagraph = false;
                                } else {
                                    feed += `<p>${paragraph.richtext.trim()}</p>`;
                                }
                            }
                        }

                        // handle inline elements (images / videos) - intentionally only grabbing the first item in the array
                        if (paragraph.elements.length > 0) {

                            // twitter / facebook
                            if (paragraph.elements[0].type === 'embed') {
                                debugLog(paragraph.elements[0]);

                                switch (paragraph.elements[0].attributes.type) {
                                    case 'twitter':
                                    case 'facebook':
                                    case 'instagram':
                                    case 'youtube':
                                    case 'vimeo':
                                        feed += `<iframe>${paragraph.elements[0].attributes.url}</iframe>`;
                                        break;
                                }
                            }


                            // image / video
                            if (paragraph.elements[0].type === 'handle') {
                                // handle inline images
                                if (paragraph.elements[0].target.type === 'image') {
                                    contentModel.docs[0].relatedMedia.media.some((item) => {
                                        if (item.location === paragraph.id) {
                                            let caption = undefined,
                                                imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9

                                            feed += '<figure>';
                                            feed += `<img src="${item.cuts[imageCut].url}" height="${item.cuts[imageCut].height}" width="${item.cuts[imageCut].width}"/>`;

                                            if (item.caption && !item.photographer) {
                                                caption = item.caption;
                                            }

                                            if (!item.caption && item.photographer) {
                                                caption = `<span class="credit">${item.photographer}</span>`;
                                            }

                                            if (item.caption && item.photographer) {
                                                caption = `${item.caption} <span class="credit">${item.photographer}</span>`;
                                            }

                                            if (caption) {
                                                feed += `<figcaption>${caption}</figcaption>`;
                                            }

                                            feed += '</figure>';
                                            return true;
                                        }
                                    });
                                }

                                // handle inline videos
                                if (paragraph.elements[0].target.type === 'video') {
                                    contentModel.docs[0].relatedMedia.media.some((item) => {

                                        // constructed
                                        if (item.location === paragraph.id) {
                                            let fullCaption = undefined,
                                                caption = undefined,
                                                imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9

                                            feed += `<video src="${item.cdnUrls['1280x720_3500k_mp4']}" poster="${item.cuts[imageCut].url}"></video>`;

                                            if (paragraph.elements[0].attributes.caption) {
                                                caption = paragraph.elements[0].attributes.caption.trim();
                                            }

                                            if (item.title && !caption && !item.source) {
                                                fullCaption = item.title;
                                            }

                                            if (item.title && caption && !item.source) {
                                                fullCaption = `${item.title} - ${caption}`;
                                            }

                                            if (!item.title && !caption && item.source) {
                                                fullCaption = `<span class="credit">${item.source}</span>`;
                                            }

                                            if (item.title && !caption && item.source) {
                                                fullCaption = `${item.title} <span class="credit">${item.source}</span>`;
                                            }

                                            if (!item.title && caption && item.source) {
                                                fullCaption = `${caption} <span class="credit">${item.source}</span>`;
                                            }

                                            if (item.title && caption && item.source) {
                                                fullCaption = `${item.title} - ${caption} <span class="credit">${item.source}</span>`;
                                            }

                                            if (fullCaption) {
                                                feed += `<hr class='relatedContentDivider'><p class='caption'><strong>Video</strong> ${fullCaption}</p>`;
                                            }

                                            return true;
                                        }

                                        // using figure / figcaption tag
                                        // if (item.location === paragraph.id) {
                                        //     let caption = undefined,
                                        //         description = undefined,
                                        //         imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9
                                        //
                                        //     feed += '<figure>';
                                        //     feed += `<video src="${item.cdnUrls['1280x720_3500k_mp4']}" poster="${item.cuts[imageCut].url}"></video>`;
                                        //
                                        //     if (paragraph.elements[0].attributes.caption) {
                                        //         description = paragraph.elements[0].attributes.caption.trim();
                                        //     }
                                        //
                                        //     if (item.title && !description && !item.source) {
                                        //         caption = item.title;
                                        //     }
                                        //
                                        //     if (item.title && description && !item.source) {
                                        //         caption = `${item.title} - ${description}`;
                                        //     }
                                        //
                                        //     if (!item.title && !description && item.source) {
                                        //         caption = `<span class="credit">${item.source}</span>`;
                                        //     }
                                        //
                                        //     if (item.title && !description && item.source) {
                                        //         caption = `${item.title} <span class="credit">${item.source}</span>`;
                                        //     }
                                        //
                                        //     if (!item.title && description && item.source) {
                                        //         caption = `${description} <span class="credit">${item.source}</span>`;
                                        //     }
                                        //
                                        //     if (item.title && description && item.source) {
                                        //         caption = `${item.title} - ${description} <span class="credit">${item.source}</span>`;
                                        //     }
                                        //
                                        //     if (caption) {
                                        //         feed += `<figcaption><strong>Video</strong> ${caption}</figcaption>`;
                                        //     }
                                        //
                                        //     feed += '</figure>';
                                        //     return true;
                                        // }
                                    });
                                }
                            }
                        }
                    });

                    feed += `<div class="footer"><span class="copyright">&copy;${new Date().getFullYear()} Cable News Network, Inc. A Time Warner Company. All Rights Reserved.</span></div>`;
                    feed += ']]></content:encoded>';
                }

                /* PROCESS CONTENT WITH TYPE === GALLERY */
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

                /* PROCESS CONTENT WITH TYPE === VIDEO */
                if (contentModel.docs[0].type === 'video') {
                    feed += `<media:content url="${contentModel.docs[0].cdnUrls['1920x1080_5500k_mp4']}" medium="video">`;
                    feed += `<media:title>${contentModel.docs[0].headline}</media:title>`;
                    feed += `<media:description><![CDATA[${contentModel.docs[0].description[0].richtext}]]></media:description>`;
                    feed += `<media:credit role="author" scheme="urn:ebu"><![CDATA[${contentModel.docs[0].source}]]></media:credit>`;

                    contentModel.docs[0].relatedMedia.media.some((item) => {
                        if (item.type === 'image' && item.location === 'thumbnails') {
                            let imageCut = (item.cuts.exlarge16to9) ? 'exlarge16to9' : 'large16to9'; // sometimes exlarge16to9 doesn't exist, fall back to large16to9
                            feed += `<media:thumbnail url="${item.cuts[imageCut].url}" height="${item.cuts[imageCut].height}" width="${item.cuts[imageCut].width}" />`;
                            return true;
                        }
                    });

                    feed += '</media:content>';

                    feed += '<content:encoded><![CDATA[';
                    feed += `<p>${contentModel.docs[0].description[0].richtext}</p>`;
                    feed += ']]></content:encoded>';
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








// feed += `<pubDate>${new Date().toUTCString()}</pubDate>`; // USE WHEN DEVELOPING


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


// related media
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




// 320x180: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_320x180_dl.flv",
// 384x216: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_384x216_dl.flv",
// 416x234: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_416x234_dl.flv",
// 512x288_550k_mp4: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_512x288_550k.mp4",
// 512x288_550k: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_512x288_550k.mp4",
// 576x324: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_576x324_dl.flv",
// 640x360_900k_mp4: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_640x360_900k.mp4",
// 640x360_900k: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_640x360_900k.mp4",
// 640x360: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_640x360_dl.flv",
// 664708_ios_1240: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_1240.mp4",
// 664708_ios_150: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_150.mp4",
// 664708_ios_3000: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_3000.mp4",
// 664708_ios_440: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_440.mp4",
// 664708_ios_5500: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_5500.mp4",
// 664708_ios_650: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_650.mp4",
// 664708_ios_840: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_840.mp4",
// 664708_ios_audio: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_ios_audio.mp4",
// 768x432_1300k_mp4: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_768x432_1300k.mp4",
// 768x432_1300k: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_768x432_1300k.mp4",
// 896x504_1850k_mp4: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_896x504_1850k.mp4",
// 896x504_1850k:
// 1280x720_3500k_mp4: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_664708_1280x720_3500k.mp4",
// 1280x720_3500k:     "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_1280x720_3500k.mp4",
// 1920x1080_5500k_mp4: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_5500.mp4",
// cnn_iphone_cell: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_cnn_iphone_cell.mp4",
// cnn_iphone_wifi_hi: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_iphone_wifi_hi.mp4",
// ios_1240: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_1240.mp4",
// ios_150: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_150.mp4",
// ios_3000: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_3000.mp4",
// ios_440: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_440.mp4",
// ios_650: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_650.mp4",
// ios_840: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_840.mp4",
// ios_audio: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn_ios_audio.mp4",
// smil: "http://ht.cdn.turner.com/cnn/big/tv/2016/07/18/kim-kardashian-taylor-swift-kanye-west-famous-feud.cnn.smil",




// IG Embed from hypatia (in paragraph.elements[0])
// {
//     type: 'embed',
//     attributes: {
//         description: 'Debate Soace #2',
//         type: 'instagram',
//         url: '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-version="5" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:658px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">\
//                   <div style="padding:8px;">\
//                       <div style=" background:#F8F8F8; line-height:0; margin-top:40px; padding:50.0% 0; text-align:center; width:100%;">\
//                           <div style=" background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAMAAAApWqozAAAAGFBMVEUiIiI9PT0eHh4gIB4hIBkcHBwcHBwcHBydr+JQAAAACHRSTlMABA4YHyQsM5jtaMwAAADfSURBVDjL7ZVBEgMhCAQBAf//42xcNbpAqakcM0ftUmFAAIBE81IqBJdS3lS6zs3bIpB9WED3YYXFPmHRfT8sgyrCP1x8uEUxLMzNWElFOYCV6mHWWwMzdPEKHlhLw7NWJqkHc4uIZphavDzA2JPzUDsBZziNae2S6owH8xPmX8G7zzgKEOPUoYHvGz1TBCxMkd3kwNVbU0gKHkx+iZILf77IofhrY1nYFnB/lQPb79drWOyJVa/DAvg9B/rLB4cC+Nqgdz/TvBbBnr6GBReqn/nRmDgaQEej7WhonozjF+Y2I/fZou/qAAAAAElFTkSuQmCC); display:block; height:44px; margin:0 auto -44px; position:relative; top:-22px; width:44px;"></div>\
//                       </div>\
//                       <p style=" margin:8px 0 0 0; padding:0 4px;"><a href="https://instagram.com/p/8wtUhborET/" style=" color:#000; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none; word-wrap:break-word;" target="_blank">#demdebate #emptyspaces</a></p>\
//                       <p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;">A photo posted by @johnnylace on <time style=" font-family:Arial,sans-serif; font-size:14px; line-height:17px;" datetime="2015-10-13T02:30:14+00:00">Oct 12, 2015 at 7:30pm PDT</time></p>\
//                   </div>\
//               </blockquote>\n\
//               <script async defer src="//platform.instagram.com/en_US/embeds.js"></script>'
//     }
// }


// Facebook embed
// let mock = {
//         type: 'embed',
//         attributes: {
//             description: 'Facebook Live',
//             type: 'facebook',
//             url: 'https://www.facebook.com/cnn/videos/10155171643211509/',
//             embedStrategy: 'legacy'
//         }
//     }



// let mock = {
//         type: 'embed',
//         attributes: {
//             description: 'New Day tweet',
//             type: 'twitter',
//             url: '<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Gabby Douglas&#39; mom: &quot;She was devastated&quot; by the online bullying <a href="https://twitter.com/hashtag/Rio2016?src=hash">#Rio2016</a> <a href="https://t.co/IVmFOkSGQ0">https://t.co/IVmFOkSGQ0</a></p>&mdash; New Day (@NewDay) <a href="https://twitter.com/NewDay/status/765156947129667584">August 15, 2016</a></blockquote>\n<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>',
//             embedStrategy: 'legacy'
//         }
//     },
//     mock2 = {
//         type: 'embed',
//         attributes: {
//             description: 'Leslie Jones tweet',
//             type: 'twitter',
//             url: '<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Yo I just heard Gabby getting attacked on her page show her the love you showed me <a href="https://twitter.com/hashtag/LOVE4GABBYUSA?src=hash">#LOVE4GABBYUSA</a> send to <a href="https://twitter.com/gabrielledoug">@gabrielledoug</a></p>&mdash; Leslie Jones (@Lesdoggg) <a href="https://twitter.com/Lesdoggg/status/765052419709476865">August 15, 2016</a></blockquote>\n<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>',
//             embedStrategy: 'legacy'
//         }
//     },
//     mock3 = {
//         type: 'embed',
//         attributes: {
//             description: 'Gabby hashtag 1',
//             type: 'twitter',
//             url: '<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">2016 may not be 2012 but <a href="https://twitter.com/gabrielledoug">@gabrielledoug</a> is an astoundingly great gymnast and <a href="https://twitter.com/hashtag/BeKindChampion?src=hash">#BeKindChampion</a> <a href="https://twitter.com/hashtag/LOVE4GABBYUSA?src=hash">#LOVE4GABBYUSA</a> <a href="https://t.co/rcUm9QF7Ak">pic.twitter.com/rcUm9QF7Ak</a></p>&mdash; BeKindCocopah (@BeKindCocopah) <a href="https://twitter.com/BeKindCocopah/status/765168967652519936">August 15, 2016</a></blockquote>\n<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>',
//             embedStrategy: 'legacy'
//         }
//     },
//     mock4 = {
//         type: 'embed',
//         attributes: {
//             description: 'Gabby hashtag  2',
//             type: 'twitter',
//             url: '<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">So much <a href="https://twitter.com/hashtag/LOVE4GABBYUSA?src=hash">#LOVE4GABBYUSA</a>...not many people can do what she does ⭐️ <a href="https://t.co/gM0NeWxvps">pic.twitter.com/gM0NeWxvps</a></p>&mdash; Ali Benveniste (@apbenven) <a href="https://twitter.com/apbenven/status/765196624436064256">August 15, 2016</a></blockquote>\n<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>',
//             embedStrategy: 'legacy'
//         }
//     };
