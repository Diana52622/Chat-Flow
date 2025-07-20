import dotenv from 'dotenv';
dotenv.config();

import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

export async function sendToDialogflow({
  sessionId,
  message,
  languageCode = 'ru',
  projectId
}: {
  sessionId: string;
  message: string;
  languageCode?: string;
  projectId?: string;
}): Promise<any> {
  const actualProjectId = projectId || process.env.DIALOGFLOW_PROJECT_ID;
  if (!actualProjectId) {
    throw new Error('Dialogflow project ID is not set');
  }
  const url = `https://dialogflow.googleapis.com/v2/projects/${actualProjectId}/agent/sessions/${sessionId}:detectIntent`;

  let headers;
  try {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/dialogflow'] });
    headers = await auth.getRequestHeaders();
  } catch (error: any) {
    console.error('Failed to get access token (full details):', error);
    throw new Error('Could not obtain access token for Dialogflow');
  }

  const body = {
    queryInput: {
      text: {
        text: message,
        languageCode
      }
    }
  };

  function headersToObject(headers: any): Record<string, string> {
    if (typeof headers.forEach === 'function') {
      const result: Record<string, string> = {};
      headers.forEach((value: string, key: string) => {
        result[key] = value;
      });
      return result;
    }
    return { ...headers };
  }

  const mergedHeaders = {
    ...headersToObject(headers),
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: mergedHeaders,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dialogflow API error: ${error}`);
  }

  return await response.json();
}
