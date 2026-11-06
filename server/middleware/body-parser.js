const config = require('../config');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const chunks = [];
    let receivedBytes = 0;

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > config.MAX_BODY_SIZE_BYTES) {
        req.destroy();
        return reject(new Error('İstek gövdesi boyutu maksimum sınırı (15MB) aştı!'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);

      if (buffer.length === 0) {
        return resolve({ rawBuffer: buffer, body: {} });
      }

      if (contentType.includes('application/json')) {
        try {
          const text = buffer.toString('utf8');
          const body = JSON.parse(text);
          return resolve({ rawBuffer: buffer, body });
        } catch (err) {
          return reject(new Error('Geçersiz JSON formatı: ' + err.message));
        }
      }

      if (contentType.includes('multipart/form-data')) {
        // Multipart dosya yükleme - raw buffer ve boundary ayrıştırma
        return resolve({ rawBuffer: buffer, body: {}, isMultipart: true, contentType });
      }

      // Standart metin veya octet-stream
      resolve({ rawBuffer: buffer, body: buffer.toString('utf8') });
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  parseBody,
};
