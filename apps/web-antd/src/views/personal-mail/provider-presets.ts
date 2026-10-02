export interface MailProviderPreset {
  imapEnableSsl: boolean;
  imapHost: string;
  imapPort: number;
  label: string;
  smtpEnableSsl: boolean;
  smtpHost: string;
  smtpPort: number;
  value: string;
}

export const MAIL_PROVIDER_PRESETS: MailProviderPreset[] = [
  {
    label: '腾讯企业邮',
    value: 'exmail',
    imapHost: 'imap.exmail.qq.com',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: 'smtp.exmail.qq.com',
    smtpPort: 465,
    smtpEnableSsl: true,
  },
  {
    label: 'QQ 邮箱',
    value: 'qq',
    imapHost: 'imap.qq.com',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: 'smtp.qq.com',
    smtpPort: 465,
    smtpEnableSsl: true,
  },
  {
    label: '163 邮箱',
    value: '163',
    imapHost: 'imap.163.com',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: 'smtp.163.com',
    smtpPort: 465,
    smtpEnableSsl: true,
  },
  {
    label: '126 邮箱',
    value: '126',
    imapHost: 'imap.126.com',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: 'smtp.126.com',
    smtpPort: 465,
    smtpEnableSsl: true,
  },
  {
    label: 'Outlook',
    value: 'outlook',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpEnableSsl: false,
  },
  {
    label: '阿里企业邮',
    value: 'aliyun',
    imapHost: 'imap.qiye.aliyun.com',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: 'smtp.qiye.aliyun.com',
    smtpPort: 465,
    smtpEnableSsl: true,
  },
  {
    label: '自定义',
    value: 'custom',
    imapHost: '',
    imapPort: 993,
    imapEnableSsl: true,
    smtpHost: '',
    smtpPort: 465,
    smtpEnableSsl: true,
  },
];

export function matchMailProviderPreset(input: {
  imapHost?: null | string;
  smtpHost?: null | string;
}) {
  const imapHost = input.imapHost?.trim().toLowerCase() || '';
  const smtpHost = input.smtpHost?.trim().toLowerCase() || '';
  const matched = MAIL_PROVIDER_PRESETS.find(
    (item) =>
      item.value !== 'custom' &&
      item.imapHost.toLowerCase() === imapHost &&
      item.smtpHost.toLowerCase() === smtpHost,
  );
  return matched?.value || 'custom';
}
