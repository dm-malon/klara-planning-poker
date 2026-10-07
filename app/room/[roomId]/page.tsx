import type { Metadata } from "next";
import { Suspense } from "react";
import { Room } from "@/components/Room";
import { parseRoomInput } from "@/lib/roomId";
import { notFound } from "next/navigation";

// Shown in link previews of invite links; the live tab title is set by <Room>.
export const metadata: Metadata = {
  title: "Join the table",
  description:
    "You're invited to a planning poker session. Pick a name and take a seat.",
  openGraph: {
    type: "website",
    siteName: "KLARA Planning Poker",
    title: "Join the table · KLARA Planning Poker",
    description:
      "You're invited to a planning poker session. Pick a name and take a seat.",
  },
};

export default function RoomPage({ params }: PageProps<"/room/[roomId]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      {params.then(({ roomId }) => {
        const id = parseRoomInput(decodeURIComponent(roomId));
        if (!id) notFound();
        return <Room roomId={id} />;
      })}
    </Suspense>
  );
}
