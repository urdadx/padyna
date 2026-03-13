import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface FilterByTypesProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export const FilterByTypes = ({ value, onChange }: FilterByTypesProps) => {
  const displayValue =
    value === "File"
      ? "Files"
      : value === "Link"
        ? "Links"
        : value === "Text"
          ? "Text snippets"
          : value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" className="h-9 font-normal">
          {displayValue ? displayValue : "All types"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onChange(undefined)}>All types</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("File")}>Files</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("Link")}>Links</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("Q&A")}>Q&A</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("Text")}>Text snippets</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
