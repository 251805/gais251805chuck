const Docxtemplater = require('docxtemplater');
const https = require('https');
const PizZip = require('pizzip');

const url = "https://jarfhkjcewjjdghwlzna.supabase.co/storage/v1/object/sign/gais251805/PR.docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YTZiNGIwNC05MGEyLTRiZjctYjIxZC00ZjJlYWU5MWE5MTciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnYWlzMjUxODA1L1BSLmRvY3giLCJpYXQiOjE3Nzc1NjA5NTgsImV4cCI6MTgwOTA5Njk1OH0.Tkut7HyHXLE9N_bGfuPf5HDMSh-T4Kv_ygWG0Bg4hqk";

https.get(url, (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const zip = new PizZip(buffer);
    try {
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' }
        });
        doc.setData({
            DEPARTMENT: "test", DATE: "test", SECTION: "test", PR: "test",
            REQUESTED_BY: "test", BUDGET: "test", GSOID: "test", BAC: "test",
            STOCK_NO: "t", UNIT: "t", ITEM_DESCRIPTION: "t", QTY: "1", UNIT_COST: "1", TOTAL_COST: "1", REMARKS: "test"
        });
        doc.render();
        console.log("Success with {{ }}");
    } catch (e) {
        if (e.properties && e.properties.errors) {
            console.error(e.properties.errors.map(x => x.properties.explanation).join('\n'));
        } else {
            console.error(e);
        }
    }
  });
});
