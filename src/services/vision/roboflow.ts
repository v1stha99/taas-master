import type { DetectedCardBox } from '../../types/cards';

export interface RoboflowResponse {
  predictions: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }[];
}

export async function detectCardsWithRoboflow(
  imageBase64: string,
  apiKey: string,
  modelId: string = 'poker-cards-cxcvz-4ofvw/1'
): Promise<DetectedCardBox[]> {
  if (!apiKey) {
    throw new Error('Roboflow API Key is missing. Please set your key in Settings or use manual matrix.');
  }

  // Strip data:image/...;base64, prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const url = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: base64Data,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roboflow detection error (${response.status}): ${errorText}`);
  }

  const data: RoboflowResponse = await response.json();
  return data.predictions.map(p => ({
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    confidence: p.confidence,
    class: p.class.toUpperCase(),
  }));
}
