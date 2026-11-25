const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The local Homebrew watchman is broken (missing ICU library); use Metro's own file watcher.
config.resolver.useWatchman = false;

module.exports = config;
