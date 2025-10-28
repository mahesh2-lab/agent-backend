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
      console.log(json);

      // Render a friendly result view — backend may return analysis JSON or just success.
      // Be permissive about where the useful object is located so various backend
      // shapes work: { analysisData }, { data: { response } }, { response }, { data }
      if (json) {
        const analysis =
          json.analysisData ||
          (json.data && json.data.response) ||
          json.response ||
          json.data ||
          null;
        if (analysis) {
          console.log("Analysis object:", analysis);
          // pass the original filename so UI can display it in the File column
          renderAnalysis(analysis, f && f.name ? f.name : "");
          setStatus("Analysis complete.");
        } else if (json.success) {
          resultsContainer.innerHTML = `<div class="rv-eligible">Upload accepted — processing started. You will receive an email when analysis completes.</div>`;
          setStatus("Upload accepted — processing started.");
        } else {
          resultsContainer.innerHTML = `<div class=\"rv-eligible\">Parsing complete.</div>`;
          setStatus("Parsing complete.");
        }
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

  function renderAnalysis(data, fileName = "") {
    // Render a table-style result similar to the provided screenshot.
    const profile = data.candidate_profile || data.profile || data;
    const evaluation = data.evaluation || {};

    const name =
      (profile &&
        (profile.name || profile.fullName || profile.candidateName)) ||
      "Candidate";
    const email = (profile && profile.email) || "-";
    const phone = (profile && profile.phone) || "-";
    const isEligible = evaluation.is_eligible ? "Yes" : "No";

    // Determine file label to show in File column: prefer passed filename, then any field
    const fileLabel =
      fileName || profile.filename || profile.file_name || profile.file || "-";

    resultsContainer.innerHTML = `
      <div class="resume-view">
        <div class="rv-header"><h3>Result</h3></div>
        <div class="results-table-wrapper">
          <table class="results-table" role="table" aria-label="Parsed resumes">
            <thead>
              <tr>
                <th>File</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Eligible</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(fileLabel)}</td>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(email)}</td>
                <td>${escapeHtml(phone)}</td>
                <td>${escapeHtml(isEligible)}</td>
                <td><button id="view-full-btn" class="btn view-info-btn">View Info</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Hook up the action button to open the modal with full details
    const viewBtn = document.getElementById("view-full-btn");
    if (viewBtn) {
      viewBtn.addEventListener("click", function () {
        showModal(data);
      });
    }
  }

  // Modal helper
  function showModal(obj) {
    const modal = document.getElementById("candidate-modal");
    const modalContent = document.getElementById("modal-content");
    const modalClose = document.getElementById("modal-close");
    const overlay = document.querySelector("[data-modal-close]");

    if (!modal || !modalContent) return;

    // Render full, friendly HTML details inside the modal instead of raw JSON.
    const profile = obj.candidate_profile || obj.profile || obj;
    const evaluation = obj.evaluation || {};

    const name =
      (profile &&
        (profile.name || profile.fullName || profile.candidateName)) ||
      "Candidate";
    const email = (profile && profile.email) || "-";
    const phone = (profile && profile.phone) || "-";
    const skillsArr = (profile && profile.skills) || [];
    const skillsHtml = skillsArr.length
      ? skillsArr
          .map((s) => `<span class="rv-skill">${escapeHtml(s)}</span>`)
          .join(" ")
      : "-";
    const experience = (profile && profile.experience) || [];
    const education = (profile && profile.education) || [];
    const strengths =
      (evaluation.match_analysis && evaluation.match_analysis.strengths) || [];
    const weaknesses =
      (evaluation.match_analysis && evaluation.match_analysis.weaknesses) || [];
    const match =
      (evaluation.match_analysis && evaluation.match_analysis.summary) || "-";

    // set modal title to candidate name
    const titleEl = document.getElementById("modal-title");
    if (titleEl) titleEl.textContent = `${name} — Details`;

    modalContent.innerHTML = `
      <div class="modal-full-json">
        <section class="modal-section">
          <h4>Profile</h4>
          <div><strong>Name:</strong> ${escapeHtml(name)}</div>
          <div><strong>Email:</strong> ${escapeHtml(email)}</div>
          <div><strong>Phone:</strong> ${escapeHtml(phone)}</div>
        </section>

        <section class="modal-section">
          <h4>Match & Evaluation</h4>
          <div><strong>Eligible:</strong> ${
            evaluation.is_eligible ? "Yes" : "No"
          }</div>
          <div style="margin-top:6px;"><strong>Summary:</strong> ${escapeHtml(
            match
          )}</div>
          <div style="margin-top:6px;"><strong>Strengths:</strong> ${
            strengths.length
              ? "<ul>" +
                strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("") +
                "</ul>"
              : "-"
          }</div>
          <div style="margin-top:6px;"><strong>Weaknesses:</strong> ${
            weaknesses.length
              ? "<ul>" +
                weaknesses.map((s) => `<li>${escapeHtml(s)}</li>`).join("") +
                "</ul>"
              : "-"
          }</div>
        </section>

        <section class="modal-section">
          <h4>Skills</h4>
          <div class="rv-skills-full">${skillsHtml}</div>
        </section>

        <section class="modal-section">
          <h4>Experience</h4>
          <div>${
            experience.length
              ? experience
                  .map(
                    (e) =>
                      `<div class="rv-exp"><strong>${escapeHtml(
                        e.job_title || e.title || ""
                      )}</strong> — ${escapeHtml(
                        e.company || ""
                      )} <span class="rv-duration">${escapeHtml(
                        e.duration || ""
                      )}</span></div>`
                  )
                  .join("")
              : "-"
          }</div>
        </section>

        <section class="modal-section">
          <h4>Education</h4>
          <div>${
            education.length
              ? education
                  .map(
                    (ed) =>
                      `<div class="rv-edu"><strong>${escapeHtml(
                        ed.degree || ""
                      )}</strong> — ${escapeHtml(
                        ed.institution || ""
                      )} <span class="rv-duration">${escapeHtml(
                        ed.graduation_year || ""
                      )}</span></div>`
                  )
                  .join("")
              : "-"
          }</div>
        </section>

        
      </div>
    `;

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    function closeHandler() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      // detach handlers
      modalClose && modalClose.removeEventListener("click", closeHandler);
      overlay && overlay.removeEventListener("click", closeHandler);
      document.removeEventListener("keydown", escHandler);
    }

    function escHandler(e) {
      if (e.key === "Escape") closeHandler();
    }

    modalClose && modalClose.addEventListener("click", closeHandler);
    overlay && overlay.addEventListener("click", closeHandler);
    document.addEventListener("keydown", escHandler);
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
