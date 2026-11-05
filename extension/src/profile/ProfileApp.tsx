
import { useEffect, useState } from "react";
import { ArrowLeft, Save, UserRound } from "lucide-react";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedProfile = await getProfile();

        setProfile(savedProfile);
        setPersonal(savedProfile.personal);
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

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const updatedProfile: UserProfile = {
        ...profile,
        personal,
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
        </section>
      </main>
    </div>
  );
}

export default ProfileApp;
