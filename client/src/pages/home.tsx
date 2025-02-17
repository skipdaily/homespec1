import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, HomeIcon, DollarSign, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            HomeSpec
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Document and track every detail of your home construction project
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg" className="mx-2">Get Started</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<HomeIcon className="h-8 w-8" />}
            title="Room Management"
            description="Organize your home details room by room for easy reference"
          />
          <FeatureCard
            icon={<ClipboardList className="h-8 w-8" />}
            title="Item Tracking"
            description="Document specifications, brands, and suppliers for every item"
          />
          <FeatureCard
            icon={<DollarSign className="h-8 w-8" />}
            title="Cost Management"
            description="Track expenses and maintain budget information"
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8" />}
            title="Document Storage"
            description="Store warranties, manuals, and receipts in one place"
          />
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-4 text-primary">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}