module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCatApiKey: "appl_PAHRXohcpYwGXvHruLXHxMHnuDW",
      revenueCatTestApiKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || "",
    },
  };
};
