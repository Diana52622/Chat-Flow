import dotenv from 'dotenv';
dotenv.config();
import { v4 as uuidv4 } from 'uuid';
import { SessionsClient, protos } from '@google-cloud/dialogflow';

type Value = {
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
};

type DialogflowContext = {
  name: string;
  parameters: {
    fields: { [key: string]: Value };
  };
};
import path from 'path';
import fs from 'fs';

// Set the path to your service account key file
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'trips-mevj-3f9d7752feec.json';

// Verify credentials file exists
if (!fs.existsSync(credentialsPath)) {
  throw new Error(`Google Cloud credentials file not found at: ${credentialsPath}`);
}

// Initialize Dialogflow client
const sessionClient = new SessionsClient({
  keyFilename: credentialsPath
});

const projectId = process.env.DIALOGFLOW_PROJECT_ID || 'trips-mevj';
const languageCode = 'ru';

export interface DialogflowResponse {
  queryResult: {
    queryText: string;
    intent: {
      displayName: string;
      isFallback: boolean;
    };
    parameters: {
      fields: {
        [key: string]: {
          stringValue?: string;
          numberValue?: number;
          boolValue?: boolean;
        };
      };
    };
    fulfillmentText: string;
    allRequiredParamsPresent: boolean;
    outputContexts: Array<{
      name: string;
      parameters: {
        fields: {
          [key: string]: any;
        };
      };
    }>;
  };
  session: string;
  responseId: string;
}

export async function sendToDialogflow(
  message: string,
  sessionId: string = uuidv4(),
  languageCode: string = 'ru'
): Promise<DialogflowResponse> {
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: languageCode,
      },
    },
    queryParams: {
      timeZone: 'Europe/Moscow',
    },
  };

  try {
    console.log(`Sending to Dialogflow: ${message}`);
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0];
    
    if (!result) {
      throw new Error('No response from Dialogflow');
    }

    console.log('Dialogflow response:', JSON.stringify(result, null, 2));
    
    return {
      responseId: result.responseId || '',
      session: sessionId,
      queryResult: {
        queryText: message, // Include the original message as queryText
        intent: {
          displayName: result.queryResult?.intent?.displayName || '',
          isFallback: result.queryResult?.intent?.isFallback || false,
        },
        parameters: {
          fields: Object.fromEntries(
            Object.entries(result.queryResult?.parameters?.fields || {}).map(([key, value]) => {
              const val: Value = {};
              // Safely handle null/undefined values
              if (value?.stringValue !== undefined && value.stringValue !== null) {
                val.stringValue = value.stringValue;
              }
              if (value?.numberValue !== undefined && value.numberValue !== null) {
                val.numberValue = value.numberValue;
              }
              if (value?.boolValue !== undefined && value.boolValue !== null) {
                val.boolValue = value.boolValue;
              }
              return [key, val];
            })
          )
        },
        fulfillmentText: result.queryResult?.fulfillmentText || '',
        allRequiredParamsPresent: result.queryResult?.allRequiredParamsPresent || false,
        outputContexts: (result.queryResult?.outputContexts || []).map(context => {
          // Safely handle potentially null/undefined context
          const contextName = context?.name || '';
          const contextParams = context?.parameters?.fields || {};
          
          return {
            name: contextName,
            parameters: {
              fields: Object.fromEntries(
                Object.entries(contextParams).map(([key, value]) => [key, {
                  stringValue: value?.stringValue || undefined,
                  numberValue: value?.numberValue || undefined,
                  boolValue: value?.boolValue || undefined
                }])
              )
            }
          };
        })
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dialogflow API Error:', error);
    throw new Error(`Failed to process message with Dialogflow: ${errorMessage}`);
  }
}
