# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### 6.1.4 (2021-10-19)


### Bug Fixes

* ORM field with Boolean type will become string after save. ([f3d13d4](https://gitlab.com/kohanajs/kohanajs/commit/f3d13d4c9c30d54faf8f882612f0989c188eaefb))

## [6.1.3] - 2021-10-16
### Fixed
- defaultViewData not assign to default layout.

## [6.1.2] - 2021-10-13
### Fixed
- test files

## [6.1.1] - 2021-10-13
### Fixed
- fix config loading error when config file not exist but provided fallback object.

## [6.1.0] - 2021-10-06
### Added
- Default Database Driver

## [6.0.1] - 2021-10-05
### Changed
- KohanaJS init.js loading sequence, load require first, then system, then module

## [6.0.0] - 2021-09-07
### Changed
- update KohanaJS version number

## [6.0.0] - 2021-09-07
### Changed
- Move ControllerMixinMultipartForm to @kohanajs/mod-form

## [5.2.2] - 2021-09-07
### Fixed
- Fix error when ORM eagerLoad not provide "with" Array.

## [5.2.1] - 2021-09-07
### Added
- create CHANGELOG.md