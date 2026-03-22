import { Button } from "../ui/button";

export function AddOns() {
  return (
    <div className=" bg-card text-card-foreground">
      <div className="grid gap-6 p-4 md:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Add-ons</h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Get even more out of Padyna with special add-ons.
            </p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <p className="text-justify text-sm leading-relaxed">
            Get access to exclusive enhancements by purchasing our add-ons to complement your
            experience. Each add-on is designed to provide additional value and functionality,
            allowing you to customize your usage according to your needs.
          </p>
          <Button className="w-full px-4 sm:w-fit" size="sm">
            Purchase add-ons
          </Button>
        </div>
      </div>
    </div>
  );
}
