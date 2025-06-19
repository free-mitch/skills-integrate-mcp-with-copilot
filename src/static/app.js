document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login");
  const teacherName = document.getElementById("teacher-name");
  const loginMessage = document.getElementById("login-message");

  let authToken = null;

  // Function to show/hide UI elements based on auth state
  function updateUIForAuthState() {
    const isAuthenticated = !!authToken;
    loginBtn.classList.toggle("hidden", isAuthenticated);
    logoutBtn.classList.toggle("hidden", !isAuthenticated);
    teacherName.classList.toggle("hidden", !isAuthenticated);
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.style.display = isAuthenticated ? "block" : "none";
    });
    if (!isAuthenticated) {
      teacherName.textContent = "";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const card = document.createElement("div");
        card.className = "activity-card";

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-container";

        const participantsList = details.participants
          .map(
            (email) => `
          <li>
            <span class="participant-email">${email}</span>
            <button class="delete-btn" data-activity="${name}" data-email="${email}">
              Remove
            </button>
          </li>
        `
          )
          .join("");

        card.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <div class="participants-section">
            <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
            ${details.participants.length > 0 
              ? `<ul>${participantsList}</ul>`
              : `<p>No participants yet</p>`
            }
          </div>
        `;

        activitiesList.appendChild(card);

        // Add to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Update UI based on auth state
      updateUIForAuthState();

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      console.error("Error fetching activities:", error);
      activitiesList.innerHTML = "<p class='error'>Error loading activities</p>";
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authToken) {
      showMessage(
        "Please log in as a teacher to remove students",
        "error"
      );
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to unregister student");

      showMessage("Successfully removed student from activity", "success");
      fetchActivities();
    } catch (error) {
      console.error("Error unregistering:", error);
      showMessage("Error removing student from activity", "error");
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please log in as a teacher to register students", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to sign up");
      }

      showMessage("Successfully signed up for activity!", "success");
      signupForm.reset();
      fetchActivities();
    } catch (error) {
      console.error("Error signing up:", error);
      showMessage(error.message, "error");
    }
  });

  // Show/hide login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.add("visible");
    loginMessage.classList.add("hidden");
  });

  cancelLoginBtn.addEventListener("click", () => {
    loginModal.classList.remove("visible");
    loginForm.reset();
  });

  // Handle login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const token = btoa(`${username}:${password}`);
      const response = await fetch("/auth/validate", {
        headers: {
          Authorization: `Basic ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      authToken = token;
      teacherName.textContent = `Welcome, ${data.displayName}`;
      loginModal.classList.remove("visible");
      loginForm.reset();
      updateUIForAuthState();
      showMessage("Successfully logged in", "success");
    } catch (error) {
      console.error("Login error:", error);
      loginMessage.textContent = "Invalid username or password";
      loginMessage.classList.remove("hidden");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    authToken = null;
    updateUIForAuthState();
    showMessage("Successfully logged out", "info");
  });

  // Helper function to show messages
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Initialize app
  fetchActivities();
});
