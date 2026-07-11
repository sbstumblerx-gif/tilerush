// Esimerkkidataa kavereista päivitetyn oletusnelikon kanssa
const MOCK_FRIENDS: ProfileData[] = [
  {
    username: "KoodariKettu",
    friendCode: "TILE-4412-FOX",
    levelsCompleted: 45,
    starsCollected: 120,
    equipped: {
      color: "purple",
      shape: "square",
      pattern: "dots",
      accessory: "headphones",
      theme: "default",
      emojis: ["😭", "😃", "😅", "👍"] // Korjattu oikeaksi oletusnelikoksi
    }
  },
  {
    username: "MopoMestari",
    friendCode: "TILE-9981-RIDE",
    levelsCompleted: 12,
    starsCollected: 31,
    equipped: {
      color: "red",
      shape: "circle",
      pattern: "none",
      accessory: "none",
      theme: "default",
      emojis: ["😭", "😅", "😃", "👍"]
    }
  }
];

// ... ja alempana kaverin profiilidatan parsinnassa:

const getFriendProfileData = (f: CloudProfile): ProfileData => {
  const customEquipped = f.equipped ? (typeof f.equipped === 'string' ? JSON.parse(f.equipped) : f.equipped) : null;
  
  return {
    username: f.username || "Pelaaja",
    friendCode: f.friend_code || "",
    levelsCompleted: f.levels_completed || 0,
    starsCollected: f.stars_collected || 0,
    isSelf: false,
    equipped: {
      color: customEquipped?.color || "purple",
      shape: customEquipped?.shape || "square",
      pattern: customEquipped?.pattern || "none",
      accessory: customEquipped?.accessory || "none",
      theme: customEquipped?.theme || "default",
      emojis: customEquipped?.emojis || ["😭", "😃", "😅", "👍"] // Korjattu viralliset oletusemojit tähänkin
    }
  };
};
