import { useState } from "react";
import { UserRound } from "lucide-react";

export function CustomerAvatar({ customerId, avatarUrl, size = 26 }: { customerId: string; avatarUrl: string | null; size?: number }) {
  // A new source/account remounts the image and resets its error state.
  return <AvatarImage key={customerId + (avatarUrl ?? "")} avatarUrl={avatarUrl} size={size}/>;
}

function AvatarImage({ avatarUrl, size }: { avatarUrl: string | null; size: number }) {
  const [attempt, setAttempt] = useState(0);
  if (!avatarUrl || attempt > 1) return <UserRound size={size} aria-hidden="true"/>;
  const source = avatarUrl.startsWith("/api/v1/auth/avatar") ? avatarUrl : "/api/v1/auth/avatar";
  return <img src={attempt === 0 ? source : avatarUrl.startsWith("https://") ? avatarUrl : "data:,"} alt=""
    referrerPolicy="no-referrer" onError={() => setAttempt((value) => value + 1)}/>;
}
