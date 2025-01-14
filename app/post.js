const https = require("https");
const url = require("url");

const parsed = url.parse(process.env.URL);

const postToSlack = (message, callback) => {
  var alertMessage = BuildBlockAlertMessage(message);
  const postData = JSON.stringify(alertMessage);

  const options = {
    hostname: parsed.host,
    port: 443,
    path: parsed.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    res.on("end", () => {
      console.log("No more data in response.");
      callback(null);
    });
  });

  req.on("error", (e) => {
    console.error(`problem with request: ${e.message}`);
    callback(e);
  });

  // Write data to request body
  req.write(postData);
  req.end();
};

function sendMessage(record, callback) {
  if (!record || !record.Sns || !record.Sns.Message) {
    callback(null);
  }
  postToSlack(record.Sns.Message, callback);
}

exports.handler = function (event, context, callback) {
  if (!event.Records) {
    console.log("No records to process");
    return callback(null);
  }
  var count = event.Records.length;
  for (var n = 0; n < event.Records.length; n++) {
    sendMessage(event.Records[n], function (err) {
      console.log(err);
      if (--count === 0) {
        callback(null);
      }
    });
  }
};

if (process.env.TEST) {
  const testEvent = {
    Records: [
      {
        Sns: {
          Message: "Test message",
        },
      },
    ],
  };
  exports.handler(testEvent, {}, console.log);
}

const formatDateTime = (dateString) => {
  const options = { day: "numeric", month: "numeric", year: "numeric" };
  var date = new Date(dateString).toLocaleString(undefined, options);
  var hr = new Date(dateString).getUTCHours();
  var min = new Date(dateString).getUTCMinutes();
  var sec = new Date(dateString).getUTCSeconds();
  var time = `${hr}:${min}:${sec}`;
  return { date: date, time: time };
};

const BuildBlockAlertMessage = (message) => {
  if (typeof String.prototype.replaceAll === "undefined") {
    String.prototype.replaceAll = function (match, replace) {
      return this.replace(new RegExp(match, "g"), () => replace);
    };
  }
  message = message.replaceAll("“", '"');
  message = message.replaceAll("”", '"');
  let messageObject = JSON.parse(message);
  let messageSkeloton = {
    text: "Alert",
    blocks: [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Client:*\t" + process.env.CLIENT,
          },
          {
            type: "mrkdwn",
            text: "*AWSAccountId:*\t" + messageObject.AWSAccountId,
          },
        ],
      },

      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*AlarmName*\n" + messageObject.AlarmName,
          },

          {
            type: "mrkdwn",
            text: "*AlarmDescription:*\n" + messageObject.AlarmDescription,
          },
        ],
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "DateAndTime",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Date:*\n" + new Date().toLocaleDateString(),
          },
          {
            type: "mrkdwn",
            text: "*Time:*\n" + new Date().toLocaleTimeString(),
          },
        ],
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "State",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*NewStateValue:*\n" + messageObject.NewStateValue,
          },

          {
            type: "mrkdwn",
            text: "*NewStateReason:*\n" + messageObject.NewStateReason,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text:
              "*StateChangeTime:*\n" +
              formatDateTime(messageObject.StateChangeTime).time,
          },

          {
            type: "mrkdwn",
            text: "*Region:*\n" + messageObject.Region,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*AlarmArn:*\n" + messageObject.AlarmArn,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*OldStateValue:*\n" + messageObject.OldStateValue,
          },
          {
            type: "mrkdwn",
            text: "*OKActions:*\n" + messageObject.OKActions,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*AlarmActions:*\n" + messageObject.AlarmActions,
          },
          {
            type: "mrkdwn",
            text: "*InsufficientDataActions:*\n" + messageObject.OKActions,
          },
        ],
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Trigger",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*MetricName:*\n" + messageObject.Trigger.MetricName,
          },
          {
            type: "mrkdwn",
            text: "*Namespace:*\n" + messageObject.Trigger.Namespace,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*StatisticType:*\n" + messageObject.Trigger.StatisticType,
          },
          {
            type: "mrkdwn",
            text: "*Unit:*\n" + messageObject.Trigger.Unit,
          },
        ],
      },

      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Dimensions",
        },
      },

      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Name:*\n" + messageObject.Trigger.Dimensions[0].name,
          },
          {
            type: "mrkdwn",
            text: "*Value:*\n" + messageObject.Trigger.Dimensions[0].value,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Period:*\n" + messageObject.Trigger.Period,
          },
          {
            type: "mrkdwn",
            text:
              "*EvaluationPeriods:*\n" +
              messageObject.Trigger.EvaluationPeriods,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text:
              "*DatapointsToAlarm:*\n" +
              messageObject.Trigger.DatapointsToAlarm,
          },
          {
            type: "mrkdwn",
            text:
              "*ComparisonOperator:*\n" +
              messageObject.Trigger.ComparisonOperator,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Threshold:*\n" + messageObject.Trigger.Threshold,
          },
          {
            type: "mrkdwn",
            text:
              "*TreatMissingData:*\n" + messageObject.Trigger.TreatMissingData,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text:
              "*EvaluateLowSampleCountPercentile:*\n" +
              messageObject.Trigger.EvaluateLowSampleCountPercentile,
          },
        ],
      },

      {
        type: "divider",
      },
    ],
  };

  return messageSkeloton;
};
