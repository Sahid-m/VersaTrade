import { TutorialsClient } from '@/components/tutorials/tutorials-client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TutorialsPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4">
       <Card className="mb-8 border-0 shadow-none bg-transparent">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" style={{ color: 'hsl(var(--primary))' }}>
            AI Trading Academy
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Select your experience level and a trading strategy to learn. Our AI will generate a personalized tutorial with recommendations based on historical BTC/USDT data.
          </CardDescription>
        </CardHeader>
      </Card>
      <TutorialsClient />
    </div>
  );
}
