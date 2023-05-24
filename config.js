require("dotenv").config();

const debug = (process.env.DEBUG === '1') || process.env.DEBUG === 'true';

module.exports = {
  debug,
  dc: process.env.DC_CONTRACT,
  revenueAccount: process.env.REVENUE_ACCOUNT,
  tweetAddress: process.env.TWEET_CONTRACT
};
