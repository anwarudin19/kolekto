import { BadRequestException, ValidationError } from '@nestjs/common';

const LOCALIZED_PATTERNS: Array<{
    pattern: RegExp;
    translate: (match: RegExpMatchArray, property: string) => string;
}> = [
        {
            pattern: /^property\s+(.+)\s+should not exist$/i,
            translate: (match) => `Field ${match[1]} tidak diperbolehkan`,
        },
        {
            pattern: /^(.+) must be a UUID$/i,
            translate: (_match, property) => `${property} harus berupa UUID yang valid`,
        },
        {
            pattern: /^(.+) must be an email$/i,
            translate: (_match, property) => `${property} harus berupa email yang valid`,
        },
        {
            pattern: /^(.+) must be a string$/i,
            translate: (_match, property) => `${property} harus berupa teks`,
        },
        {
            pattern: /^(.+) should not be empty$/i,
            translate: (_match, property) => `${property} tidak boleh kosong`,
        },
        {
            pattern: /^(.+) must be longer than or equal to (\d+) characters$/i,
            translate: (match, property) => `${property} minimal ${match[2]} karakter`,
        },
        {
            pattern: /^(.+) must be shorter than or equal to (\d+) characters$/i,
            translate: (match, property) => `${property} maksimal ${match[2]} karakter`,
        },
        {
            pattern: /^(.+) must be one of the following values: (.+)$/i,
            translate: (match, property) => `${property} harus salah satu dari nilai berikut: ${match[2]}`,
        },
        {
            pattern: /^(.+) must be a boolean value$/i,
            translate: (_match, property) => `${property} harus berupa nilai true atau false`,
        },
        {
            pattern: /^(.+) must be a number conforming to the specified constraints$/i,
            translate: (_match, property) => `${property} harus berupa angka yang valid`,
        },
        {
            pattern: /^(.+) must be a valid ISO 8601 date string$/i,
            translate: (_match, property) => `${property} harus berupa tanggal ISO 8601 yang valid`,
        },
    ];

type FieldErrors = Record<string, string[]>;

export const createIndonesianValidationException = (errors: ValidationError[] = []) => {
    const fieldErrors = flattenValidationErrors(errors);
    return new BadRequestException({
        message: 'Validasi gagal',
        error: 'Permintaan Tidak Valid',
        fieldErrors,
    });
};

const flattenValidationErrors = (
    errors: ValidationError[],
    parentPath?: string,
    collected: FieldErrors = {},
): FieldErrors => {
    errors.forEach((error) => {
        const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;
        const messages = Object.values(error.constraints ?? {}).map((message) =>
            localizeValidationMessage(message, propertyPath),
        );

        if (messages.length > 0) {
            collected[propertyPath] = [...(collected[propertyPath] ?? []), ...messages];
        }

        if (error.children?.length) {
            flattenValidationErrors(error.children, propertyPath, collected);
        }
    });

    return collected;
};

const localizeValidationMessage = (message: string, property: string): string => {
    for (const entry of LOCALIZED_PATTERNS) {
        const match = message.match(entry.pattern);
        if (match) {
            return entry.translate(match, property);
        }
    }

    if (/[A-Za-z]/.test(message)) {
        return `${property} tidak valid`;
    }

    return message;
};
