import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";

const items = [
  {
    email: "alex.t@company.com",
    id: "1",
    name: "Alex Thompson",
    status: "Accepted",
    role: "Admin",
    dateJoined: "Dec 3, 2025",
  },
  {
    email: "sarah.c@company.com",
    id: "2",
    role: "Member",
    name: "Sarah Chen",
    status: "Pending",
    dateJoined: "Jan 15, 2026",
  },
];

export function TeamMembersTable() {
  return (
    <Table className=" ">
      <TableHeader className="w-full text-muted-foreground ">
        <TableRow className="hover:bg-transparent text-muted-foreground text-xs">
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow className="w-full" key={item.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <span className="mt-0.5 text-muted-foreground text-xs">
                    Joined on {item.dateJoined}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.role}</TableCell>
            <TableCell>{item.status}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
