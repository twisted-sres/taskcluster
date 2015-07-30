var base      = require('taskcluster-base');
var assert    = require('assert');

/** Declaration of exchanges offered by the queue */
var exchanges = new base.Exchanges({
  title:      "Queue AMQP Exchanges",
  description: [
    "The queue, typically available at `queue.taskcluster.net`, is responsible",
    "for accepting tasks and track their state as they are executed by",
    "workers. In order ensure they are eventually resolved.",
    "",
    "This document describes AMQP exchanges offered by the queue, which allows",
    "third-party listeners to monitor tasks as they progress to resolution.",
    "These exchanges targets the following audience:",
    " * Schedulers, who takes action after tasks are completed,",
    " * Workers, who wants to listen for new or canceled tasks (optional),",
    " * Tools, that wants to update their view as task progress.",
    "",
    "You'll notice that all the exchanges in the document shares the same",
    "routing key pattern. This makes it very easy to bind to all messages",
    "about a certain kind tasks.",
    "",
    "**Task-graphs**, if the task-graph scheduler, documented elsewhere, is",
    "used to schedule a task-graph, the task submitted will have their",
    "`schedulerId` set to `'task-graph-scheduler'`, and their `taskGroupId` to",
    "the `taskGraphId` as given to the task-graph scheduler. This is useful if",
    "you wish to listen for all messages in a specific task-graph.",
    "",
    "**Task specific routes**, a task can define a task specific route using",
    "the `task.routes` property. See task creation documentation for details",
    "on permissions required to provide task specific routes. If a task has",
    "the entry `'notify.by-email'` in as task specific route defined in",
    "`task.routes` all messages about this task will be CC'ed with the",
    "routing-key `'route.notify.by-email'`.",
    "",
    "These routes will always be prefixed `route.`, so that cannot interfere",
    "with the _primary_ routing key as documented here. Notice that the",
    "_primary_ routing key is alwasys prefixed `primary.`. This is ensured",
    "in the routing key reference, so API clients will do this automatically.",
    "",
    "Please, note that the way RabbitMQ works, the message will only arrive",
    "in your queue once, even though you may have bound to the exchange with",
    "multiple routing key patterns that matches more of the CC'ed routing",
    "routing keys.",
    "",
    "**Delivery guarantees**, most operations on the queue are idempotent,",
    "which means that if repeated with the same arguments then the requests",
    "will ensure completion of the operation and return the same response.",
    "This is useful if the server crashes or the TCP connection breaks, but",
    "when re-executing an idempotent operation, the queue will also resend",
    "any related AMQP messages. Hence, messages may be repeated.",
    "",
    "This shouldn't be much of a problem, as the best you can achieve using",
    "confirm messages with AMQP is at-least-once delivery semantics. Hence,",
    "this only prevents you from obtaining at-most-once delivery semantics.",
    "",
    "**Remark**, some message generated by timeouts maybe dropped if the",
    "server crashes at wrong time. Ideally, we'll address this in the",
    "future. For now we suggest you ignore this corner case, and notify us",
    "if this corner case is of concern to you."
  ].join('\n'),
  schemaPrefix:         'http://schemas.taskcluster.net/queue/v1/'
});

// Export exchanges
module.exports = exchanges;

/** Build common routing key construct for `exchanges.declare` */
var buildCommonRoutingKey = function(options) {
  options = options || {};
  return [
    {
      name:             'routingKeyKind',
      summary:          "Identifier for the routing-key kind. This is " +
                        "always `'primary'` for the formalized routing key.",
      constant:         'primary',
      required:         true
    },
    {
      name:             'taskId',
      summary:          "`taskId` for the task this message concerns",
      required:         true,
      maxSize:          22
    }, {
      name:             'runId',
      summary:          "`runId` of latest run for the task, " +
                        "`_` if no run is exists for the task.",
      required:         options.hasRun || false,
      maxSize:          3
    }, {
      name:             'workerGroup',
      summary:          "`workerGroup` of latest run for the task, " +
                        "`_` if no run is exists for the task.",
      required:         options.hasWorker || false,
      maxSize:          22
    }, {
      name:             'workerId',
      summary:          "`workerId` of latest run for the task, " +
                        "`_` if no run is exists for the task.",
      required:         options.hasWorker || false,
      maxSize:          22
    }, {
      name:             'provisionerId',
      summary:          "`provisionerId` this task is targeted at.",
      required:         true,
      maxSize:          22
    }, {
      name:             'workerType',
      summary:          "`workerType` this task must run on.",
      required:         true,
      maxSize:          22
    }, {
      name:             'schedulerId',
      summary:          "`schedulerId` this task was created by.",
      required:         true,
      maxSize:          22
    }, {
      name:             'taskGroupId',
      summary:          "`taskGroupId` this task was created in.",
      required:         true,
      maxSize:          22
    }, {
      name:             'reserved',
      summary:          "Space reserved for future routing-key entries, you " +
                        "should always match this entry with `#`. As " +
                        "automatically done by our tooling, if not specified.",
      multipleWords:    true,
      maxSize:          1
    }
  ];
};

/** Build an AMQP compatible message from a message */
var commonMessageBuilder = function(message) {
  message.version = 1;
  return message;
};

/** Build a message from message */
var commonRoutingKeyBuilder = function(message, routing) {
  return {
    taskId:           message.status.taskId,
    runId:            message.runId,
    workerGroup:      message.workerGroup,
    workerId:         message.workerId,
    provisionerId:    message.status.provisionerId,
    workerType:       message.status.workerType,
    schedulerId:      message.status.schedulerId,
    taskGroupId:      message.status.taskGroupId
  };
};

/** Build list of routing keys to CC */
var commonCCBuilder = function(message, routes) {
  assert(routes instanceof Array, "Routes must be an array");
  return routes.map(function(route) {
    return "route." + route;
  });
};

/** Task defined exchange */
exchanges.declare({
  exchange:           'task-defined',
  name:               'taskDefined',
  title:              "Task Defined Messages",
  description: [
    "When a task is created or just defined a message is posted to this",
    "exchange.",
    "",
    "This message exchange is mainly useful when tasks are scheduled by a",
    "scheduler that uses `defineTask` as this does not make the task",
    "`pending`. Thus, no `taskPending` message is published.",
    "Please, note that messages are also published on this exchange if defined",
    "using `createTask`."
  ].join('\n'),
  routingKey:         buildCommonRoutingKey(),
  schema:             'task-defined-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});

/** Task pending exchange */
exchanges.declare({
  exchange:           'task-pending',
  name:               'taskPending',
  title:              "Task Pending Messages",
  description: [
    "When a task becomes `pending` a message is posted to this exchange.",
    "",
    "This is useful for workers who doesn't want to constantly poll the queue",
    "for new tasks. The queue will also be authority for task states and",
    "claims. But using this exchange workers should be able to distribute work",
    "efficiently and they would be able to reduce their polling interval",
    "significantly without affecting general responsiveness."
  ].join('\n'),
  routingKey:         buildCommonRoutingKey({hasRun: true}),
  schema:             'task-pending-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});


/** Task running exchange */
exchanges.declare({
  exchange:           'task-running',
  name:               'taskRunning',
  title:              "Task Running Messages",
  description: [
    "Whenever a task is claimed by a worker, a run is started on the worker,",
    "and a message is posted on this exchange."
  ].join('\n'),
  routingKey:         buildCommonRoutingKey({hasRun: true, hasWorker: true}),
  schema:             'task-running-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});


/** Artifact created exchange */
exchanges.declare({
  exchange:           'artifact-created',
  name:               'artifactCreated',
  title:              "Artifact Creation Messages",
  description: [
    "Whenever the `createArtifact` end-point is called, the queue will create",
    "a record of the artifact and post a message on this exchange. All of this",
    "happens before the queue returns a signed URL for the caller to upload",
    "the actual artifact with (pending on `storageType`).",
    "",
    "This means that the actual artifact is rarely available when this message",
    "is posted. But it is not unreasonable to assume that the artifact will",
    "will become available at some point later. Most signatures will expire in",
    "30 minutes or so, forcing the uploader to call `createArtifact` with",
    "the same payload again in-order to continue uploading the artifact.",
    "",
    "However, in most cases (especially for small artifacts) it's very",
    "reasonable assume the artifact will be available within a few minutes.",
    "This property means that this exchange is mostly useful for tools",
    "monitoring task evaluation. One could also use it count number of",
    "artifacts per task, or _index_ artifacts though in most cases it'll be",
    "smarter to index artifacts after the task in question have completed",
    "successfully."
  ].join('\n'),
  routingKey:         buildCommonRoutingKey({hasRun: true, hasWorker: true}),
  schema:             'artifact-created-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});


/** Task completed exchange */
exchanges.declare({
  exchange:           'task-completed',
  name:               'taskCompleted',
  title:              "Task Completed Messages",
  description: [
    "When a task is successfully completed by a worker a message is posted",
    "this exchange.",
    "This message is routed using the `runId`, `workerGroup` and `workerId`",
    "that completed the task. But information about additional runs is also",
    "available from the task status structure."
  ].join('\n'),
  routingKey:         buildCommonRoutingKey({hasRun: true, hasWorker: true}),
  schema:             'task-completed-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});


/** Task failed exchange */
exchanges.declare({
  exchange:           'task-failed',
  name:               'taskFailed',
  title:              "Task Failed Messages",
  description: [
    "When a task ran, but failed to complete successfully a message is posted",
    "to this exchange. This is same as worker ran task-specific code, but the",
    "task specific code exited non-zero.",
  ].join('\n'),
  routingKey:         buildCommonRoutingKey(),
  schema:             'task-failed-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});


/** Task exception exchange */
exchanges.declare({
  exchange:           'task-exception',
  name:               'taskException',
  title:              "Task Exception Messages",
  description: [
    "Whenever TaskCluster fails to run a message is posted to this exchange.",
    "This happens if the task isn't completed before its `deadlìne`,",
    "all retries failed (i.e. workers stopped responding), the task was",
    "canceled by another entity, or the task carried a malformed payload.",
    "",
    "The specific _reason_ is evident from that task status structure, refer",
    "to the `reasonResolved` property for the last run."
  ].join('\n'),
  routingKey:         buildCommonRoutingKey(),
  schema:             'task-exception-message.json#',
  messageBuilder:     commonMessageBuilder,
  routingKeyBuilder:  commonRoutingKeyBuilder,
  CCBuilder:          commonCCBuilder
});

