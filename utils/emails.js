const shortlistedMail = (to, candidateName, meetingLink, meetingPassword) => {
  const text = `Hi ${candidateName},

Thank you for your application. We appreciate you taking the time to submit your resume in the interest of learning about the (position) opportunity here at (organisation).

After careful consideration, we will not be moving forward with your application at this time as we have decided to move forward with other candidates whose skills and experience are a closer match to our requirements for this specific role.

Best of luck in your career search.`;

  return {
    to,
    subject: "Invitation to Mock Interview Session",
    body: `Dear ${candidateName},
    We are pleased to invite you to a mock interview session. Here are the details:
    Meeting Link: ${meetingLink}
    Meeting Password: ${meetingPassword}
    Best regards,
    The Interview Team`,
  };
};

const rejectionMail = (to, candidateName) => {
  return {
    to,
    subject: "Interview Rejection",
    body: `Dear ${candidateName},
    Thank you for your interest in the position. We appreciate the time and effort you put into your application.
    Unfortunately, we have decided to move forward with other candidates.
    We wish you all the best in your job search.
    Best regards,
    The Interview Team`,
  };
};
