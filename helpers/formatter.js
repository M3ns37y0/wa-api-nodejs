const phoneFormat = function(number) {
    //hilangkan karakter selain angka
    let formatted = number.replace(/\D/g, '');

    //hilangkan angka 0, ganti dengan 62
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
    }

    if (!formatted.endsWith('@c.us')) {
        formatted += '@c.us';
    }

    return formatted;
}

module.exports = {
    phoneFormat
}