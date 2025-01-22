"use client";
import { useEffect, useState } from "react";
import pusherClient from "../lib/pusher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type Packet = {
  source_port: number;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  length: number;
  request_line: string;
  status: string;
};

// New component for packet row with expandable request line
const PacketRow = ({ packet, index }: { packet: Packet; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get first line of request
  const firstLine = packet.request_line.split("\n")[0];

  return (
    <tr
      key={index}
      className={`${
        index % 2 === 0 ? "bg-muted/50" : ""
      } cursor-pointer hover:bg-muted/70 transition-colors`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <td className="border px-4 py-2">{packet.source_port}</td>
      <td className="border px-4 py-2">{packet.timestamp}</td>
      <td className="border px-4 py-2">{packet.source_ip}</td>
      <td className="border px-4 py-2">{packet.destination_ip}</td>
      <td className="border px-4 py-2">{packet.protocol}</td>
      <td className="border px-4 py-2">{packet.length}</td>
      <td className="border px-4 py-2">
        <div className="whitespace-pre-wrap max-w-[30rem] break-words">
          {isExpanded ? packet.request_line : firstLine}
        </div>
      </td>
      <td className="border px-4 py-2">{packet.status}</td>
    </tr>
  );
};

export default function PacketDisplay() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [chartData, setChartData] = useState<
    { timestamp: string; length: number }[]
  >([]);

  useEffect(() => {
    const channel = pusherClient.subscribe("packet-channel");
    channel.bind("packet-event", (data: Packet) => {
      // Decode the Base64 request_line
      const decodedRequestLine = decodeBase64(data.request_line);
      const decodedPacket = { ...data, request_line: decodedRequestLine };

      setPackets((prevPackets) => {
        const newPackets = [decodedPacket, ...prevPackets.slice(0, 999)];
        updateChartData(newPackets);
        return newPackets;
      });
    });

    return () => {
      pusherClient.unsubscribe("packet-channel");
    };
  }, []);

  const decodeBase64 = (base64String: string): string => {
    try {
      return atob(base64String);
    } catch (error) {
      console.error("Invalid Base64 string:", base64String, error);
      return "Invalid Base64";
    }
  };

  const updateChartData = (packets: Packet[]) => {
    const newChartData = packets
      .slice(0, 20)
      .map((packet) => ({
        timestamp: packet.timestamp,
        length: packet.length,
      }))
      .reverse();
    setChartData(newChartData);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Packet Length Over Time</CardTitle>
          <CardDescription>Visualizing the last 20 packets</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              length: {
                label: "Packet Length",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="length"
                  stroke="var(--color-length)"
                  name="Packet Length"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Network Packets</CardTitle>
          <CardDescription>
            Real-time packet data (click row to expand request details)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Source Port</th>
                  <th className="px-4 py-2">Timestamp</th>
                  <th className="px-4 py-2">Source IP</th>
                  <th className="px-4 py-2">Destination IP</th>
                  <th className="px-4 py-2">Protocol</th>
                  <th className="px-4 py-2">Length</th>
                  <th className="px-4 py-2">Request Line</th>
                  <th className="px-4 py-2">Flag</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((packet, index) => (
                  <PacketRow key={index} packet={packet} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
