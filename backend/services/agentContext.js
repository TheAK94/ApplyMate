let currentProfile = null;
let currentResumePath = null;

function setProfile(profile) {
  currentProfile = profile;
}

function getProfile() {
  return currentProfile;
}

function setResumePath(path) {
  currentResumePath = path;
}

function getResumePath() {
  return currentResumePath;
}

module.exports = {
  setProfile,
  getProfile,
  setResumePath,
  getResumePath
};