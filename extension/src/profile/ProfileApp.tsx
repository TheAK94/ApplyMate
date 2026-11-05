
import { useEffect, useState } from "react";
import { ArrowLeft, Save, UserRound, GraduationCap } from "lucide-react";

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
