function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function baseLayout({ title, body }) {
  return `
  <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:24px;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 20px;background:#0f172a;color:#fff;">
        <div style="font-size:14px;opacity:.9;">RMG Platform</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px;">${escapeHtml(title)}</div>
      </div>
      <div style="padding:20px;">
        ${body}
      </div>
      <div style="padding:14px 20px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
        This email was generated automatically. Please do not reply.
      </div>
    </div>
  </div>
  `;
}

function applicantEmail({ applicantName, jobTitle, companyName, summary }) {
  return baseLayout({
    title: 'Your job application has been submitted',
    body: `
      <p style="margin:0 0 12px;color:#111827;">Hi ${escapeHtml(applicantName)},</p>
      <p style="margin:0 0 12px;color:#374151;">
        Your application for <b>${escapeHtml(jobTitle)}</b> at <b>${escapeHtml(companyName)}</b> was submitted successfully.
      </p>
      <div style="margin:16px 0;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
        <div style="font-weight:700;margin-bottom:8px;color:#111827;">Application summary</div>
        <div style="color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(summary)}</div>
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;">We will contact you if you are shortlisted.</p>
    `
  });
}

function reviewerEmail({ title, jobTitle, companyName, applicant, cvUrl, message }) {
  const applicantBlock = `
    <div style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
      <b>Name:</b> ${escapeHtml(applicant.name)}<br/>
      <b>Email:</b> ${escapeHtml(applicant.email)}<br/>
      <b>Phone:</b> ${escapeHtml(applicant.phone)}<br/>
    </div>
  `;

  const cvBlock = cvUrl
    ? `<p style="margin:0 0 12px;"><b>CV:</b> <a href="${cvUrl}" target="_blank" rel="noopener noreferrer">${cvUrl}</a></p>`
    : '';

  const msgBlock = message
    ? `<div style="margin-top:14px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;">
         <div style="font-weight:700;margin-bottom:8px;color:#111827;">Message / Cover letter</div>
         <div style="color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
       </div>`
    : '';

  return baseLayout({
    title,
    body: `
      <p style="margin:0 0 12px;color:#374151;">
        New application for <b>${escapeHtml(jobTitle)}</b> at <b>${escapeHtml(companyName)}</b>.
      </p>
      ${applicantBlock}
      ${cvBlock}
      ${msgBlock}
    `
  });
}

module.exports = { applicantEmail, reviewerEmail };


