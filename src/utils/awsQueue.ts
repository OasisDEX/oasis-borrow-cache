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
    const aws = new AWS.SQS({ apiVersion: '2012-11-05' });
    aws.config.getCredentials(function(err) {
      if (err) console.log(err.stack);
      else {
        console.log('Access key:', AWS?.config?.credentials?.accessKeyId);
      }
    });
    return aws;
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
