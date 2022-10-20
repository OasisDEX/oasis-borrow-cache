import * as AWS from 'aws-sdk';

function getSqs() {
  if (process.env.AWS_SQS !== 'local' || !process.env.AWS_SQS) {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    return sqs.sendMessage;
  }
  const send = (params: AWS.SQS.SendMessageRequest) => {
    console.log('Queue message body ', params);
  };
  return send;
}
export const sendQueueMessage = getSqs();
