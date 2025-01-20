import Pusher from "pusher";
import { NextResponse } from "next/server";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Create an interface for the packet data structure
interface Packet {
  source_port: number;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  length: number;
  request_line: string;
  status: string;
}

// Buffer to store packets
let packetBuffer: Packet[] = [];
let lastSentTime = Date.now();
const BUFFER_INTERVAL = 30000; // 30 seconds in milliseconds

export async function POST(req: Request) {
  const body = await req.json();

  try {
    // Add packet to buffer
    packetBuffer.push(body);

    // Check if it's time to send the buffer
    const currentTime = Date.now();
    if (currentTime - lastSentTime >= BUFFER_INTERVAL) {
      // Send buffered packets as a batch
      if (packetBuffer.length > 0) {
        await pusher.trigger(
          "packet-channel",
          "packet-batch-event",
          packetBuffer
        );
        // Clear the buffer after successful send
        packetBuffer = [];
        lastSentTime = currentTime;
      }
      return NextResponse.json({
        message: "Batch sent",
        packetsCount: packetBuffer.length,
      });
    }

    // If buffer interval hasn't elapsed, just acknowledge receipt
    return NextResponse.json({
      message: "Packet buffered",
      bufferedCount: packetBuffer.length,
    });
  } catch (error) {
    console.error("Error processing packet:", error);
    return NextResponse.json(
      {
        error: "Failed to process packet",
      },
      { status: 500 }
    );
  }
}

// Add a cleanup function to prevent memory leaks
setInterval(() => {
  const currentTime = Date.now();
  if (
    currentTime - lastSentTime >= BUFFER_INTERVAL &&
    packetBuffer.length > 0
  ) {
    pusher
      .trigger("packet-channel", "packet-batch-event", packetBuffer)
      .then(() => {
        packetBuffer = [];
        lastSentTime = currentTime;
      })
      .catch((error) =>
        console.error("Error sending buffered packets:", error)
      );
  }
}, BUFFER_INTERVAL);
