document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("resumeFile");
  const jobDescription = document.getElementById("jobDescription");
  const fileLabel = document.querySelector(".file-label");
  const selectedFile = document.getElementById("selectedFile");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");
  const removeFile = document.getElementById("removeFile");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadForm = document.getElementById("uploadForm");
  const btnText = document.querySelector(".btn-text");
  const loadingSpinner = document.querySelector(".loading-spinner");

  // File size limit (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Allowed file types
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  // Check if form is valid
  function updateSubmitButton() {
    const hasFile = fileInput.files[0];
    const hasJobDescription = jobDescription.value.trim().length > 0;
    uploadBtn.disabled = !(hasFile && hasJobDescription);
  }

  // File input change handler
  fileInput.addEventListener("change", function (e) {
    handleFileSelection(e.target.files[0]);
  });

  // Job description input handler
  jobDescription.addEventListener("input", function () {
    updateSubmitButton();
  });

  // Drag and drop handlers
  fileLabel.addEventListener("dragover", function (e) {
    e.preventDefault();
    fileLabel.classList.add("dragover");
  });

  fileLabel.addEventListener("dragleave", function (e) {
    e.preventDefault();
    fileLabel.classList.remove("dragover");
  });

  fileLabel.addEventListener("drop", function (e) {
    e.preventDefault();
    fileLabel.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  });

  // Remove file handler
  removeFile.addEventListener("click", function () {
    clearFileSelection();
  });

  // Form submit handler
  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent default form submission

    if (!fileInput.files[0]) {
      showMessage("Please select a file to upload.", "error");
      return;
    }

    if (!jobDescription.value.trim()) {
      showMessage("Please enter a job description.", "error");
      return;
    }

    // Show loading state
    setLoadingState(true);

    // Make API call
    uploadResumeAndAnalyze();
  });

  async function uploadResumeAndAnalyze() {
    try {
      const formData = new FormData();
      formData.append("resumeFile", fileInput.files[0]);
      formData.append("jobDescription", jobDescription.value.trim());

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || "Failed to upload and analyze resume."
        );
      }

      // Replace page content with success message
      showSuccessPage();
    } catch (error) {
      console.error("Error uploading resume:", error);
      showMessage(
        "Failed to upload and analyze resume. Please try again.",
        "error"
      );
    } finally {
      setLoadingState(false);
    }
  }

  function showSuccessPage() {
    // Replace the entire container content
    const container = document.querySelector(".container");
    container.innerHTML = `
      <div class="success-page">
        <div class="success-icon">✅</div>
        <h1>Resume Uploaded Successfully!</h1>
        <div class="success-content">
          <p class="main-message">
            Your resume is uploaded and is currently under processing.
          </p>
          <p class="processing-info">
            This analysis takes some time to complete as we thoroughly review your resume against the job description.
          </p>
          <div class="email-notification">
            <div class="email-icon">📧</div>
            <p>
              <strong>We will send you an email after the analysis is complete</strong><br>
              The email will include your resume analysis results and an invitation for a mock interview.
            </p>
          </div>
          <div class="next-steps">
            <h3>What happens next?</h3>
            <ul>
              <li>Our AI analyzes your resume against the job description</li>
              <li>We generate detailed feedback and improvement suggestions</li>
              <li>You'll receive an email with results and mock interview invitation</li>
              <li>Prepare for your interview with our personalized feedback</li>
            </ul>
          </div>
          <button class="back-btn" onclick="location.reload()">Upload Another Resume</button>
        </div>
      </div>
    `;

    // Add animation
    const successPage = container.querySelector(".success-page");
    successPage.style.opacity = "0";
    successPage.style.transform = "translateY(20px)";

    setTimeout(() => {
      successPage.style.transition = "all 0.6s ease";
      successPage.style.opacity = "1";
      successPage.style.transform = "translateY(0)";
    }, 100);
  }

  function handleAnalysisResult(result) {
    // Clear any existing messages
    clearMessages();

    // Show success message
    showMessage("Resume analysis completed successfully!", "success");

    // You can add more logic here to display the analysis results
    // For example, redirect to results page or display results on the same page
    if (result.redirectUrl) {
      setTimeout(() => {
        window.location.href = result.redirectUrl;
      }, 1500);
    } else if (result.analysisData) {
      // Display analysis results on the same page
      displayAnalysisResults(result.analysisData);
    }
  }

  function displayAnalysisResults(analysisData) {
    // Create a results section or update existing content
    // This is a placeholder - you can customize based on your needs
    const resultsSection = document.createElement("div");
    resultsSection.className = "analysis-results";
    resultsSection.innerHTML = `
      <h2>Analysis Results</h2>
      <div class="results-content">
        ${analysisData.summary || "Analysis completed successfully!"}
      </div>
    `;

    // Insert results after the upload section
    const uploadSection = document.querySelector(".upload-section");
    uploadSection.insertAdjacentElement("afterend", resultsSection);

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  function handleFileSelection(file) {
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showMessage(
        "Please select a valid file type (PDF, DOC, or DOCX).",
        "error"
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showMessage("File size must be less than 10MB.", "error");
      return;
    }

    // Update UI
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    selectedFile.style.display = "flex";

    // Hide the file input wrapper after selection
    const fileInputWrapper = document.querySelector(".file-input-wrapper");
    fileInputWrapper.style.display = "none";

    // Update file input
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;

    // Update submit button state
    updateSubmitButton();

    // Hide any existing messages
    clearMessages();
  }

  function clearFileSelection() {
    fileInput.value = "";
    selectedFile.style.display = "none";

    // Show the file input wrapper again
    const fileInputWrapper = document.querySelector(".file-input-wrapper");
    fileInputWrapper.style.display = "block";

    updateSubmitButton();
    clearMessages();
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function setLoadingState(loading) {
    if (loading) {
      btnText.style.display = "none";
      loadingSpinner.style.display = "block";
      uploadBtn.disabled = true;
    } else {
      btnText.style.display = "block";
      loadingSpinner.style.display = "none";
      updateSubmitButton();
    }
  }

  function showMessage(message, type) {
    clearMessages();

    const messageDiv = document.createElement("div");
    messageDiv.className =
      type === "error" ? "error-message" : "success-message";
    messageDiv.textContent = message;

    const uploadSection = document.querySelector(".upload-section");
    uploadSection.insertBefore(messageDiv, uploadSection.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  function clearMessages() {
    const messages = document.querySelectorAll(
      ".error-message, .success-message"
    );
    messages.forEach((message) => message.remove());
  }

  // Animate features on scroll (if needed)
  function animateFeatures() {
    const features = document.querySelectorAll(".feature");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }, index * 100);
        }
      });
    });

    features.forEach((feature) => {
      feature.style.opacity = "0";
      feature.style.transform = "translateY(20px)";
      feature.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      observer.observe(feature);
    });
  }

  // Initialize animations
  animateFeatures();

  // Add some interactive feedback
  document.querySelectorAll(".feature").forEach((feature) => {
    feature.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-5px) scale(1.02)";
    });

    feature.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0) scale(1)";
    });
  });
});
