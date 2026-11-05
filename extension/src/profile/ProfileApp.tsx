
import { useEffect, useState } from "react";
import { ArrowLeft, Save, UserRound, GraduationCap, Code2, Plus, X } from "lucide-react";

import {
  getProfile,
  saveProfile
} from "../storage/profileStorage";

import type { UserProfile } from "../types/profile";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedProfile = await getProfile();

        setProfile(savedProfile);
        setPersonal(savedProfile.personal);
        setEducation(savedProfile.education);
        setSkills(savedProfile.skills ?? []);
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

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const updatedProfile: UserProfile = {
        ...profile,
        personal,
        education,
        skills,
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
