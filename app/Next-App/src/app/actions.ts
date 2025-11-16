'use server';

import {
  aiTradingTutorials,
  type AITradingTutorialsInput,
} from '@/ai/flows/ai-trading-tutorials';
import { type Tutorial } from '@/lib/types';

export async function generateTutorialAction(
  input: AITradingTutorialsInput
): Promise<Tutorial> {
  try {
    const result = await aiTradingTutorials(input);
    return result;
  } catch (error) {
    console.error('Error generating tutorial:', error);
    return {
      tutorialContent:
        'An error occurred while generating the tutorial. Please check the inputs and try again.',
      recommendations: 'Could not generate recommendations due to an error.',
    };
  }
}
