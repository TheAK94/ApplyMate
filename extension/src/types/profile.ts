
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

export interface Education {
  college: string;
  degree: string;
  branch: string;
  graduationYear: string;
  cgpa: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  description: string;
  duration: string;
}

export interface ProfessionalLinks {
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface ResumeMetadata {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface UserProfile {
  personal: PersonalInfo;
  education: Education;
  skills: string[];
  projects: Project[];
  experiences: Experience[];
  links: ProfessionalLinks;
  resume: ResumeMetadata | null;
  updatedAt: string | null;
}