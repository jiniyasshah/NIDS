import Pusher from "pusher";
import { NextResponse } from "next/server";
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});
export async function POST(req: Request) {
  const body = await req.json();
  await pusher.trigger("packet-channel", "packet-event", body);
  return NextResponse.json({ message: "Event sent" });
}
