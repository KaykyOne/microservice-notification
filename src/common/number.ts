function formatNumber(phone: string): string {
    let phoneFormated = phone;
    phoneFormated = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
    return phoneFormated.startsWith('55') ? phoneFormated : `55${phoneFormated}`;
}

function normalizeWhatsAppNumber(phone: string) {
    let clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) clean = '55' + clean;

    const with9 = clean.length === 12
        ? clean.slice(0, 4) + '9' + clean.slice(4)
        : clean;

    const without9 = with9.replace(/^(\d{4})9/, '$1');

    return { com9: with9, sem9: without9 };
}

function clearNumber(phone: string): string {
    return phone.replace(/\D/g, '');
}

export { formatNumber, normalizeWhatsAppNumber, clearNumber };
