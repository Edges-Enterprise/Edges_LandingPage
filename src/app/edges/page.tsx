import { permanentRedirect } from "next/navigation";

// The Edges Network site is served from / now; keep /edges working for links
// that predate the move.
export default function EdgesRedirect() {
  permanentRedirect("/");
}
