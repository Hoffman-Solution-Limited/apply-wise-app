import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl text-center space-y-6">
        <BrandLogo size="lg" showTagline className="justify-center" />
        <p className="text-muted-foreground">{BRAND.description}</p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
