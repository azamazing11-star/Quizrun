/**
 * Formats money amounts in Korean units (억, 만, 원)
 * Example: 1000000 -> "100만원"
 * Example: 100000000 -> "1억원"
 * Example: 125000000 -> "1억 2,500만원"
 * Example: 5000 -> "5,000원"
 * Example: 0 -> "0원"
 */
export function formatKoreanMoney(amount) {
    const num = Number(amount) || 0;
    if (num === 0) return '0원';

    const isNegative = num < 0;
    const abs = Math.abs(num);

    const eok = Math.floor(abs / 100000000);
    const man = Math.floor((abs % 100000000) / 10000);
    const won = Math.floor(abs % 10000);

    const parts = [];
    if (eok > 0) parts.push(`${eok.toLocaleString()}억`);
    if (man > 0) parts.push(`${man.toLocaleString()}만`);
    if (won > 0) parts.push(`${won.toLocaleString()}`);

    if (parts.length === 0) return '0원';
    return (isNegative ? '-' : '') + parts.join(' ') + '원';
}
