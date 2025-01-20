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

export default function PacketDisplay() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [chartData, setChartData] = useState<
    { timestamp: string; length: number }[]
  >([]);

  useEffect(() => {
    const channel = pusherClient.subscribe("packet-channel");

    // Modified to handle batch updates
    channel.bind("packet-batch-event", (data: Packet[]) => {
      setPackets((prevPackets) => {
        // Merge new packets with existing ones, keeping the latest 1000
        const newPackets = [...data, ...prevPackets].slice(0, 1000);
        updateChartData(newPackets);
        return newPackets;
      });
    });

    // Keep the original single packet handler for backwards compatibility
    channel.bind("packet-event", (data: Packet) => {
      setPackets((prevPackets) => {
        const newPackets = [data, ...prevPackets.slice(0, 999)];
        updateChartData(newPackets);
        return newPackets;
      });
    });

    return () => {
      pusherClient.unsubscribe("packet-channel");
    };
  }, []);

  const updateChartData = (packets: Packet[]) => {
    // Group packets by minute to handle high-frequency updates
    const packetsByMinute = new Map<
      string,
      { count: number; totalLength: number }
    >();

    packets.slice(0, 100).forEach((packet) => {
      const minute = packet.timestamp.substring(0, 16); // Get YYYY-MM-DD HH:mm
      const existing = packetsByMinute.get(minute) || {
        count: 0,
        totalLength: 0,
      };
      packetsByMinute.set(minute, {
        count: existing.count + 1,
        totalLength: existing.totalLength + packet.length,
      });
    });

    const newChartData = Array.from(packetsByMinute.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        length: Math.round(data.totalLength / data.count), // Average length per minute
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-20); // Keep last 20 minutes of data

    setChartData(newChartData);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Packet Length Over Time</CardTitle>
          <CardDescription>
            Average packet length per minute (last 20 minutes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              length: {
                label: "Avg Packet Length",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => value.substring(11, 16)} // Show only HH:mm
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="length"
                  stroke="var(--color-length)"
                  name="Avg Packet Length"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Packets</CardTitle>
          <CardDescription>Real-time packet data</CardDescription>
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
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((packet, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-muted/50" : ""}
                  >
                    <td className="border px-4 py-2">{packet.source_port}</td>
                    <td className="border px-4 py-2">{packet.timestamp}</td>
                    <td className="border px-4 py-2">{packet.source_ip}</td>
                    <td className="border px-4 py-2">
                      {packet.destination_ip}
                    </td>
                    <td className="border px-4 py-2">{packet.protocol}</td>
                    <td className="border px-4 py-2">{packet.length}</td>
                    <td className="border px-4 py-2">{packet.request_line}</td>
                    <td className="border px-4 py-2">{packet.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
