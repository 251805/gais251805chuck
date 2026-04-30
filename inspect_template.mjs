
import fs from 'fs';
import https from 'https';
import unzipper from 'unzipper';

const url = "https://jarfhkjcewjjdghwlzna.supabase.co/storage/v1/object/sign/gais251805/PR.docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YTZiNGIwNC05MGEyLTRiZjctYjIxZC00ZjJlYWU5MWE5MTciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnYWlzMjUxODA1L1BSLmRvY3giLCJpYXQiOjE3Nzc1NjA5NTgsImV4cCI6MTgwOTA5Njk1OH0.Tkut7HyHXLE9N_bGfuPf5HDMSh-T4Kv_ygWG0Bg4hqk";

https.get(url, (res) => {
    const path = 'template.docx';
    const filePath = fs.createWriteStream(path);
    res.pipe(filePath);
    filePath.on('finish', () => {
        filePath.close();
        console.log('Download Completed');
        
        fs.createReadStream('template.docx')
          .pipe(unzipper.Parse())
          .on('entry', function (entry) {
            const fileName = entry.path;
            if (fileName === "word/document.xml") {
              entry.buffer().then(content => {
                const text = content.toString();
                const regex = /\{\{[^}]+\}\}/g;
                const matchAll = text.match(regex) || [];
                console.log('Individual Placeholders:', Array.from(new Set(matchAll)));
                
                // Check for block start/end
                const blockRegex = /\{[#/][^}]+\}/g;
                const blockMatches = text.match(blockRegex) || [];
                console.log('Block Markers:', Array.from(new Set(blockMatches)));

                // Log a snippet of the table if it exists
                const tableStart = text.indexOf('<w:tbl>');
                if (tableStart !== -1) {
                    console.log('Table found in document.');
                }
              });
            } else {
              entry.autodrain();
            }
          });
    });
});
