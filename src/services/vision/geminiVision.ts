import type { Card } from '../../types/cards';
import { parseCardString } from '../../utils/cardUtils';

export async function detectCardsWithGemini(
  imageBase64: string,
  apiKey: string
): Promise<Card[]> {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please set your key in Settings or use manual matrix.');
  }

  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert playing card OCR engine. 
Look at the playing cards in this image (which may be fanned or laid in rows).
Identify every visible card from left to right.
Return ONLY a valid JSON array of strings containing the rank and suit code for each card.
Ranks: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
Suits: S (Spades), H (Hearts), D (Diamonds), C (Clubs)
Example output: ["AS", "10H", "7D", "KC", "2S"]
Do not output markdown codeblocks, explanations, or any extra text.`,
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return [];

  try {
    const parsedStrings: string[] = JSON.parse(rawText);
    const validCards: Card[] = [];
    for (const str of parsedStrings) {
      const card = parseCardString(str);
      if (card) {
        validCards.push(card);
      }
    }
    return validCards;
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON array:', rawText, err);
    return [];
  }
}
