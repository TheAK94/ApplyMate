
import { useEffect, useState } from "react";
import { ArrowLeft, Save, UserRound, GraduationCap, Code2, Plus, X, FolderKanban, Trash2, BriefcaseBusiness, Globe } from "lucide-react";

import {
  getProfile,
  saveProfile
} from "../storage/profileStorage";

import type { UserProfile, Project, Experience } from "../types/profile";

type PersonalInfo = UserProfile["personal"];

function ProfileApp() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [personal, setPersonal] = useState<PersonalInfo>({
    fullName: "",
    email: "",
    phone: "",
    location: ""
  });
  const [education, setEducation] = useState({
    college: "",
    degree: "",
    branch: "",
    graduationYear: "",
    cgpa: ""
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTechInputs, setProjectTechInputs] = useState<
    Record<string, string>
  >({});
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [links, setLinks] = useState({
    linkedin: "",
    github: "",
    portfolio: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const createEmptyProject = (): Project => ({
    id: crypto.randomUUID(),
    name: "",
    description: "",
    technologies: [],
    link: ""
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedProfile = await getProfile();

        setProfile(savedProfile);
        setPersonal(savedProfile.personal);
        setEducation(savedProfile.education);
        setSkills(savedProfile.skills ?? []);
        setProjects(savedProfile.projects ?? []);
        setExperiences(savedProfile.experiences ?? []);
        setLinks(savedProfile.links ?? {
          linkedin: "",
          github: "",
          portfolio: ""
        });

        const savedProjects = savedProfile.projects ?? [];

        setProjectTechInputs(
          Object.fromEntries(
            savedProjects.map((project) => [
              project.id,
              project.technologies.join(", ")
            ])
          )
        );
      } catch (error) {
        console.error("Unable to load profile:", error);
        setMessage("Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setPersonal((prev) => ({
      ...prev,
      [name]: value
    }));

    setMessage("");
  };

  const handleEducationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setEducation((prev) => ({
      ...prev,
      [name]: value
    }));

    setMessage("");
  };


  const handleLinksChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setLinks((prev) => ({
      ...prev,
      [name]: value
    }));

    setMessage("");
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const updatedProjects = projects.map((project) => ({
        ...project,
        technologies: (
          projectTechInputs[project.id] ?? ""
        )
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean)
      }));

      const updatedProfile: UserProfile = {
        ...profile,
        personal,
        education,
        skills,
        projects: updatedProjects,
        experiences,
        links,
        updatedAt: new Date().toISOString()
      };

      await saveProfile(updatedProfile);

      setProfile(updatedProfile);
      setMessage("Profile saved successfully!");
    } catch (error) {
      console.error("Unable to save profile:", error);
      setMessage("Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    const skill = newSkill.trim();

    if (!skill) return;

    const alreadyExists = skills.some(
      (item) => item.toLowerCase() === skill.toLowerCase()
    );

    if (alreadyExists) {
      setMessage("This skill has already been added.");
      return;
    }

    setSkills((prev) => [...prev, skill]);
    setNewSkill("");
    setMessage("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) =>
      prev.filter((skill) => skill !== skillToRemove)
    );

    setMessage("");
  };

  const handleAddProject = () => {
    setProjects((prev) => [...prev, createEmptyProject()]);
    setMessage("");
  };

  const handleRemoveProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
    setMessage("");
  };

  const handleProjectChange = (
    id: string,
    field: keyof Project,
    value: string
  ) => {
    if (field === "technologies") {
      setProjectTechInputs((prev) => ({
        ...prev,
        [id]: value
      }));
    } else {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id
            ? { ...project, [field]: value }
            : project
        )
      );
    }
    setMessage("");
  };

  const createEmptyExperience = (): Experience => ({
    id: crypto.randomUUID(),
    role: "",
    company: "",
    description: "",
    duration: ""
  });

  const handleAddExperience = () => {
    setExperiences((prev) => [
      ...prev,
      createEmptyExperience()
    ]);

    setMessage("");
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences((prev) =>
      prev.filter((experience) => experience.id !== id)
    );

    setMessage("");
  };

  const handleExperienceChange = (
    id: string,
    field: keyof Experience,
    value: string
  ) => {
    setExperiences((prev) =>
      prev.map((experience) =>
        experience.id === id
          ? { ...experience, [field]: value }
          : experience
      )
    );

    setMessage("");
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <div className="profile-brand">
          <div className="profile-brand-icon">
            <UserRound size={21} />
          </div>

          <div>
            <h1>ApplyMate</h1>
            <span>PROFILE DASHBOARD</span>
          </div>
        </div>

        <button
          className="back-button"
          onClick={() => window.close()}
        >
          <ArrowLeft size={15} />
          Close
        </button>
      </header>

      <main className="profile-container">
        <div className="profile-welcome">
          <span className="profile-eyebrow">YOUR PROFILE</span>
          <h2>Let's get to know you.</h2>
          <p>
            Keep your information updated. ApplyMate uses this
            information to help fill out internship applications.
          </p>
        </div>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <UserRound size={19} />
            </div>

            <div>
              <h3>Personal Information</h3>
              <p>Your basic contact details</p>
            </div>
          </div>

          <div className="profile-form">
            <div className="profile-form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                value={personal.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="profile-form-row">
              <div className="profile-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={personal.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={personal.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="profile-form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                value={personal.location}
                onChange={handleChange}
                placeholder="City, State, Country"
              />
            </div>
          </div>
        </section>

        
        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <GraduationCap size={19} />
            </div>

            <div>
              <h3>Education</h3>
              <p>Your academic background</p>
            </div>
          </div>

          <div className="profile-form">
            <div className="profile-form-group">
              <label htmlFor="college">College / University</label>
              <input
                id="college"
                name="college"
                value={education.college}
                onChange={handleEducationChange}
                placeholder="Enter your college name"
              />
            </div>

            <div className="profile-form-row">
              <div className="profile-form-group">
                <label htmlFor="degree">Degree</label>
                <input
                  id="degree"
                  name="degree"
                  value={education.degree}
                  onChange={handleEducationChange}
                  placeholder="e.g. B.Tech"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="branch">Branch / Specialization</label>
                <input
                  id="branch"
                  name="branch"
                  value={education.branch}
                  onChange={handleEducationChange}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>

            <div className="profile-form-row">
              <div className="profile-form-group">
                <label htmlFor="graduationYear">Graduation Year</label>
                <input
                  id="graduationYear"
                  name="graduationYear"
                  type="number"
                  value={education.graduationYear}
                  onChange={handleEducationChange}
                  placeholder="e.g. 2027"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="cgpa">CGPA</label>
                <input
                  id="cgpa"
                  name="cgpa"
                  value={education.cgpa}
                  onChange={handleEducationChange}
                  placeholder="e.g. 8.5"
                />
              </div>
            </div>
          </div>
        </section>

        
        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <Code2 size={19} />
            </div>

            <div>
              <h3>Skills</h3>
              <p>Add your technical and professional skills</p>
            </div>
          </div>

          <div className="skill-input-row">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="e.g. React, JavaScript, Python"
            />

            <button
              type="button"
              className="add-skill-button"
              onClick={handleAddSkill}
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="skills-list">
            {skills.length > 0 ? (
              skills.map((skill) => (
                <span className="skill-chip" key={skill}>
                  {skill}

                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))
            ) : (
              <p className="skills-empty">
                No skills added yet. Add your first skill above.
              </p>
            )}
          </div>
        </section>
        
        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <FolderKanban size={19} />
            </div>

            <div>
              <h3>Projects</h3>
              <p>Showcase what you've built</p>
            </div>
          </div>

          <div className="project-list">
            {projects.map((project, index) => (
              <div className="project-card" key={project.id}>
                <div className="project-card-heading">
                  <h4>Project {index + 1}</h4>

                  <button
                    type="button"
                    className="remove-project-button"
                    onClick={() => handleRemoveProject(project.id)}
                    aria-label={`Remove project ${index + 1}`}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>

                <div className="profile-form">
                  <div className="profile-form-group">
                    <label htmlFor={`project-name-${project.id}`}>
                      Project Name
                    </label>
                    <input
                      id={`project-name-${project.id}`}
                      value={project.name}
                      onChange={(e) =>
                        handleProjectChange(project.id, "name", e.target.value)
                      }
                      placeholder="e.g. ApplyMate"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor={`project-description-${project.id}`}>
                      Description
                    </label>
                    <textarea
                      id={`project-description-${project.id}`}
                      value={project.description}
                      onChange={(e) =>
                        handleProjectChange(
                          project.id,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Describe what your project does..."
                      rows={4}
                    />
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor={`project-tech-${project.id}`}>
                      Technologies
                    </label>
                    <input
                      id={`project-tech-${project.id}`}
                      value={projectTechInputs[project.id] ?? ""}
                      onChange={(e) =>
                        handleProjectChange(
                          project.id,
                          "technologies",
                          e.target.value
                        )
                      }
                      placeholder="React, Node.js, MongoDB"
                    />
                    <span className="profile-field-hint">
                      Separate technologies with commas.
                    </span>
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor={`project-link-${project.id}`}>
                      GitHub / Demo Link
                    </label>
                    <input
                      id={`project-link-${project.id}`}
                      type="url"
                      value={project.link}
                      onChange={(e) =>
                        handleProjectChange(project.id, "link", e.target.value)
                      }
                      placeholder="https://github.com/username/project"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-project-button"
            onClick={handleAddProject}
          >
            <Plus size={16} />
            Add Project
          </button>

          {projects.length === 0 && (
            <p className="projects-empty">
              No projects added yet. Add your first project!
            </p>
          )}
        </section>
        
        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <BriefcaseBusiness size={19} />
            </div>

            <div>
              <h3>Experience</h3>
              <p>Showcase your internships and work experience</p>
            </div>
          </div>

          <div className="project-list">
            {experiences.map((experience, index) => (
              <div className="project-card" key={experience.id}>
                <div className="project-card-heading">
                  <h4>Experience {index + 1}</h4>

                  <button
                    type="button"
                    className="remove-project-button"
                    onClick={() => handleRemoveExperience(experience.id)}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>

                <div className="profile-form">
                  <div className="profile-form-group">
                    <label>Role / Job Title</label>
                    <input
                      value={experience.role}
                      onChange={(e) =>
                        handleExperienceChange(
                          experience.id,
                          "role",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Frontend Developer Intern"
                    />
                  </div>

                  <div className="profile-form-row">
                    <div className="profile-form-group">
                      <label>Company</label>
                      <input
                        value={experience.company}
                        onChange={(e) =>
                          handleExperienceChange(
                            experience.id,
                            "company",
                            e.target.value
                          )
                        }
                        placeholder="Company name"
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Duration</label>
                      <input
                        value={experience.duration}
                        onChange={(e) =>
                          handleExperienceChange(
                            experience.id,
                            "duration",
                            e.target.value
                          )
                        }
                        placeholder="e.g. June 2026 - August 2026"
                      />
                    </div>
                  </div>

                  <div className="profile-form-group">
                    <label>Description</label>
                    <textarea
                      value={experience.description}
                      onChange={(e) =>
                        handleExperienceChange(
                          experience.id,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Describe your responsibilities and achievements..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-project-button"
            onClick={handleAddExperience}
          >
            <Plus size={16} />
            Add Experience
          </button>

          {experiences.length === 0 && (
            <p className="projects-empty">
              No experience added yet. You can add internships, jobs, or other relevant experience.
            </p>
          )}
        </section>
        
        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <Globe size={19} />
            </div>

            <div>
              <h3>Professional Links</h3>
              <p>Your online presence and developer profiles</p>
            </div>
          </div>

          <div className="profile-form">
            <div className="profile-form-group">
              <label htmlFor="linkedin">LinkedIn Profile</label>
              <input
                id="linkedin"
                name="linkedin"
                type="url"
                value={links.linkedin}
                onChange={handleLinksChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="github">GitHub Profile</label>
              <input
                id="github"
                name="github"
                type="url"
                value={links.github}
                onChange={handleLinksChange}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="portfolio">Portfolio Website</label>
              <input
                id="portfolio"
                name="portfolio"
                type="url"
                value={links.portfolio}
                onChange={handleLinksChange}
                placeholder="https://yourportfolio.com"
              />
            </div>
          </div>
        </section>

        <div className="profile-save-area">
            <span className="profile-message">{message}</span>

            <button
              className="profile-save-button"
              onClick={handleSave}
              disabled={saving || !profile}
            >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProfileApp;
