import { parentPort, workerData } from "worker_threads";
import { sendEmail } from "../services/email.service.js";

(async () => {
  try {
    const { email, subject, text } = workerData || {};
    if (!email) {
      parentPort.postMessage({
        success: false,
        error: "Missing email address",
      });
      return;
    }

    const emailResponse = await sendEmail(email, subject, text);
    parentPort.postMessage(emailResponse);
  } catch (err) {
    parentPort.postMessage({ success: false, error: String(err) });
  }
})();
