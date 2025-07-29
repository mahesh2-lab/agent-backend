document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("resumeFile");
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

  // File input change handler
  fileInput.addEventListener("change", function (e) {
    handleFileSelection(e.target.files[0]);
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
    if (!fileInput.files[0]) {
      e.preventDefault();
      showMessage("Please select a file to upload.", "error");
      return;
    }

    // Show loading state
    setLoadingState(true);
  });

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
    uploadBtn.disabled = false;

    // Update file input
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;

    // Hide any existing messages
    clearMessages();
  }

  function clearFileSelection() {
    fileInput.value = "";
    selectedFile.style.display = "none";
    uploadBtn.disabled = true;
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
      uploadBtn.disabled = false;
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
