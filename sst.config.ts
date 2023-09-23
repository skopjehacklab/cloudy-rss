import { SSTConfig } from 'sst'
import { CloudyRSS } from './stacks/CloudyRSS'

export default {
  config(_input) {
    return {
      name: 'cloudy-rss',
      region: 'eu-west-2', // Hardcoded to London for now
    }
  },
  stacks(app) {
    app.stack(CloudyRSS)

    // Easy to nuke non-prod environments
    if (app.stage !== 'prod') {
      app.setDefaultRemovalPolicy('destroy')
    }
  },
} satisfies SSTConfig
