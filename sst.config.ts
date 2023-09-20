import { SSTConfig } from 'sst'
import { TinierRSS } from './stacks/TinierRSS'

export default {
  config(_input) {
    return {
      name: 'tinier-rss',
      region: 'eu-west-2', // Hardcoded to London for now
    }
  },
  stacks(app) {
    app.stack(TinierRSS)
  },
} satisfies SSTConfig
