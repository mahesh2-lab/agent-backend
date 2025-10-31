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
      const files = fileInput.files || [];
      const primaryName = files && files[0] ? files[0].name : "";

      const fd = new FormData();
      // Append all selected files under the field name multer expects ('resumeFile')
      for (let i = 0; i < files.length; i++) {
        fd.append("resumeFile", files[i], files[i].name);
      }
      fd.append("jobDescription", jobDescription.value || "");

      // POST to the existing backend route that accepts multiple files
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }

      const contentType = res.headers.get("content-type") || "";

      // If server responds with an SSE stream, read it progressively
      if (contentType.includes("text/event-stream") || res.body) {
        // Stream and parse SSE-style events from the response body
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const parts = buf.split("\n\n");
          buf = parts.pop();
          for (const part of parts) {
            if (!part.trim()) continue;
            const lines = part.split("\n");
            let event = "message";
            let data = "";
            for (const line of lines) {
              if (line.startsWith("event:"))
                event = line.replace("event:", "").trim();
              if (line.startsWith("data:"))
                data += line.replace("data:", "").trim();
            }
            let parsed = data;
            try {
              parsed = JSON.parse(data);
            } catch (e) {}

            // Handle known events
            if (event === "progress") {
              setStatus(
                `Processing: ${
                  parsed.file || parsed.index || primaryName || "..."
                }`
              );
            } else if (event === "result") {
              // If backend returns analysis, render it
              const analysis =
                parsed.result && parsed.result.response
                  ? parsed.result.response
                  : parsed.result || parsed;
              // renderAnalysis expects the analysis object shape — try to normalize
              if (analysis) {
                renderAnalysis(analysis, parsed.file || primaryName);
                setStatus("Analysis complete.");
              } else {
                // If the event contains a direct candidate object
                if (parsed && parsed.response)
                  renderAnalysis(parsed.response, parsed.file || primaryName);
              }
            } else if (event === "error") {
              console.error("Server error event:", parsed);
              setStatus(parsed.error || parsed.message || "Server error", true);
            } else if (event === "done") {
              setStatus("All files processed.");
            }
          }
        }

        // leftover buffer
        if (buf.trim()) {
          const part = buf.trim();
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:"))
              event = line.replace("event:", "").trim();
            if (line.startsWith("data:"))
              data += line.replace("data:", "").trim();
          }
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
          if (event === "result") {
            const analysis =
              parsed.result && parsed.result.response
                ? parsed.result.response
                : parsed.result || parsed;
            if (analysis) {
              renderAnalysis(analysis, parsed.file || primaryName);
              setStatus("Analysis complete.");
            }
          }
        }
      } else {
        // fallback for non-streaming JSON responses
        const json = await res.json().catch(() => null);
        console.log(json);

        const analysis =
          json &&
          (json.analysisData ||
            (json.data && json.data.response) ||
            json.response ||
            json.data ||
            null);
        if (analysis) {
          renderAnalysis(analysis, primaryName || "");
          setStatus("Analysis complete.");
        } else if (json && json.success) {
          resultsContainer.innerHTML = `<div class="rv-eligible">Upload accepted — processing started. You will receive an email when analysis completes.</div>`;
          setStatus("Upload accepted — processing started.");
        } else {
          resultsContainer.innerHTML = `<div class=\"rv-eligible\">Parsing complete.</div>`;
          setStatus("Parsing complete.");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Failed to parse resume. See console for details.", true);
    } finally {
      setLoading(false);
    }
  });

  function renderAnalysis(data, fileName = "") {
    // Append result as a row in a persistent results table so multiple
    // files can be displayed. Uses a results store on window to keep
    // objects for the modal view.
    window._results = window._results || [];
    const idx = window._results.length;
    window._results.push(data);

    const profile = data.candidate_profile || data.profile || data;
    const evaluation = data.evaluation || {};

    const name =
      (profile && (profile.name || profile.fullName || profile.candidateName)) ||
      "Candidate";
    const email = (profile && profile.email) || "-";
    const phone = (profile && profile.phone) || "-";
    const isEligible = evaluation.is_eligible ? "Yes" : "No";
    const match_score = evaluation.match_score

    const fileLabel = fileName || profile.filename || profile.file_name || profile.file || "-";

    // Ensure a results table exists
    let table = document.getElementById("results-table");
    if (!table) {
      resultsContainer.innerHTML = `
        <div class="resume-view">
          <div class="rv-header"><h3>Results</h3></div>
          <div class="results-table-wrapper">
            <table id="results-table" class="results-table" role="table" aria-label="Parsed resumes">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Eligible</th>
                  <th>Match Score</th>
                  <th>Email Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="results-tbody"></tbody>
            </table>
          </div>
        </div>
      `;
      table = document.getElementById("results-table");
    }

    const tbody = document.getElementById("results-tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(email)}</td>
      <td>${escapeHtml(phone)}</td>
      <td>${escapeHtml(isEligible)}</td>
      <td>${escapeHtml(match_score !== undefined ? String(match_score) : "-")}%</td>
      <td>✅ The interview link is sent successfully</td>
      <td><button class="btn view-info-btn" data-idx="${idx}">View Info</button></td>
    `;

    // Prepend newest result
    if (tbody.firstChild) tbody.insertBefore(tr, tbody.firstChild);
    else tbody.appendChild(tr);

    // Event delegation for view buttons
    if (!resultsContainer._delegationAdded) {
      resultsContainer.addEventListener("click", function (e) {
        const btn = e.target.closest && e.target.closest(".view-info-btn");
        if (!btn) return;
        const i = Number(btn.getAttribute("data-idx"));
        const obj = window._results && window._results[i];
        if (obj) showModal(obj);
      });
      resultsContainer._delegationAdded = true;
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
          <div><strong>Match Score:</strong> ${
            evaluation.match_score !== undefined
              ? escapeHtml(String(evaluation.match_score))
              : "-"
          }%</div>
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
