const axios = require("axios");
const querystring = require("querystring");

const buildIssue = data => `<${data.github_url}|#${data.issue_number} ${data.issue_title}>`;

const transferMessage = data => `${data.user_name} moved ${buildIssue(data)} to ${data.to_pipeline_name}`;

const EVENT_MAP = {
  ISSUE_TRANSFER: "issue_transfer",
  ESTIMATE_SET: "estimate_set",
  ESTIMATE_CLEARED: "estimate_cleared",
  ISSUE_REPRIORITIZED: "issue_reprioritized"
};

exports.handler = (event, context, callback) => {
  if (event.body) {
    const data = querystring.parse(event.body);
    const { SLACK_WEBHOOK_URL, EVENT_TYPES, PIPELINES } = process.env;
    const eventTypes = (EVENT_TYPES || "").split(",").map(t => t.trim());
    const pipelines = (PIPELINES || "").split(",").map(p => p.trim());
    let text;
    if (eventTypes.includes(data.type)) {
      switch (data.type) {
        case EVENT_MAP.ISSUE_TRANSFER:
          if (pipelines.length > 0) {
            if (pipelines.includes(data.to_pipeline_name)) text = transferMessage(data);
          } else text = transferMessage(data);
          break;
        case EVENT_MAP.ESTIMATE_SET:
          text = `${data.user_name} set an estimate of ${data.estimate} for ${buildIssue(data)}`;
          break;
        case EVENT_MAP.ESTIMATE_CLEARED:
          text = `${data.user_name} cleared estimate for ${buildIssue(data)}`;
          break;
        case EVENT_MAP.ISSUE_REPRIORITIZED:
          text = `${data.user_name} reprioritized ${buildIssue(data)} in ${data.to_pipeline_name}`;
          break;
        default:
          text = null;
      }
      if (text) {
        axios.post(SLACK_WEBHOOK_URL, { text }).catch(console.log);
        callback(null, {
          statusCode: "200",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
      } else callback("Error! Unknown Event Type!");
    }
  } else {
    callback("Error! No event body!");
  }
};
