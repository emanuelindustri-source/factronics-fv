// F&V (by Factronics) — almacenamiento local (IndexedDB vía Dexie)
import Dexie, { type Table } from "dexie";

export interface Profile {
  id: number;
  name: string;
  role: string;
  company: string;
  language: string;
  theme: string;
}

class FVDatabase extends Dexie {
  profile!: Table<Profile, number>;

  constructor() {
    super("fv-db");
    this.version(1).stores({
      profile: "id"
    });
  }
}

export const db = new FVDatabase();

export const DEMO_PROFILE: Profile = {
  id: 1,
  name: "Khristyan Hidalgo",
  role: "profile.role.demo",
  company: "Factronics, C.A.",
  language: "es-VE",
  theme: "system"
};

export async function getProfile(): Promise<Profile> {
  const existing = await db.profile.get(1);
  if (existing) return existing;
  await db.profile.put(DEMO_PROFILE);
  return DEMO_PROFILE;
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const current = await getProfile();
  const next = { ...current, ...patch, id: 1 };
  await db.profile.put(next);
  return next;
}
