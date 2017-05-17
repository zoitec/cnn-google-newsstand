# CNN Google Newsstand Changelog



## 2017-5-15, Version 1.7.5, @zoitec

### Notable changes
- subscribe to cnn.gallery queue messages

* [[`60e2b6e7fa`](https://github.com/jamsyoung/cnn-google-newsstand/commit/60e2b6e7fa)] - CNNGNS-61 - Stand Alone Galleries in GNS (#18) (sean joseph)



## 2017-5-15, Version 1.7.4, @zoitec

### Notable changes
- Enable stand alone galleries

* [[`60e2b6e7fa`](https://github.com/jamsyoung/cnn-google-newsstand/commit/60e2b6e7fa)] - CNNGNS-61 - Stand Alone Galleries in GNS (#18) (sean joseph)




## 2017-5-4, Version 1.7.3, @zoitec

### Notable changes
- Filter out live blogs


### Commits
* [[`1328bd180c`](https://github.com/jamsyoung/cnn-google-newsstand/commit/1328bd180c)] - filtering out articles that are non type of story.. ie live blog (#23) (sean joseph)





## 2017-4-3, Version 1.7.2, @zoitec

### Notable changes
- moved blacklist to docker env variable


### Commits
* [[`7920f3c`](https://github.com/jamsyoung/cnn-google-newsstand/commit/7920f3c)] - **(SEMVER-MINOR)** Release/CNNSP-429 Move blacklist to docker env variabl (#2) (sean joseph) [#2](https://github.com/cnnlabs/cnn-google-newsstand/pull/2)




## 2017-3-9, Version 1.7.1, @zoitec

### Notable changes
- Added default image when no cuts object
- Fixed undefined message appearing for some captions

### Commits
* [[`9a1d4db`](https://github.com/jamsyoung/cnn-google-newsstand/commit/9a1d4db)] - **(SEMVER-MINOR)** Release/CNNGNS-74 Default Cuts Image (#17) (sean joseph) [#15](https://github.com/cnnlabs/cnn-google-newsstand/pull/15)
* [[`0bd26cd`](https://github.com/jamsyoung/cnn-google-newsstand/commit/0bd26cd)] - **(SEMVER-MINOR)** CNNGNS-75 - Fixing undefined caption message (#16) (sean joseph) [#15](https://github.com/cnnlabs/cnn-google-newsstand/pull/15)


## 2017-3-2, Version 1.7.0, @jamsyoung

### Notable changes
- Dynaimge bearer token

### Commits
* [[`a73ed5f847`](https://github.com/jamsyoung/cnn-google-newsstand/commit/a73ed5f847)] - **(SEMVER-MINOR)** Release/cnngns 76 dyna (#17) (sean joseph) [#17](https://github.com/jamsyoung/cnn-google-newsstand/pull/17)
* [[`50ec456244`](https://github.com/jamsyoung/cnn-google-newsstand/commit/50ec456244)] - **(SEMVER-MINOR)** CNNGNS-76 - Add a bearer token to dynaimage registration post requests (#16) (sean joseph) [#16](https://github.com/jamsyoung/cnn-google-newsstand/pull/16)



## 2017-1-19, Version 1.6.2, @zoitec

### Notable changes
- Fix deep monitoring check for test mode logic.

### Known issues
See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits
* [[`0b3ad66272`](https://github.com/jamsyoung/cnn-google-newsstand/commit/0b3ad66272)] - CNNGNS-66  Set thumbnail image for stories with image pageTop to be the same (#14) (sean joseph)



## 2017-1-13, Version 1.6.1, @zoitec

### Notable changes

- Fix deep monitoring check for test mode logic.

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits


* [[`d4b9f38d63`](https://github.com/jamsyoung/cnn-google-newsstand/commit/d4b9f38d63)] - CNNGNS-14 (#13) (sean joseph)
TBSC02Q710PG8WM:cnn-google-newsstand sjoseph$




## 2017-1-13, Version 1.6.0, @zoitec

### Notable changes

- Implement deep monitoring for feed status using cnn-health.

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`f65343c5df`](https://github.com/jamsyoung/cnn-google-newsstand/commit/f65343c5df)] - CNNGNS-14 ENABLE DEEP MONITORING FOR GNS (#12) (sean joseph)




## 2016-12-12, Version 1.5.1, @zoitec

### Notable changes

- Integrate CNN Logger, Add Money, and Tech sections to GNS.

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`d6ca20a`](https://github.com/jamsyoung/cnn-google-newsstand/commit/d6ca20a)] - Add Money, and Tech sections to GNS (sean joseph)

* [[`77bf9eb`](https://github.com/jamsyoung/cnn-google-newsstand/commit/77bf9eb)] - Integrate CNN Logger (Matthew Parangot)



## 2016-11-08, Version 1.5.0, @jamsyoung

### Notable changes

- Integrate configurable timeout for content-retriever.

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`ac05a0d`](https://github.com/jamsyoung/cnn-google-newsstand/commit/ac05a0d)] - Integrate configurable timeout for content-retriever. (James Young)





## 2016-11-03, Version 1.4.0, @zoitec

### Notable changes

- s3 fix ,  minor style fix, and config links update

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`548b7e0070`](https://github.com/jamsyoung/cnn-google-newsstand/commit/548b7e0070)] - CNNGNS-53 s3 fix ,  minor style fix, and config links update (#9) (sean joseph)




## 2016-11-02, Version 1.3.0, @jamsyoung

### Notable changes

- Block the election module image from being set as a thumbnail for the article

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`eb4a607eb8`](https://github.com/jamsyoung/cnn-google-newsstand/commit/eb4a607eb8)] - CNNGNS-53 - Block selection  of election module image to be card thumbnail (#8) (sean joseph)




## 2016-11-01, Version 1.2.0, @jamsyoung

### Notable changes

- Eletions

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`05a5bc756a`](https://github.com/jamsyoung/cnn-google-newsstand/commit/05a5bc756a)] - CNNGNS-46 Create a REF environment for GoogleNS, CNNGNS-22 Analytics tracking (#5) (sean joseph) [#5](https://github.com/jamsyoung/cnn-google-newsstand/pull/5)
* [[`fd6397a8fc`](https://github.com/jamsyoung/cnn-google-newsstand/commit/fd6397a8fc)] - bumping the package (Sean Joseph)
* [[`4e1f3dbf98`](https://github.com/jamsyoung/cnn-google-newsstand/commit/4e1f3dbf98)] - fixing how cosntant election story is added current list of urls if they exist (Sean Joseph)
* [[`07317c8b43`](https://github.com/jamsyoung/cnn-google-newsstand/commit/07317c8b43)] - fixing condition for when array is empty (Sean Joseph)
* [[`47bfb37e7d`](https://github.com/jamsyoung/cnn-google-newsstand/commit/47bfb37e7d)] - setting election test mode to work with thedconfigured article only (Sean Joseph)
* [[`3b10e0c9cd`](https://github.com/jamsyoung/cnn-google-newsstand/commit/3b10e0c9cd)] - setting election test to work configure article only (Sean Joseph)
* [[`032a2ab35a`](https://github.com/jamsyoung/cnn-google-newsstand/commit/032a2ab35a)] - fixing interval for constant story updates (Sean Joseph)
* [[`93ab025ef1`](https://github.com/jamsyoung/cnn-google-newsstand/commit/93ab025ef1)] - testing eleciton section (Sean Joseph)
* [[`d1093228ae`](https://github.com/jamsyoung/cnn-google-newsstand/commit/d1093228ae)] - fixing s3 constatn image retrieval (Sean Joseph)
* [[`9b47589cd2`](https://github.com/jamsyoung/cnn-google-newsstand/commit/9b47589cd2)] - fixing image env and politics section (Sean Joseph)
* [[`f9cb5d0ed4`](https://github.com/jamsyoung/cnn-google-newsstand/commit/f9cb5d0ed4)] - fix typo (Sean Joseph)
* [[`5f7730e9a5`](https://github.com/jamsyoung/cnn-google-newsstand/commit/5f7730e9a5)] - type fix (Sean Joseph)
* [[`135dabb2ef`](https://github.com/jamsyoung/cnn-google-newsstand/commit/135dabb2ef)] - bump; (James Young)
* [[`32d1da2891`](https://github.com/jamsyoung/cnn-google-newsstand/commit/32d1da2891)] - **hotfix**: fix defect with image cuts (James Young)




## 2016-10-29, Version 1.1.0, @jamsyoung

### Notable changes

- Eletions

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`e4548b8d9b`](https://github.com/jamsyoung/cnn-google-newsstand/commit/e4548b8d9b)] - CNNGNS-53 CNNGNS-54  Election Module and Election Sections (#7) (sean joseph)
* [[`ff6184bc31`](https://github.com/jamsyoung/cnn-google-newsstand/commit/ff6184bc31)] - **feed-generator**: fix typo (James Young)




## 2016-09-26, Version 1.0.3, @jamsyoung

### Notable changes

- Fix defect with dynaimge urls queueing

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`66e7730b9c`](https://github.com/jamsyoung/cnn-google-newsstand/commit/66e7730b9c)] - **feed-generator**: clear out dynaimageUrlsToProcess after a POST (James Young)




## 2016-09-26, Version 1.0.2, @jamsyoung

### Notable changes

- Fix a leading space in a request url.

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`fb997262b6`](https://github.com/jamsyoung/cnn-google-newsstand/commit/fb997262b6)] - **feed-processor**: fix space in url (James Young)




## 2016-09-26, Version 1.0.1, @jamsyoung

### Notable changes

- Add `-live-video` to cuts that will be truncated from dynaimage urls

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.

### Commits

* [[`80593743d0`](https://github.com/jamsyoung/cnn-google-newsstand/commit/80593743d0)] - **feed-generator**: better filter on dynaimage cuts (James Young)





## 2016-09-23, Version 1.0.0, @jamsyoung

### Notable changes

- Initial release

### Known issues

See https://github.com/cnnlabs/cnn-google-newsstand/labels/defect for complete and
current list of known issues.


# Commits

All of them up to this point.
