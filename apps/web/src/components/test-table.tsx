import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RotateCcw } from "lucide-react";
import { Button } from "./ui/button";

// --- Mock Data ---
const MOCK_REQUESTS = [
  {
    id: "1",
    dateRequested: "10/24/2023",
    clientName: "Acme Corp",
    type: "residential",
    requestedBy: "Sarah Johnson",
    status: "COMPLETED",
  },
  {
    id: "2",
    dateRequested: "10/25/2023",
    clientName: "Global Industries",
    type: "commercial",
    requestedBy: "Michael Chen",
    status: "IN_PROGRESS",
  },
  {
    id: "3",
    dateRequested: "10/26/2023",
    clientName: " ", // Testing empty client name fallback
    type: "land",
    requestedBy: "David Miller",
    status: "PENDING",
  },
  {
    id: "4",
    dateRequested: "10/27/2023",
    clientName: "Wayne Enterprises",
    type: "industrial",
    requestedBy: "Bruce Wayne",
    status: "COMPLETED",
  },
];

export function TestTable() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Simulate data fetching
  const loadData = () => {
    setIsLoading(true);
    setError(false);

    setTimeout(() => {
      // Toggle this to test the "No data" or "Error" states
      setRequests(MOCK_REQUESTS);
      setIsLoading(false);
    }, 1500);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="p-8 flex flex-col justify-center items-center gap-4">
        <div className="text-red-600 text-lg text-center mt-24">
          Error loading recent requests data. Please try again
        </div>
        <Button variant="outline" onClick={loadData} className="flex items-center gap-2 h-10">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-md font-semibold mb-4">Recent Valuations</h2>
      <div className="border rounded-lg">
        <Table>
          <TableHeader className="bg-red-50 h-14">
            <TableRow>
              <TableHead className="text-red-500 font-medium text-center">Date Requested</TableHead>
              <TableHead className="text-red-500 font-medium text-center">Client</TableHead>
              <TableHead className="text-red-500 font-medium text-center">Type</TableHead>
              <TableHead className="text-red-500 font-medium text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No recent completed valuations found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="text-center h-14">{request.dateRequested}</TableCell>
                  <TableCell className="text-center h-14">
                    {request.clientName.trim() !== "" ? request.clientName : "---"}
                  </TableCell>
                  <TableCell className="text-center h-14">{request.type}</TableCell>
                  <TableCell className="text-center h-14">
                    <span className="capitalize">
                      {request.status === "IN_PROGRESS" ? "In Progress" : request.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
