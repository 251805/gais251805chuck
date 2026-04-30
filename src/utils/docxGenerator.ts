import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import JSZipUtils from 'jszip-utils';

function loadFile(url: string, callback: (err: any, data: any) => void) {
    JSZipUtils.getBinaryContent(url, callback);
}

export const generatePurchaseRequestDocx = async (data: any, items: any[], gsoid: string) => {
    const templatePath = "https://jarfhkjcewjjdghwlzna.supabase.co/storage/v1/object/sign/gais251805/PR.docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YTZiNGIwNC05MGEyLTRiZjctYjIxZC00ZjJlYWU5MWE5MTciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnYWlzMjUxODA1L1BSLmRvY3giLCJpYXQiOjE3Nzc1NjA5NTgsImV4cCI6MTgwOTA5Njk1OH0.Tkut7HyHXLE9N_bGfuPf5HDMSh-T4Kv_ygWG0Bg4hqk";

    return new Promise((resolve, reject) => {
        loadFile(templatePath, (error, content) => {
            if (error) {
                console.error(error);
                reject(error);
                return;
            }

            try {
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '{{', end: '}}' },
                });

                // Prepare date
                const dateObj = data.date ? new Date(data.date) : new Date();
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                const docData = {
                    DEPARTMENT: data.department?.toUpperCase() || '',
                    DATE: formattedDate,
                    SECTION: data.section?.toUpperCase() || '',
                    PR: data.pr || '',
                    REQUESTED_BY: data.requested_by?.toUpperCase() || '',
                    BUDGET: data.budget || '',
                    GSOID: gsoid || '',
                    BAC: data.bac || '',
                    STOCK_NO: items.map(i => i.stock_no || '').join('\n'),
                    UNIT: items.map(i => i.unit || '').join('\n'),
                    ITEM_DESCRIPTION: items.map(i => i.item_description || '').join('\n'),
                    QTY: items.map(i => i.qty || '').join('\n'),
                    UNIT_COST: items.map(i => i.unit_cost || '').join('\n'),
                    TOTAL_COST: items.map(i => i.total_cost || '').join('\n'),
                    REMARKS: data.remarks || '',
                };

                doc.setData(docData);
                doc.render();

                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                saveAs(out, `PR_${gsoid || 'Official'}.docx`);
                resolve(true);
            } catch (err: any) {
                if (err.properties && err.properties.errors instanceof Array) {
                    const errorMessages = err.properties.errors.map((error: any) => {
                        return error.properties.explanation;
                    }).join("\n");
                    console.error("Docxtemplater Errors:", errorMessages);
                    reject(new Error(`Template Error: ${errorMessages}`));
                } else {
                    console.error("Docx Generation Error:", err);
                    reject(err);
                }
            }
        });
    });
};
