import { SSTConfig } from 'sst'
import { CloudyRSS } from './stacks/CloudyRSS'

export default {
  config(_input) {
    return {
      name: 'tinier-rss',
      region: 'eu-west-2', // Hardcoded to London for now
    }
  },
  stacks(app) {
    app.stack(CloudyRSS)
  },
} satisfies SSTConfig
