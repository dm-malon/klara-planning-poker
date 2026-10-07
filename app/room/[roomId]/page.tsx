import type { Metadata } from "next";
import { Suspense } from "react";
import { Room } from "@/components/Room";
import { parseRoomInput } from "@/lib/roomId";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Room · KLARA PLANNING POKER",
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
