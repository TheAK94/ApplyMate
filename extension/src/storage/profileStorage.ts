
import type { UserProfile } from "../types/profile";

const PROFILE_KEY = "applymate_profile";

export const defaultProfile: UserProfile = {
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: ""
  },

  education: {
    college: "",
    degree: "",
    branch: "",
    graduationYear: "",
    cgpa: ""
  },

  skills: [],

  projects: [],

  experiences: [],

  links: {
    linkedin: "",
    github: "",
    portfolio: ""
  },

  resume: null,

  updatedAt: null
};

// Get saved profile
export async function getProfile(): Promise<UserProfile> {
  const result = await chrome.storage.local.get(PROFILE_KEY);

  const savedProfile = result[PROFILE_KEY] as
    | UserProfile
    | undefined;

  return savedProfile ?? structuredClone(defaultProfile);
}

// Save complete profile
export async function saveProfile(
  profile: UserProfile
): Promise<void> {
  await chrome.storage.local.set({
    [PROFILE_KEY]: {
      ...profile,
      updatedAt: new Date().toISOString()
    }
  });
}

// Update profile
export async function updateProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const currentProfile = await getProfile();

  const updatedProfile: UserProfile = {
    ...currentProfile,
    ...updates,
    personal: {
      ...currentProfile.personal,
      ...(updates.personal ?? {})
    },
    education: {
      ...currentProfile.education,
      ...(updates.education ?? {})
    },
    links: {
      ...currentProfile.links,
      ...(updates.links ?? {})
    },
    updatedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({
    [PROFILE_KEY]: updatedProfile
  });

  return updatedProfile;
}

// Delete profile
export async function clearProfile(): Promise<void> {
  await chrome.storage.local.remove(PROFILE_KEY);
}
