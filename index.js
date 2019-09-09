const axios = require("axios");
const querystring = require("querystring");

const {
  SLACK_WEBHOOK_URL,
  EVENT_TYPES,
  PIPELINES,
  TAG_MAP,
  DEPENDENCY_REPO_ID,
  DEPENDENCY_PIPELINES,
  ZH_API_TOKEN
} = process.env;

const EVENT_MAP = {
  ISSUE_TRANSFER: "issue_transfer",
  ESTIMATE_SET: "estimate_set",
  ESTIMATE_CLEARED: "estimate_cleared",
  ISSUE_REPRIORITIZED: "issue_reprioritized"
};

const tagMap = JSON.parse(TAG_MAP);

const buildIssue = data =>
  `<https://app.zenhub.com/workspace/o/${data.organization}/${data.repo}/issues/${data.issue_number}|#${data.issue_number} ${data.issue_title}>`;
const moveIssue = data =>
  `${data.user_name} moved ${buildIssue(data)} to ${
    data.to_pipeline_name
  } ${tagMap[data.to_pipeline_name] || ""}`.trim();

const getArrayFromString = str => (str || "").split(",").map(t => t.trim());

exports.handler = (event, _, callback) => {
  if (event.body) {
    const data = querystring.parse(event.body);
    const eventTypes = getArrayFromString(EVENT_TYPES);
    const pipelines = getArrayFromString(PIPELINES);
    const dependencyPipelines = getArrayFromString(DEPENDENCY_PIPELINES);
    let text, checkDependencies;
    if (eventTypes.includes(data.type)) {
      switch (data.type) {
        case EVENT_MAP.ISSUE_TRANSFER:
          if (pipelines.length > 0) {
            if (pipelines.includes(data.to_pipeline_name)) {
              text = moveIssue(data);
            } // No else - Ignore if not in filtered pipeline!
          } else {
            text = moveIssue(data);
          }
          // There's surely a cleaner way; but this seems to be easiest for now :p
          if (
            dependencyPipelines.length > 0 &&
            dependencyPipelines.includes(data.to_pipeline_name)
          ) {
            checkDependencies = true;
          }
          break;
        case EVENT_MAP.ESTIMATE_SET:
          text = `${data.user_name} set an estimate of ${
            data.estimate
          } for ${buildIssue(data)}`;
          break;
        case EVENT_MAP.ESTIMATE_CLEARED:
          text = `${data.user_name} cleared estimate for ${buildIssue(data)}`;
          break;
        case EVENT_MAP.ISSUE_REPRIORITIZED:
          text = `${data.user_name} reprioritized ${buildIssue(data)} in ${
            data.to_pipeline_name
          }`;
          break;
        default:
          text = null;
      }
      if (text) {
        axios
          .post(SLACK_WEBHOOK_URL, { text, link_names: 1 })
          .catch(console.log);
      }
      if (checkDependencies) {
        axios
          .get(
            `https://api.zenhub.io/p1/repositories/${DEPENDENCY_REPO_ID}/dependencies?access_token=${ZH_API_TOKEN}`
          )
          .then(response => {
            // Not doing a strict equality check since types are different
            const blockerIssues = response.data.dependencies.filter(
              issue => issue.blocking.issue_number == data.issue_number
            );

            if (blockerIssues && blockerIssues.length > 0) {
              let message = `The issue ${buildIssue(data)} is now ${
                data.to_pipeline_name
              } 🎉🎉 It was a blocker for `;

              blockerIssues.forEach((blockerIssue, index) => {
                const blockedIssueUrl = `https://app.zenhub.com/workspace/o/${data.organization}/${data.repo}/issues/${blockerIssue.blocked.issue_number}`;
                message =
                  message +
                  `${blockedIssueUrl}${
                    index !== blockerIssues.length - 1 ? ", " : ""
                  }`;
              });

              message = message + ` ${tagMap["Dependencies"] || ""}`;
              axios
                .post(SLACK_WEBHOOK_URL, { message, link_names: 1 })
                .catch(console.log);
            }
          });
      }
      callback(null, {
        statusCode: "200",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
    }
  } else {
    callback("Error! No event body!");
  }
};
