const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateInviteCode = (length = 8): string =>
  Array.from({ length }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('');

export const buildTeamNameAbbreviation = (teamName: string): string => {
  const normalizedWords = teamName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!normalizedWords.length) {
    return 'TEAM';
  }

  const initials = normalizedWords.map((word) => word[0]).join('');
  if (initials.length >= 3) {
    return initials.slice(0, 4);
  }

  return normalizedWords.join('').slice(0, 4).padEnd(3, 'X');
};

export const buildTeamInvitationStyleCode = (teamName: string, year = new Date().getFullYear()): string => {
  const teamCode = buildTeamNameAbbreviation(teamName);
  const yearCode = year.toString();
  return `${teamCode}-${yearCode}-${generateInviteCode(4)}`;
};
