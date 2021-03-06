// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import Client from '../Client';

export default class TreeherderEvents extends Client {
  constructor(options = {}) {
    super({
      serviceName: 'treeherder',
      serviceVersion: 'v1',
      exchangePrefix: 'exchange/taskcluster-treeherder/v1/',
      ...options,
    });
  }
  /* eslint-disable max-len */
  // When a task run is scheduled or resolved, a message is posted to
  // this exchange in a Treeherder consumable format.
  /* eslint-enable max-len */
  jobs(pattern) {
    const entry = {type:'topic-exchange',exchange:'jobs',name:'jobs',schema:'v1/pulse-job.json#',routingKey:[{name:'destination',multipleWords:false,required:true},{name:'project',multipleWords:false,required:true},{name:'reserved',multipleWords:true,required:false}]}; // eslint-disable-line

    return this.normalizePattern(entry, pattern);
  }
}
