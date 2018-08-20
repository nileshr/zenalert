## 🚨 ZenAlert

### What?

Simple Lambda function to customise ZenHub event notifications to Slack.

### Why?

By default, [ZenHub's Slack Integration](https://www.zenhub.com/blog/zenhub-slack/) sends notifications when an issue is moved between any pipelines, estimate is set or cleared and when an issue is moved up or down a pipeline. 
This can become overwhelming for large projects, and so we need to use [Zenhub's custom webhook integrations](https://github.com/ZenHubIO/API#webhooks) to control what type of events are notified on Slack.

### How?

- Clone this repo and install the dependency. (Run `npm install` or `yarn` in project root).
- Create the deployment package by zipping the project folder (On MacOS, Run `zip -r build.zip *` in project root).
- Create a Lambda function in AWS with basic lambda execution policy and upload the build zip.
- Set [API Gateway as the trigger](https://docs.aws.amazon.com/lambda/latest/dg/invoking-lambda-function.html#supported-event-source-api-gateway) and provide a name to the API. Configure authentication as open, since ZenHub can only trigger open webhooks. Copy the _execution url_ provided by API Gateway after saving the changes.
- To control what events are sent, set `EVENT_TYPES` environment variable to one of possible Zenhub event types. Also accepts multiple comma separated values. (`issue_transfer`, `estimate_set`, `estimate_cleared`, `issue_reprioritized`).
- [Create an incoming webhook on Slack](https://get.slack.help/hc/en-us/articles/115005265063-Incoming-WebHooks-for-Slack) and set the url in the `SLACK_WEBHOOK_URL` environment variable.
- To get issue transfer notifications for only some pipelines, you can _optionally_ set `PIPELINES` environment variable with the comma-separated names of the pipelines in your project. Note: This value is ignored if `issue_transfer` is not set in `EVENT_TYPES`.
- _Finally,_ on [ZenHub Dashboard](https://app.zenhub.com/dashboard), on the Integrations tab create a new custom integration. Select the repo to connect, and provide the Lambda _execution url_ as the webhook url.
