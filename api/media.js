// /api/media.js
// Returns media list compatible with current gallery.html (expects `src`)

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const mediaDir = path.join(process.cwd(), 'media');

    const imageExt = new Set(['jpg','jpeg','png','webp','gif','avif']);
    const videoExt = new Set(['mp4','webm','mov','m4v','avi','mkv']);

    if (!fs.existsSync(mediaDir)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'media folder not found at project root' }));
    }

    const dirents = fs.readdirSync(mediaDir, { withFileTypes: true });
    const items = [];

    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;
      const file = dirent.name;
      const ext = path.extname(file).toLowerCase().slice(1);
      const base = path.basename(file, path.extname(file));

      let type = null;
      if (imageExt.has(ext)) type = 'photo';
      if (videoExt.has(ext)) type = 'video';
      if (!type) continue;

      const stat = fs.statSync(path.join(mediaDir, file));
      const fullUrl = `/media/${encodeURIComponent(file)}`;

      if (type === 'photo') {
        // Important: gallery.html expects item.src
        items.push({
          type,
          name: file,
          src: fullUrl,   // use full image; no /api/thumb in project
          mtime: stat.mtimeMs
        });
      } else {
        // Video: keep optional poster if a same-name jpg/png exists
        const jpgPoster = path.join(mediaDir, `${base}.jpg`);
        const pngPoster = path.join(mediaDir, `${base}.png`);
        let poster = '/img/video-poster-fallback.jpg';
        if (fs.existsSync(jpgPoster)) poster = `/media/${encodeURIComponent(base + '.jpg')}`;
        else if (fs.existsSync(pngPoster)) poster = `/media/${encodeURIComponent(base + '.png')}`;

        items.push({
          type,
          name: file,
          src: fullUrl,   // gallery uses <source src=item.src>
          poster,
          mtime: stat.mtimeMs
        });
      }
    }

    // newest first
    items.sort((a, b) => b.mtime - a.mtime);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ items }));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'internal error', details: String(err) }));
  }
};
