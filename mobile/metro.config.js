const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support .stratum and .strata file imports if needed
config.resolver.assetExts.push('stratum', 'strata');

module.exports = config;
