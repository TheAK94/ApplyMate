import React from "react";
import ReactDOM from "react-dom/client";

import ProfileApp from "./ProfileApp";
import "../styles/index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <ProfileApp />
  </React.StrictMode>
);