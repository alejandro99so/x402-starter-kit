import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PaymentCardProps {
  tier: string;
  price: string;
  description: string;
  features?: string[];
  onPayClick: () => void;
  isPaying: boolean;
  isDisabled?: boolean;
}

export function PaymentCard({ tier, price, description, features, onPayClick, isPaying, isDisabled = false }: PaymentCardProps) {
  const isPremium = tier === "Premium";
  const isInactive = isDisabled && !isPaying;

  return (
    <Card className={`w-full max-w-sm transition-all duration-300 ease-out ${isInactive ? 'opacity-50 grayscale pointer-events-none' : 'hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1'} ${isPremium && !isInactive ? 'border-primary/30 shadow-lg ring-1 ring-primary/10' : 'hover:border-primary/20'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{tier}</CardTitle>
          <Badge
            variant={isPremium ? "default" : "secondary"}
            className={`transition-all duration-300 ${isPremium ? 'bg-primary hover:bg-primary/90' : 'hover:bg-secondary/80'}`}
          >
            {isPremium ? "Popular" : "Starter"}
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold mb-4 text-foreground">
          {price} <span className="text-sm font-normal text-muted-foreground">USDC</span>
        </div>
        {features && features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-muted-foreground">
                <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={onPayClick}
          disabled={isPaying}
        >
          {isPaying ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : "Pay Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
