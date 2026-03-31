import { PadynaLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <PadynaLogo />
        <Link to="/overview">
          <Button>Go to overview</Button>
        </Link>
      </div>
    </div>
  );
}
