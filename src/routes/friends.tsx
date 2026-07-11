import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, X, Check, Copy } from "lucide-react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptRequest, deleteRequest, fetchMyProfile, listFriends, listRequests,
  removeFriend, sendFriendRequest, upsertMyProfile,
  type CloudProfile, type FriendRequestRow,
} from "@/lib/cloud/social";
import { ProfileModal, type ProfileData } from "@/components/game/ProfileModal";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Kaverit · Tile Rush" }] }),
  component: FriendsPage,
});

type Tab = "list" | "requests" | "add" | "leaderboard";

function FriendsPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [me, setMe] = useState<CloudProfile | null>(null);
  const [friends, setFriends] = useState<CloudProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
  
  // Profiilinäkymän tilanhallinta
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const refresh = useCallback(async () => {
    const [prof, fs, reqs] = await Promise.all([fetchMyProfile(), listFriends(), listRequests()]);
    setMe(prof);
    setFriends(fs);
    setIncoming(reqs.incoming);
    setOutgoing(reqs.outgoing);
    
    const cur = loadProgress();
    if (prof) {
      let changed = false;
      if (prof.friend_code && cur.profile.friendCode !== prof.friend_code) {
        cur.profile.friendCode = prof.friend_code; changed = true;
      }
      if (cur.profile.username && cur.profile.username !== "Pelaaja" && cur.profile.username !== prof.username) {
        await upsertMyProfile({ username: cur.profile.username });
      } else if (cur.profile.username === "Pelaaja" && prof.username && prof.username !== cur.profile.username) {
        cur.profile.username = prof.username; changed = true;
      }
      if (changed) saveProgress(cur);
    }
    setP(loadProgress());
  }, []);

  useEffect(()
    
