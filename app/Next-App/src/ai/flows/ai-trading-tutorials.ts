'use server';

/**
 * @fileOverview This file defines the AI trading tutorials flow.
 *
 * It provides AI-powered tutorials and recommendations to guide new users through different trading strategies.
 * - aiTradingTutorials - A function that generates trading tutorials and recommendations.
 * - AITradingTutorialsInput - The input type for the aiTradingTutorials function.
 * - AITradingTutorialsOutput - The return type for the aiTradingTutorials function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AITradingTutorialsInputSchema = z.object({
  strategyType: z
    .string()
    .describe(
      'The type of trading strategy the user wants to learn about, e.g., option strategy, fundamental strategy.'
    ),
  experienceLevel: z
    .string()
    .describe(
      'The experience level of the user (beginner, intermediate, advanced).'
    ),
  historicalData: z
    .string()
    .describe(
      'Historical data of the BTC/USDT market to be used as a tool for demonstrating the strategy.'
    ),
});
export type AITradingTutorialsInput = z.infer<typeof AITradingTutorialsInputSchema>;

const AITradingTutorialsOutputSchema = z.object({
  tutorialContent: z
    .string()
    .describe('The content of the AI-powered trading tutorial.'),
  recommendations: z
    .string()
    .describe(
      'AI-powered recommendations for applying the learned strategy in the simulated trading environment.'
    ),
});
export type AITradingTutorialsOutput = z.infer<typeof AITradingTutorialsOutputSchema>;

export async function aiTradingTutorials(
  input: AITradingTutorialsInput
): Promise<AITradingTutorialsOutput> {
  return aiTradingTutorialsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTradingTutorialsPrompt',
  input: {schema: AITradingTutorialsInputSchema},
  output: {schema: AITradingTutorialsOutputSchema},
  prompt: `You are an AI trading tutor that specializes in teaching option and fundamental strategies for trading btc/usdt.  Use the historical data of btc/usdt market to show when to use certain strategies.

  Given the user's experience level: {{{experienceLevel}}},
  and the strategy type: {{{strategyType}}},
  generate a tutorial and recommendations for applying this strategy.

  Historical Data: {{{historicalData}}}

  Tutorial Content:
  Recommendations: `,
});

const aiTradingTutorialsFlow = ai.defineFlow(
  {
    name: 'aiTradingTutorialsFlow',
    inputSchema: AITradingTutorialsInputSchema,
    outputSchema: AITradingTutorialsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
