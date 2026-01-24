module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "",
      revenueCatTestApiKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || "",
    },
  };
};
