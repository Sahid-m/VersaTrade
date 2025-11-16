'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateTutorialAction } from '@/app/actions';
import { type Tutorial } from '@/lib/types';
import { Loader2, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';


const MOCK_HISTORICAL_DATA = `Date,Open,High,Low,Close
2024-05-01,60681,64720,59111,63784
2024-05-02,63784,64000,62750,63220
2024-05-03,63220,63400,58700,59010
2024-05-04,59010,60100,58800,59500
2024-05-05,59500,61500,59300,61200
2024-05-06,61200,64400,61100,64100
2024-05-07,64100,65500,63900,64300
2024-05-08,64300,64400,61000,61250
2024-05-09,61250,61800,60500,61100
2024-05-10,61100,63450,60000,60800
`;

const formSchema = z.object({
  strategyType: z.string().min(1, 'Please select a strategy type.'),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Please select your experience level.',
  }),
});

export function TutorialsClient() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      strategyType: '',
      experienceLevel: 'beginner',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setTutorial(null);
    const result = await generateTutorialAction({
      ...values,
      historicalData: MOCK_HISTORICAL_DATA,
    });
    setTutorial(result);
    setIsLoading(false);
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="strategyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a trading strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="option strategy">
                            Option Strategy
                          </SelectItem>
                          <SelectItem value="fundamental strategy">
                            Fundamental Strategy
                          </SelectItem>
                           <SelectItem value="technical analysis">
                            Technical Analysis
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4 pt-2"
                        >
                           <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value="beginner" id="beginner" />
                                </FormControl>
                                <FormLabel className="font-normal" htmlFor="beginner">Beginner</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value="intermediate" id="intermediate" />
                                </FormControl>
                                <FormLabel className="font-normal" htmlFor="intermediate">Intermediate</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value="advanced" id="advanced" />
                                </FormControl>
                                <FormLabel className="font-normal" htmlFor="advanced">Advanced</FormLabel>
                            </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Tutorial
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </CardContent>
            </Card>
        </div>
      )}

      {tutorial && (
        <div className="space-y-8 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Tutorial</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none prose-p:text-foreground">
              <Textarea readOnly value={tutorial.tutorialContent} className="h-64 bg-transparent border-0" />
            </CardContent>
          </Card>
          
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none prose-p:text-foreground">
              <Textarea readOnly value={tutorial.recommendations} className="h-48 bg-transparent border-0" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
