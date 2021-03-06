# Notify Service

No longer will you need to keep going back to the task-inspector page to know if your task is complete! Merely add some routes and we will tell you when your task is done! Note: You'll need to have the appropriate scopes to add these routes.

Example routes:

```
"routes": [
  "notify.email.<you@you.com>.on-any",
  "notify.irc-user.<your-mozilla-irc-nick>.on-failed",
  "notify.irc-channel.<a-mozilla-irc-channel>.on-completed",
  "notify.pulse.<a-pulse-routing-key>.on-exception"
]
```

Further specification of this is contained in the docs. **Note: The channel should have the # preceeding it.**

Testing
-------

You'll first need to set up your credentials based on how they are in `user-config-example.yml`. Ask a Taskcluster team member for the aws keys, etc.
`yarn install` and `yarn test`. You can set `DEBUG=taskcluster-notify,test` if you want to see what's going on.

Deploying
---------

This service will auto-deploy in Heroku once merged into master and CI runs are successful. If you need to force a deploy because we've broken CI in some way and this urgently needs to be deployed, you can do it from the [Heroku console](https://dashboard-preview.heroku.com/apps/taskcluster-github/deploy/github). Once the new version has been deployed, you can verify it is working by submitting a task from the [Task Creator](https://tools.taskcluster.net/task-creator/) with the routes

```
"routes": [
  "notify.email.<you@you.com>.on-any",
  "notify.irc-user.<your-mozilla-irc-nick>.on-any"
]
```

Service Owner
-------------

Service Owner: bstack@mozilla.com

License
-------

[Mozilla Public License Version 2.0](https://github.com/taskcluster/taskcluster-lib-monitor/blob/master/LICENSE)
