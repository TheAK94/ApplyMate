
import type { FormField } from "../content/extractor";
import type { UserProfile } from "../types/profile";

export interface FieldMatch {
  fieldId: string;
  fieldLabel: string;
  profileKey: string;
  value: string;
  confidence: "high" | "medium";
}

interface ProfileMapping {
  key: string;
  aliases: string[];
  getValue: (profile: UserProfile) => string;
}

const profileMappings: ProfileMapping[] = [
  {
    key: "personal.fullName",
    aliases: ["full name", "your name", "applicant name", "name"],
    getValue: profile => profile.personal.fullName
  },
  {
    key: "personal.email",
    aliases: ["email", "email address", "e-mail"],
    getValue: profile => profile.personal.email
  },
  {
    key: "personal.phone",
    aliases: ["phone", "phone number", "mobile", "mobile number", "contact number"],
    getValue: profile => profile.personal.phone
  },
  {
    key: "personal.location",
    aliases: ["location", "city", "current location", "address"],
    getValue: profile => profile.personal.location
  },
  {
    key: "education.college",
    aliases: ["college", "university", "institution", "school"],
    getValue: profile => profile.education.college
  },
  {
    key: "education.degree",
    aliases: ["degree", "qualification", "education"],
    getValue: profile => profile.education.degree
  },
  {
    key: "education.branch",
    aliases: ["branch", "major", "specialization", "department", "field of study"],
    getValue: profile => profile.education.branch
  },
  {
    key: "education.graduationYear",
    aliases: ["graduation year", "year of graduation", "passing year"],
    getValue: profile => profile.education.graduationYear
  },
  {
    key: "education.cgpa",
    aliases: ["cgpa", "gpa", "grade"],
    getValue: profile => profile.education.cgpa
  },
  {
    key: "links.linkedin",
    aliases: ["linkedin", "linkedin url", "linkedin profile"],
    getValue: profile => profile.links.linkedin
  },
  {
    key: "links.github",
    aliases: ["github", "github url", "github profile"],
    getValue: profile => profile.links.github
  },
  {
    key: "links.portfolio",
    aliases: ["portfolio", "portfolio url", "personal website", "website"],
    getValue: profile => profile.links.portfolio
  }
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchField(
  field: FormField,
  profile: UserProfile
): FieldMatch | null {
  if (field.kind !== "field" || field.disabled) {
    return null;
  }

  const searchableText = [
    field.label,
    field.name,
    field.id,
    field.placeholder
  ]
    .map(normalize)
    .filter(Boolean);

  for (const mapping of profileMappings) {
    const value = mapping.getValue(profile).trim();

    if (!value) continue;

    for (const alias of mapping.aliases) {
      const normalizedAlias = normalize(alias);

      const exactMatch = searchableText.some(
        text => text === normalizedAlias
      );

      const containsMatch = searchableText.some(
        text =>
          text.includes(normalizedAlias) ||
          normalizedAlias.includes(text)
      );

      if (exactMatch || containsMatch) {
        return {
          fieldId: field.fieldId,
          fieldLabel: field.label || field.name || field.id,
          profileKey: mapping.key,
          value,
          confidence: exactMatch ? "high" : "medium"
        };
      }
    }
  }

  return null;
}

export function matchFields(
  fields: FormField[],
  profile: UserProfile
): FieldMatch[] {
  const matches = fields
    .map(field => matchField(field, profile))
    .filter((match): match is FieldMatch => match !== null);

  // Prevent two form fields from using the same profile value.
  const usedKeys = new Set<string>();

  return matches.filter(match => {
    if (usedKeys.has(match.profileKey)) return false;

    usedKeys.add(match.profileKey);
    return true;
  });
}
