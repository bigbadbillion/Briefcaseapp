module.exports = ({ config }) => {
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAllowsLocalNetworking: true,
      },
    },
    extra: {
      ...config.extra,
      revenueCatApiKey: "appl_PAHRXohcpYwGXvHruLXHxMHnuDW",
      revenueCatTestApiKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || "",
    },
  };
};
