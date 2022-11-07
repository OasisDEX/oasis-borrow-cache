import * as AWS from 'aws-sdk';

function getAWS() {
  if (process.env.AWS_SQS == 'production') {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    return new AWS.SQS({ apiVersion: '2012-11-05' });
  } else {
    const aws = {
      sendMessage: (
        params: AWS.SQS.SendMessageRequest,
        callback?: ((err: AWS.AWSError, data: AWS.SQS.SendMessageResult) => void) | undefined,
      ) => {
        console.log('Queue message body ', params);
      },
    };
    return aws;
  }
}
const aws = getAWS();
export { aws };
