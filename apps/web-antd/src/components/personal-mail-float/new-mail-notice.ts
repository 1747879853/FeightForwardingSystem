import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

export function newMailSender(mail: PersonalMailAdminApi.MailSummary) {
  return mail.from?.name?.trim() || mail.from?.address?.trim() || '未知发件人';
}

export function newMailSubject(mail: PersonalMailAdminApi.MailSummary) {
  return mail.subject?.trim() || '(无主题)';
}

/** 提醒文案：发件人：主题；超过 5 封时补「等 N 封新邮件」 */
export function formatNewMailNoticeLines(
  payload: PersonalMailAdminApi.PersonalMailReceived,
) {
  const mails = (payload.mails || []).slice(0, 5);
  const lines = mails.map(
    (mail) => `${newMailSender(mail)}：${newMailSubject(mail)}`,
  );
  const count = payload.newCount ?? mails.length;
  if (count > 5) lines.push(`等 ${count} 封新邮件`);
  if (lines.length === 0 && count > 0) lines.push(`${count} 封新邮件`);
  return lines;
}

export function normalizeReceivedMails(
  payload: PersonalMailAdminApi.PersonalMailReceived,
) {
  const folderName = payload.folderName?.trim() || '';
  return (payload.mails || [])
    .slice(0, 5)
    .map((mail) => ({
      ...mail,
      folderName: mail.folderName?.trim() || folderName,
      uid: Number(mail.uid),
    }))
    .filter((mail) => Number.isInteger(mail.uid) && mail.uid >= 0);
}
