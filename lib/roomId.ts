const ADJECTIVES = [
  "brave", "calm", "clever", "cosmic", "daring", "eager", "fancy", "fuzzy", "gentle", "happy",
  "jolly", "keen", "lucky", "mighty", "nimble", "proud", "quick", "quiet", "rapid", "shiny",
  "silly", "snappy", "sunny", "swift", "witty", "zesty", "bold", "breezy", "chill", "dapper",
];

const ANIMALS = [
  "otter", "panda", "falcon", "lynx", "koala", "badger", "heron", "gecko", "walrus", "yak",
  "moose", "bison", "fox", "owl", "raven", "seal", "tiger", "wombat", "llama", "orca",
  "puffin", "lemur", "beaver", "hedgehog", "narwhal", "quokka", "sloth", "toucan", "wolf", "zebra",
];

function rand<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateRoomId(): string {
  return `${rand(ADJECTIVES)}-${rand(ANIMALS)}-${Math.floor(Math.random() * 90) + 10}`;
}

/** Accepts a bare code or a pasted invite URL; returns a sanitized room id or null. */
export function parseRoomInput(raw: string): string | null {
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(/\/room\/([^/?#\s]+)/);
  const id = (fromUrl ? fromUrl[1] : trimmed).toLowerCase().replace(/[^a-z0-9-]/g, "");
  return id.length >= 3 && id.length <= 64 ? id : null;
}
