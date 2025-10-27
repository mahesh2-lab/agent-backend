document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("file");
  const jobDescription = document.getElementById("job_description");
  const uploadForm = document.getElementById("upload-form");
  const submitBtn = document.getElementById("submit");
  const statusEl = document.getElementById("status");
  const resultsContainer = document.getElementById("results-table-container");

  const ALLOWED_TYPES = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#b00020" : "#4b5563";
  }

  function setLoading(loading) {
    const spinner = submitBtn.querySelector(".spinner");
    const label = submitBtn.querySelector(".btn-label");
    if (loading) {
      spinner.classList.remove("hidden");
      submitBtn.disabled = true;
      label.textContent = "Parsing...";
    } else {
      spinner.classList.add("hidden");
      submitBtn.disabled = false;
      label.textContent = "Parse Resume";
    }
  }

  fileInput.addEventListener("change", function () {
    const f = fileInput.files && fileInput.files[0];
    if (!f) {
      setStatus("No file selected", true);
      return;
    }
    if (
      !ALLOWED_TYPES.includes(f.type) &&
      !f.name.match(/\.pdf|\.docx?|\.txt$/i)
    ) {
      setStatus("Invalid file type. Use PDF, DOC/DOCX or TXT.", true);
      return;
    }
    setStatus(`Selected file: ${f.name}`);
  });

  uploadForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const f = fileInput.files && fileInput.files[0];
    if (!f) {
      setStatus("Please choose a resume file before parsing.", true);
      return;
    }

    setLoading(true);
    setStatus("Uploading and parsing...");

    try {
      const fd = new FormData();
      fd.append("resumeFile", f);
      fd.append("jobDescription", jobDescription.value || "");

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }

      const json = await res.json().catch(() => null);

      // Render a friendly result view — backend may return analysis JSON or just success
      if (json && json.analysisData) {
        renderAnalysis(json.analysisData);
        setStatus("Analysis complete.");
      } else if (json && json.success) {
        resultsContainer.innerHTML = `<div class="rv-eligible">Upload accepted — processing started. You will receive an email when analysis completes.</div>`;
        setStatus("Upload accepted — processing started.");
      } else {
        resultsContainer.innerHTML = `<div class=\"rv-eligible\">Parsing complete.</div>`;
        setStatus("Parsing complete.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Failed to parse resume. See console for details.", true);
    } finally {
      setLoading(false);
    }
  });

  function renderAnalysis(data) {
    // A small, generic rendering of returned analysis data.
    // Backend shape may vary; attempt to show name, summary, skills, and matches.
    const name =
      data.name || data.fullName || data.candidateName || "Candidate";
    const skills =
      (data.skills && data.skills.join(", ")) || data.skills || "-";
    const summary = data.summary || data.overview || "No summary available.";

    resultsContainer.innerHTML = `
      <div class="resume-view">
        <div class="rv-header">
          <h2>${escapeHtml(name)}</h2>
          <div class="rv-contact">${escapeHtml(
            data.email || data.contact || ""
          )}</div>
        </div>
        <div class="rv-section">
          <h3>Summary</h3>
          <div>${escapeHtml(summary)}</div>
        </div>
        <div class="rv-section">
          <h3>Skills</h3>
          <div class="rv-skills"><span class="rv-skill">${escapeHtml(
            skills
          )}</span></div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // small initialization
  setStatus("Ready — choose a resume to parse");
});
