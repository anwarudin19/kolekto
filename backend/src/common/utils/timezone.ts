const WIB_TIMEZONE = 'Asia/Jakarta';

const buildWibParts = (date: Date): Record<string, string> => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: WIB_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    return Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value]),
    ) as Record<string, string>;
};

export const formatWibTimestamp = (date: Date = new Date()): string => {
    const parts = buildWibParts(date);

    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.${milliseconds} WIB`;
};

export const formatWibDate = (date: Date = new Date()): string => {
    const parts = buildWibParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatIndonesianWibDate = (date: Date = new Date()): string =>
    new Intl.DateTimeFormat('id-ID', {
        timeZone: WIB_TIMEZONE,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
