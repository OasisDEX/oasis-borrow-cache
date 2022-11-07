import * as AWS from 'aws-sdk';

export enum MessageNames {
  FROB = 'Frob',
  OSM = 'OSM'
}
export enum MessageTypes {
  VAULT = 'VaultEvent',
  OSM = 'OsmEvent',
}

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

export function sendMessage(
  name: MessageNames,
  type: MessageTypes,
  value: string,
  messageBody: string,
  messageDeduplicationId: string,
  messageGroupId: string,
) {
  aws.sendMessage(
    {
      MessageAttributes: {
        Name: {
          DataType: 'String',
          StringValue: name,
        },
        Type: {
          DataType: 'String',
          StringValue: type,
        },
        Value: {
          DataType: 'String',
          StringValue: value,
        },
      },
      MessageBody: messageBody,
      MessageDeduplicationId: messageDeduplicationId,
      MessageGroupId: messageGroupId,
      QueueUrl: process.env.AWS_QUEUE_URL!,
    },
    function(err: any, data: any) {
      if (err) {
        console.log('Error', err);
      } else {
        console.log('Success', data.MessageId);
      }
    },
  );
}
export { aws };
