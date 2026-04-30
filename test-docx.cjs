const fs = require('fs');
const https = require('https');
const PizZip = require('pizzip');

const url = "https://jarfhkjcewjjdghwlzna.supabase.co/storage/v1/object/sign/gais251805/PR.docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YTZiNGIwNC05MGEyLTRiZjctYjIxZC00ZjJlYWU5MWE5MTciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnYWlzMjUxODA1L1BSLmRvY3giLCJpYXQiOjE3Nzc1NjA5NTgsImV4cCI6MTgwOTA5Njk1OH0.Tkut7HyHXLE9N_bGfuPf5HDMSh-T4Kv_ygWG0Bg4hqk";

https.get(url, (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const zip = new PizZip(buffer);
    const text = zip.file("word/document.xml").asText();
    console.log(text.substring(0, 1000));
    const placeholders = text.match(/<w:t>.*?<\/w:t>/g)
       .map(x => x.replace(/<\/?w:t.*?>/g, ''))
       .filter(x => x.includes('{'));
    console.log(placeholders);
  });
});
